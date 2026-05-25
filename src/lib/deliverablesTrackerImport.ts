import { parseBulkCsv } from "./bulkImport";
import { normalizePrimaryKeyword } from "./keywordUtils";
import { parseCsvRows } from "./facilityLibrary";
import type { BulkCsvRow } from "../types/storiq";

const STATUS_VALUES = new Set(["not started", "in progress", "complete", "done", "pending"]);

const normalizeHeader = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const isStatusCell = (value: string): boolean => STATUS_VALUES.has(value.trim().toLowerCase());

const isSectionHeaderRow = (cells: string[]): boolean => {
  const nonEmpty = cells.map((c) => c.trim()).filter(Boolean);
  if (nonEmpty.length !== 1) {
    return false;
  }
  return /^(radiant storage|my garage|radiant|my garage self storage)$/i.test(nonEmpty[0]);
};

const looksLikeUrl = (value: string): boolean => /^https?:\/\//i.test(value.trim());

const parseTargetCityCell = (
  value: string,
): Pick<BulkCsvRow, "facilityName" | "address" | "city" | "state" | "zipCode"> | null => {
  const trimmed = value.trim();
  if (!trimmed || isStatusCell(trimmed)) {
    return null;
  }

  const tailMatch = trimmed.match(/,\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (!tailMatch) {
    return null;
  }

  const city = tailMatch[1].trim();
  const state = tailMatch[2].toUpperCase();
  const zipCode = tailMatch[3];
  const beforeTail = trimmed.slice(0, tailMatch.index).replace(/,\s*$/, "");
  const segments = beforeTail.split(",").map((part) => part.trim()).filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const facilityName = segments[0];
  const streetParts = segments.slice(1);
  const address =
    streetParts.length > 0
      ? `${streetParts.join(", ")}, ${city}, ${state} ${zipCode}`
      : `${city}, ${state} ${zipCode}`;

  return { facilityName, address, city, state, zipCode };
};

const columnIndex = (headers: string[], matchers: string[]): number =>
  headers.findIndex((header) => matchers.some((matcher) => header.includes(matcher)));

export type DeliverablesTrackerParseResult = {
  detected: boolean;
  rows: BulkCsvRow[];
  skipped: number;
  brandFilter: "my_garage" | "all";
};

export type BulkImportParseResult = {
  format: "tracker" | "standard";
  rows: BulkCsvRow[];
  missingColumns: string[];
  skipped?: number;
};

/** Detect Client Deliverables Tracker "On-Page SEO" tab exports (Google Sheets CSV). */
export const isDeliverablesTrackerCsv = (csv: string): boolean => {
  const [headers] = parseCsvRows(csv);
  if (!headers?.length) {
    return false;
  }

  const normalized = headers.map(normalizeHeader);
  const hasUrl = normalized.some((header) => header === "url");
  const hasKeyword = normalized.some((header) => header.includes("keyword"));
  const hasTargetCity = normalized.some((header) => header.includes("targetcity"));
  const hasStandardCity = normalized.includes("city") && normalized.includes("state");

  return hasUrl && hasKeyword && hasTargetCity && !hasStandardCity;
};

export const parseDeliverablesTrackerCsv = (
  csv: string,
  options: { brandFilter?: "my_garage" | "all" } = {},
): DeliverablesTrackerParseResult => {
  const brandFilter = options.brandFilter ?? "my_garage";
  const parsed = parseCsvRows(csv);
  const [headers, ...dataRows] = parsed;

  if (!headers?.length || !isDeliverablesTrackerCsv(csv)) {
    return { detected: false, rows: [], skipped: 0, brandFilter };
  }

  const normalized = headers.map(normalizeHeader);
  const assigneeIndex = columnIndex(normalized, ["assignee"]);
  const indexationIndex = columnIndex(normalized, ["indexation"]);
  const urlIndex = columnIndex(normalized, ["url"]);
  const keywordIndex = columnIndex(normalized, ["keyword"]);
  const notesIndex = columnIndex(normalized, ["note"]);
  const targetCityIndices = normalized
    .map((header, index) => (header.includes("targetcity") ? index : -1))
    .filter((index) => index >= 0);

  const rows: BulkCsvRow[] = [];
  let skipped = 0;

  dataRows.forEach((cells, rowOffset) => {
    if (isSectionHeaderRow(cells)) {
      skipped += 1;
      return;
    }

    const url = (cells[urlIndex] || "").trim();
    const keyword = normalizePrimaryKeyword((cells[keywordIndex] || "").trim());

    let locationCell = "";
    let workflowStatus = "";
    let indexationStatus = (cells[indexationIndex] || "").trim();

    targetCityIndices.forEach((index) => {
      const value = (cells[index] || "").trim();
      if (!value) {
        return;
      }
      if (isStatusCell(value)) {
        workflowStatus = value;
      } else {
        locationCell = value;
      }
    });

    if (!url && !locationCell) {
      skipped += 1;
      return;
    }

    if (brandFilter === "my_garage" && url && !/mygarageselfstorage\.com/i.test(url)) {
      skipped += 1;
      return;
    }

    const location = locationCell ? parseTargetCityCell(locationCell) : null;
    const errors: string[] = [];

    if (!url || !looksLikeUrl(url)) {
      errors.push("Missing or invalid URL");
    }
    if (!location) {
      errors.push("Could not parse TARGET CITY (facility, address, city, state, ZIP)");
    }

    const assignee = assigneeIndex >= 0 ? (cells[assigneeIndex] || "").trim() : "";
    const notes = notesIndex >= 0 ? (cells[notesIndex] || "").trim() : "";

    rows.push({
      rowNumber: rowOffset + 2,
      city: location?.city || "",
      state: location?.state || "",
      zipCode: location?.zipCode || "",
      facilityName: location?.facilityName || "",
      storagelyPageUrl: url,
      primaryKeyword: keyword,
      address: location?.address || "",
      phone: "",
      rawContent: notes ? `Deliverables tracker notes: ${notes}` : "",
      assignee,
      indexationStatus,
      workflowStatus,
      notes,
      valid: errors.length === 0,
      errors,
    });
  });

  return { detected: true, rows, skipped, brandFilter };
};

export const parseBulkImportCsv = (csv: string): BulkImportParseResult => {
  if (isDeliverablesTrackerCsv(csv)) {
    const tracker = parseDeliverablesTrackerCsv(csv);
    return {
      format: "tracker",
      rows: tracker.rows,
      missingColumns: [],
      skipped: tracker.skipped,
    };
  }

  const standard = parseBulkCsv(csv);
  return {
    format: "standard",
    rows: standard.rows,
    missingColumns: standard.missingColumns,
  };
};
