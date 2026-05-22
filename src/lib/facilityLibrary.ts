import { createId } from "./projectDefaults";
import {
  catalogFacilitiesFromNearbyImages,
  isWrongNearbyCardImage,
  resolveNearbyLocationImageUrl,
  upgradeFacilityImageUrl,
} from "./nearbyLocationImages";
import { sampleFacilities } from "./sampleFacilities";
import type { FacilityImportResult, NearbyFacility } from "../types/storiq";

const requiredHeaders = ["facilityName", "city", "state", "address", "storagelyUrl"];

const headerAliases: Record<string, keyof NearbyFacility | "storagelyUrl"> = {
  id: "id",
  facilityid: "id",
  name: "facilityName",
  facility: "facilityName",
  facilityname: "facilityName",
  locationname: "facilityName",
  city: "city",
  state: "state",
  address: "address",
  streetaddress: "address",
  zip: "zipCode",
  zipcode: "zipCode",
  postalcode: "zipCode",
  url: "storagelyUrl",
  pageurl: "storagelyUrl",
  storagelyurl: "storagelyUrl",
  storagelypageurl: "storagelyUrl",
  phone: "phone",
  phonenumber: "phone",
  image: "imageUrl",
  imageurl: "imageUrl",
  photo: "imageUrl",
  photourl: "imageUrl",
  notes: "notes",
  note: "notes",
};

export const defaultFacilities: NearbyFacility[] = sampleFacilities;

