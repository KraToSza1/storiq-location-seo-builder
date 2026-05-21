import { normalizePrimaryKeyword } from "./keywordUtils";
import { buildPrimaryKeyword, createLocationProject } from "./projectDefaults";
import { parseCsvRows } from "./facilityLibrary";
import type { BulkCsvRow, LocationProject } from "../types/storiq";
import type { AppSettings } from "../types/storiq";

const REQUIRED = ["city", "state", "zipCode", "facilityName", "storagelyPageUrl"] as const;

const headerAliases: Record<string, string> = {
  city: "city",
  state: "state",
  zip: "zipCode",
  zipcode: "zipCode",
  facilityname: "facilityName",
  facility: "facilityName",
  storagelyurl: "storagelyPageUrl",
  storagelypageurl: "storagelyPageUrl",
  pageurl: "storagelyPageUrl",
  primarykeyword: "primaryKeyword",
  keyword: "primaryKeyword",
  address: "address",
  phone: "phone",
};

const normalizeHeader = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

export const parseBulkCsv = (csv: string): { rows: BulkCsvRow[]; missingColumns: string[] } => {
  const parsed = parseCsvRows(csv);
  const [headers, ...dataRows] = parsed;
  const missingColumns: string[] = [];

  if (!headers?.length) {
    return { rows: [], missingColumns: [...REQUIRED] };
  }

  const mapped = headers.map((h) => headerAliases[normalizeHeader(h)] || "");
  REQUIRED.forEach((col) => {
    if (!mapped.includes(col)) missingColumns.push(col);
  });

  if (missingColumns.length > 0) {
    return { rows: [], missingColumns };
  }

  const rows: BulkCsvRow[] = dataRows.map((row, index) => {
    const record: Record<string, string> = {};
    mapped.forEach((key, colIndex) => {
      if (key) record[key] = row[colIndex]?.trim() || "";
    });

    const errors: string[] = [];
    REQUIRED.forEach((col) => {
      if (!record[col]) errors.push(`Missing ${col}`);
    });

    return {
      rowNumber: index + 2,
      city: record.city || "",
      state: record.state || "",
      zipCode: record.zipCode || "",
      facilityName: record.facilityName || "",
      storagelyPageUrl: record.storagelyPageUrl || "",
      primaryKeyword: normalizePrimaryKeyword(record.primaryKeyword || ""),
      address: record.address || "",
      phone: record.phone || "",
      valid: errors.length === 0,
      errors,
    };
  });

  return { rows, missingColumns: [] };
};

export const bulkRowToProject = (row: BulkCsvRow, settings: AppSettings): LocationProject => {
  const project = createLocationProject();
  const keyword =
    row.primaryKeyword ||
    buildPrimaryKeyword(row.city, row.state, settings.defaultKeywordPattern);

  return {
    ...project,
    locationIdentity: {
      city: row.city,
      state: row.state,
      zipCode: row.zipCode,
      facilityName: row.facilityName,
      storagelyPageUrl: row.storagelyPageUrl,
    },
    seo: {
      ...project.seo,
      primaryKeyword: normalizePrimaryKeyword(keyword),
    },
    existingContent: {
      ...project.existingContent,
      address: row.address,
      phone: row.phone,
    },
  };
};
