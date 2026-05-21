import { normalizePrimaryKeyword } from "./keywordUtils";
import { enhanceProjectFromLibraries } from "./projectEnhancements";
import { buildPrimaryKeyword, createLocationProject } from "./projectDefaults";
import { parseCsvRows } from "./facilityLibrary";
import type { AppSettings, BulkCsvRow, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

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
  rawcontent: "rawContent",
  brief: "rawContent",
  existingcontent: "rawContent",
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
      rawContent: record.rawContent || "",
      valid: errors.length === 0,
      errors,
    };
  });

  return { rows, missingColumns: [] };
};

export const bulkCsvTemplate = `city,state,zipCode,facilityName,storagelyPageUrl,primaryKeyword,address,phone,rawContent
Belton,TX,76513,My Garage Self Storage | I-35,https://www.mygarageselfstorage.com/self-storage/tx/belton/i-35/,self storage units in belton tx,"1234 I-35 Frontage Rd, Belton, TX 76513",+1-254-555-0100,"Paste brief or leave empty — map and nearby auto-fill when libraries are loaded."`;

export const bulkRowToProject = (
  row: BulkCsvRow,
  settings: AppSettings,
  facilities: NearbyFacility[] = [],
  images: StorageImage[] = [],
): LocationProject => {
  const project = createLocationProject();
  const keyword =
    row.primaryKeyword ||
    buildPrimaryKeyword(row.city, row.state, settings.defaultKeywordPattern);

  const base: LocationProject = {
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
      rawContent: row.rawContent || project.existingContent.rawContent,
    },
  };

  if (facilities.length === 0 && images.length === 0) {
    return base;
  }

  return enhanceProjectFromLibraries(base, facilities, images);
};