const normalizeHeader = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const parseCsvRows = (csv: string): string[][] => {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  row.push(current.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
};

const buildFacilityId = (facility: Pick<NearbyFacility, "facilityName" | "city" | "state">): string =>
  slug(`${facility.facilityName}-${facility.city}-${facility.state}`) || createId();

export const normalizeFacility = (facility: Partial<NearbyFacility> & { url?: string }): NearbyFacility | undefined => {
  const storagelyUrl = (facility.storagelyUrl || facility.url || "").trim();
  const normalized = {
    id: facility.id?.trim() || "",
    facilityName: facility.facilityName?.trim() || "",
    city: facility.city?.trim() || "",
    state: facility.state?.trim() || "",
    address: facility.address?.trim() || "",
    zipCode: facility.zipCode?.trim() || "",
    storagelyUrl,
    phone: facility.phone?.trim() || undefined,
    imageUrl: facility.imageUrl?.trim() || undefined,
    notes: facility.notes?.trim() || undefined,
  };

  if (!normalized.facilityName || !normalized.city || !normalized.state || !normalized.address || !normalized.storagelyUrl) {
    return undefined;
  }

  const result: NearbyFacility = {
    ...normalized,
    id: normalized.id || buildFacilityId(normalized),
  };

  if (!result.imageUrl) {
    const resolved = resolveNearbyLocationImageUrl(result);
    if (resolved) {
      return { ...result, imageUrl: resolved };
    }
  }

  return result;
};

export const upgradeFacilitiesImageUrls = (facilities: NearbyFacility[]): NearbyFacility[] =>
  facilities.map(upgradeFacilityImageUrl);

const LEGACY_SAMPLE_IDS = new Set(["mgs-salado-main", "mgs-georgetown-north", "mgs-waco-south"]);

/** Fix old browser data: storage-type thumbnails and deprecated sample facility rows. */
export const migrateFacilityLibrary = (stored: NearbyFacility[]): NearbyFacility[] => {
  let list = upgradeFacilitiesImageUrls(stored);

  list = list.map((facility) => {
    if (!isWrongNearbyCardImage(facility.imageUrl)) {
      return facility;
    }
    const resolved = resolveNearbyLocationImageUrl(facility);
    return { ...facility, imageUrl: resolved };
  });

  const hasLegacyRows = list.some((f) => LEGACY_SAMPLE_IDS.has(f.id));
  const hasWrongImages = stored.some((f) => isWrongNearbyCardImage(f.imageUrl));

  if (hasLegacyRows || hasWrongImages) {
    const byUrl = new Map(list.map((f) => [f.storagelyUrl.trim().toLowerCase(), f]));
    sampleFacilities.forEach((sample) => {
      const key = sample.storagelyUrl.trim().toLowerCase();
      const existing = byUrl.get(key);
      if (existing) {
        byUrl.set(key, { ...existing, imageUrl: sample.imageUrl ?? existing.imageUrl });
      } else if (!LEGACY_SAMPLE_IDS.has(sample.id) || !hasLegacyRows) {
        byUrl.set(key, sample);
      }
    });
    list = [...byUrl.values()];
  }

  if (hasLegacyRows) {
    list = list.filter((f) => !LEGACY_SAMPLE_IDS.has(f.id));
    const knownUrls = new Set(list.map((f) => f.storagelyUrl.trim().toLowerCase()));
    sampleFacilities.forEach((sample) => {
      const key = sample.storagelyUrl.trim().toLowerCase();
      if (!knownUrls.has(key)) {
        list.push(sample);
        knownUrls.add(key);
      }
    });
  }

  list = mergeFacilities(list, catalogFacilitiesFromNearbyImages());

  return list.sort((a, b) =>
    `${a.state}${a.city}${a.facilityName}`.localeCompare(`${b.state}${b.city}${b.facilityName}`),
  );
};

export const parseFacilitiesCsv = (csv: string): { facilities: NearbyFacility[]; result: FacilityImportResult } => {
  const rows = parseCsvRows(csv);
  const [headers, ...dataRows] = rows;
  const errors: string[] = [];

  if (!headers || headers.length === 0) {
    return { facilities: [], result: { imported: 0, skipped: 0, errors: ["CSV is empty."] } };
  }

  const mappedHeaders = headers.map((header) => headerAliases[normalizeHeader(header)]);
  const missingHeaders = requiredHeaders.filter((header) => !mappedHeaders.includes(header as keyof NearbyFacility));

  if (missingHeaders.length > 0) {
    return {
      facilities: [],
      result: {
        imported: 0,
        skipped: dataRows.length,
        errors: [`Missing required column(s): ${missingHeaders.join(", ")}.`],
      },
    };
  }

  const facilities: NearbyFacility[] = [];
  let skipped = 0;

  dataRows.forEach((row, rowIndex) => {
    const partial: Partial<NearbyFacility> & { url?: string } = {};
    mappedHeaders.forEach((key, index) => {
      if (key && row[index]) {
        (partial as Record<string, string>)[key] = row[index];
      }
    });
    const facility = normalizeFacility(partial);

    if (facility) {
      facilities.push(facility);
    } else {
      skipped += 1;
      errors.push(`Row ${rowIndex + 2} skipped because required fields are missing.`);
    }
  });

  return {
    facilities,
    result: {
      imported: facilities.length,
      skipped,
      errors,
    },
  };
};

export const mergeFacilities = (current: NearbyFacility[], incoming: NearbyFacility[]): NearbyFacility[] => {
  const byId = new Map<string, NearbyFacility>();

  current.forEach((facility) => {
    byId.set(facility.id, facility);
  });

  incoming.forEach((facility) => {
    const duplicateId = byId.has(facility.id) && byId.get(facility.id)?.storagelyUrl !== facility.storagelyUrl;
    if (duplicateId) {
      return;
    }

    const existingByUrl = [...byId.values()].find(
      (item) => item.storagelyUrl.toLowerCase() === facility.storagelyUrl.toLowerCase(),
    );
    if (existingByUrl) {
      byId.set(existingByUrl.id, { ...existingByUrl, ...facility, id: existingByUrl.id });
      return;
    }

    byId.set(facility.id, facility);
  });

  return [...byId.values()].sort((a, b) =>
    `${a.state}${a.city}${a.facilityName}`.localeCompare(`${b.state}${b.city}${b.facilityName}`),
  );
};

export const upsertFacility = (current: NearbyFacility[], facility: NearbyFacility): { facilities: NearbyFacility[]; error?: string } => {
  const duplicateUrl = current.find(
    (item) => item.id !== facility.id && item.storagelyUrl.toLowerCase() === facility.storagelyUrl.toLowerCase(),
  );
  if (duplicateUrl) {
    return { facilities: current, error: `Storagely URL already used by ${duplicateUrl.facilityName}.` };
  }

  const duplicateId = current.find((item) => item.id === facility.id);
  const next = duplicateId
    ? current.map((item) => (item.id === facility.id ? facility : item))
    : [...current, facility];

  return { facilities: next.sort((a, b) => `${a.state}${a.city}${a.facilityName}`.localeCompare(`${b.state}${b.city}${b.facilityName}`)) };
};

export const facilityWarnings = (facilities: NearbyFacility[]): string[] => {
  const warnings: string[] = [];
  if (facilities.length === 0) {
    warnings.push("No facilities in library. Import CSV or add manually.");
  }
  const missingImage = facilities.filter((f) => !f.imageUrl).length;
  const missingUrl = facilities.filter((f) => !f.storagelyUrl).length;
  if (missingImage > 0) warnings.push(`${missingImage} facility(ies) missing image URL.`);
  if (missingUrl > 0) warnings.push(`${missingUrl} facility(ies) missing Storagely URL.`);
  return warnings;
};

export const facilityCsvTemplate = `facilityName,city,state,address,zipCode,storagelyUrl,phone,imageUrl,notes
My Garage Self Storage | I-35,Belton,TX,"1234 I-35 Frontage Rd, Belton, TX 76513",76513,https://www.mygarageselfstorage.com/self-storage/tx/belton/i-35/,254-555-0100,/media-library/nearby-locations/self-storage-units-in-belton.jpg,Starter row — replace with approved data`;
