import { facilityImageUrlByStoragelyPath } from "./imageLibraryCatalog";
import { nearbyLocationImage } from "./mediaPaths";
import type { NearbyFacility } from "../types/storiq";

/** Approved Storagely page URLs — source: client nearby_cities list. */
export interface CanonicalFacilityDef {
  id: string;
  facilityName: string;
  city: string;
  state: string;
  address: string;
  zipCode: string;
  storagelyUrl: string;
  imageFilename?: string;
}

export const CANONICAL_FACILITY_REGISTRY: CanonicalFacilityDef[] = [
  {
    id: "mgs-beaumont-college-street",
    facilityName: "My Garage Self Storage | College Street",
    city: "Beaumont",
    state: "TX",
    address: "6320 College St, Beaumont, TX 77707",
    zipCode: "77707",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-unit/texas/beaumont/college-street",
    imageFilename: "self-storage-units-in-beaumont.jpg",
  },
  {
    id: "mgs-belton-i-35",
    facilityName: "My Garage Self Storage | I 35",
    city: "Belton",
    state: "TX",
    address: "1900 Interstate 35 Frontage Rd, Belton, TX 76513",
    zipCode: "76513",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/belton/i-35",
    imageFilename: "self-storage-units-in-belton.jpg",
  },
  {
    id: "mgs-bullard-south-drive-m-roper-parkway-a",
    facilityName: "My Garage Self Storage | South Drive M Roper Parkway A",
    city: "Bullard",
    state: "TX",
    address: "444 S. Dr. M Roper Pkwy A, Bullard, TX 75757",
    zipCode: "75757",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/bullard/south-drive-m-roper-parkway-a",
    imageFilename: "self-storage-units-in-bullard.webp",
  },
  {
    id: "mgs-copperas-cove-west-highway-190",
    facilityName: "My Garage Self Storage | West Highway 190",
    city: "Copperas Cove",
    state: "TX",
    address: "930 W Hwy 190, Copperas Cove, TX 76522",
    zipCode: "76522",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/copperas-cove/west-highway-190",
    imageFilename: "self-storage-units-in-copperas-cove.webp",
  },
  {
    id: "mgs-corsicana-north-13th-street",
    facilityName: "My Garage Self Storage | North 13th Street",
    city: "Corsicana",
    state: "TX",
    address: "801 N 13th St, Corsicana, TX 75110",
    zipCode: "75110",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/corsicana/north-13th-street",
    imageFilename: "self-storage-units-in-corsicana.webp",
  },
  {
    id: "mgs-corsicana-west-7th-avenue",
    facilityName: "My Garage Self Storage | West 7th Avenue",
    city: "Corsicana",
    state: "TX",
    address: "2631 West 7th Avenue, Corsicana, TX 75110",
    zipCode: "75110",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/corsicana/west-7th-avenue",
    imageFilename: "self-storage-units-in-corsicana-584.webp",
  },
  {
    id: "mgs-corsicana-north-45th-street",
    facilityName: "My Garage Self Storage | North 45th Street",
    city: "Corsicana",
    state: "TX",
    address: "1501 N 45th St, Corsicana, TX 75110",
    zipCode: "75110",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/corsicana/north-45th-street",
    imageFilename: "self-storage-in-corsicana-north-45.webp",
  },
  {
    id: "mgs-el-paso-mcclintock-drive",
    facilityName: "My Garage Self Storage | McClintock Drive",
    city: "El Paso",
    state: "TX",
    address: "340 McClintock Dr, El Paso, TX 79932",
    zipCode: "79932",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/el-paso/mcclintock-drive",
    imageFilename: "self-storage-units-in-mcclintock.webp",
  },
  {
    id: "mgs-el-paso-remcon-circle",
    facilityName: "My Garage Self Storage | Remcon Circle",
    city: "El Paso",
    state: "TX",
    address: "7315 Remcon Circle, El Paso, TX 79912",
    zipCode: "79912",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/el-paso/remcon-circle",
    imageFilename: "self-storage-units-in-el-paso.webp",
  },
  {
    id: "mgs-flint-highway-155-south",
    facilityName: "My Garage Self Storage | Highway 155 South",
    city: "Flint",
    state: "TX",
    address: "17439 Hwy 155 S, Flint, TX 75762",
    zipCode: "75762",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/flint/highway-155-south",
    imageFilename: "self-storage-units-in-flint.webp",
  },
  {
    id: "mgs-hockley-becker-road",
    facilityName: "My Garage Self Storage | Becker Road",
    city: "Hockley",
    state: "TX",
    address: "18800 Becker Road, Hockley, TX 77447",
    zipCode: "77447",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/hockley/becker-road",
    imageFilename: "self-storage-units-in-hockley.webp",
  },
  {
    id: "mgs-hockley-katy-hockley-road",
    facilityName: "My Garage Self Storage | Katy Hockley Road",
    city: "Hockley",
    state: "TX",
    address: "16273 Katy Hockley Rd, Hockley, TX 77447",
    zipCode: "77447",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/hockley/katy-hockley-road",
    imageFilename: "self-storage-units-in-katy-hockley.webp",
  },
  {
    id: "mgs-killeen-east-rancier-avenue",
    facilityName: "My Garage Self Storage | East Rancier Avenue",
    city: "Killeen",
    state: "TX",
    address: "5708 East Rancier Ave, Killeen, TX 76543",
    zipCode: "76543",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/killeen/east-rancier-avenue",
    imageFilename: "self-storage-units-in-killeen.webp",
  },
  {
    id: "mgs-kountze-barrows-drive",
    facilityName: "My Garage Self Storage | Barrows Drive",
    city: "Kountze",
    state: "TX",
    address: "5335 Barrows Drive, Kountze, TX 77625",
    zipCode: "77625",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/kountze/barrows-drive",
    imageFilename: "self-storage-units-in-barrows-drive.webp",
  },
  {
    id: "mgs-kountze-south-highway-69",
    facilityName: "My Garage Self Storage | South Highway 69",
    city: "Kountze",
    state: "TX",
    address: "971 S HWY 69, Kountze, TX 77625",
    zipCode: "77625",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/kountze/south-highway-69",
    imageFilename: "self-storage-units-in-kountze-south.webp",
  },
  {
    id: "mgs-mexia-north-drive-mlk-jr-highway",
    facilityName: "My Garage Self Storage | North Drive MLK Jr. Highway",
    city: "Mexia",
    state: "TX",
    address: "246 N Dr. MLK Jr, Mexia, TX 76667",
    zipCode: "76667",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/mexia/north-drive-mlk-jr-highway",
    imageFilename: "self-storage-units-in-mexia.webp",
  },
  {
    id: "mgs-midlothian-fm-663",
    facilityName: "My Garage Self Storage | FM 663",
    city: "Midlothian",
    state: "TX",
    address: "5230 FM 663, Midlothian, TX 76065",
    zipCode: "76065",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/midlothian/fm-663",
    imageFilename: "self-storage-units-in-midlothian.webp",
  },
  {
    id: "mgs-morgans-point-resort-morgans-point-road",
    facilityName: "My Garage Self Storage | Morgan's Point Road",
    city: "Morgan's Point Resort",
    state: "TX",
    address: "1875 Morgan's Point Rd, Morgan's Point Resort, TX 76513",
    zipCode: "76513",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/morgans-point-resort/morgans-point-road",
    imageFilename: "self-storage-units-in-morgans-point-resort.webp",
  },
  {
    id: "mgs-orange-ih-10-west",
    facilityName: "My Garage Self Storage | IH 10 West",
    city: "Orange",
    state: "TX",
    address: "2525 IH 10 West, Orange, TX 77630",
    zipCode: "77630",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/orange/ih-10-west",
    imageFilename: "self-storage-units-in-orange.webp",
  },
  {
    id: "mgs-orange-strickland-drive",
    facilityName: "My Garage Self Storage | Strickland Drive",
    city: "Orange",
    state: "TX",
    address: "1916 Strickland Drive, Orange, TX 77630",
    zipCode: "77630",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/orange/strickland-drive",
    imageFilename: "self-storage-units-in-strickland-drive.webp",
  },
  {
    id: "mgs-pearland-old-massey-ranch-road",
    facilityName: "My Garage Self Storage | Old Massey Ranch Road",
    city: "Pearland",
    state: "TX",
    address: "6119 Old Massey Ranch Road, Pearland, TX 77584",
    zipCode: "77584",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/pearland/old-massey-ranch-road",
    imageFilename: "self-storage-units-in-old-massey-ranch-road.webp",
  },
  {
    id: "mgs-royse-city-tx-276",
    facilityName: "My Garage Self Storage | TX 276",
    city: "Royse City",
    state: "TX",
    address: "6458 W SH-276, Royse City, TX 75189",
    zipCode: "75189",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/royse-city/tx-276",
    imageFilename: "self-storage-units-in-royse-city.webp",
  },
  {
    id: "mgs-rusk-loop-343",
    facilityName: "My Garage Self Storage | Loop 343",
    city: "Rusk",
    state: "TX",
    address: "4311 Loop 343, Rusk, TX 75785",
    zipCode: "75785",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/rusk/loop-343",
    imageFilename: "self-storage-units-in-rusk.webp",
  },
  {
    id: "mgs-rusk-west-6th-street",
    facilityName: "My Garage Self Storage | West 6th Street",
    city: "Rusk",
    state: "TX",
    address: "973 West 6th Street, Rusk, TX 75785",
    zipCode: "75785",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/rusk/west-6th-street",
    imageFilename: "self-storage-units-in-west-6th-street.webp",
  },
  {
    id: "mgs-temple-north-27th-street",
    facilityName: "My Garage Self Storage | North 27th Street",
    city: "Temple",
    state: "TX",
    address: "114 N 27th St, Temple, TX 76504",
    zipCode: "76504",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/temple/north-27th-street",
    imageFilename: "self-storage-units-in-temple.webp",
  },
  {
    id: "mgs-temple-south-31st-street",
    facilityName: "My Garage Self Storage | South 31st Street",
    city: "Temple",
    state: "TX",
    address: "4800 S 31st St, Temple, TX 76502",
    zipCode: "76502",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/temple/south-31st-street",
    imageFilename: "self-storage-units-in-temple-south-31.webp",
  },
  {
    id: "mgs-tyler-north-glenwood-blvd",
    facilityName: "My Garage Self Storage | North Glenwood Blvd",
    city: "Tyler",
    state: "TX",
    address: "504 N Glenwood Blvd, Tyler, TX 75702",
    zipCode: "75702",
    storagelyUrl: "https://www.mygarageselfstorage.com/storage-units/texas/tyler/north-glenwood-blvd",
    imageFilename: "self-storage-units-in-tyler.webp",
  },
];

const normalizeKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const normalizeStoragelyUrl = (url: string): string => url.trim().replace(/\/+$/, "");

/** City slug or city/location slug from an approved Storagely URL. */
export const extractStoragelyTexasPath = (url: string): string => {
  const normalized = normalizeStoragelyUrl(url).toLowerCase();
  const modern = normalized.match(/\/storage-units?\/texas\/([^/?#]+(?:\/[^/?#]+)?)/);
  if (modern) {
    return modern[1];
  }

  const legacy = normalized.match(/\/self-storage\/tx\/([^/?#]+(?:\/[^/?#]+)?)/);
  return legacy?.[1] ?? "";
};

const registryById = new Map(CANONICAL_FACILITY_REGISTRY.map((facility) => [facility.id, facility]));
const registryByUrl = new Map(
  CANONICAL_FACILITY_REGISTRY.map((facility) => [normalizeStoragelyUrl(facility.storagelyUrl).toLowerCase(), facility]),
);
const registryByTexasPath = new Map(
  CANONICAL_FACILITY_REGISTRY.map((facility) => [extractStoragelyTexasPath(facility.storagelyUrl), facility]),
);
const registryByName = new Map(
  CANONICAL_FACILITY_REGISTRY.map((facility) => [normalizeKey(facility.facilityName), facility]),
);
export const NEARBY_IMAGE_TO_FACILITY_ID: Record<string, string> = Object.fromEntries(
  CANONICAL_FACILITY_REGISTRY.filter((facility) => facility.imageFilename).map((facility) => [
    facility.imageFilename as string,
    facility.id,
  ]),
);

const FACILITY_IMAGE_BY_STORAGELY_URL = facilityImageUrlByStoragelyPath();

const resolveFacilityImageUrl = (storagelyUrl: string, fallbackFilename?: string): string | undefined => {
  const fromCatalog = FACILITY_IMAGE_BY_STORAGELY_URL.get(storagelyUrl.trim().toLowerCase().replace(/\/+$/, ""));
  if (fromCatalog) {
    return fromCatalog;
  }
  return fallbackFilename ? nearbyLocationImage(fallbackFilename) : undefined;
};

/** Legacy starter / catalog URLs mapped to approved Storagely paths. */
const LEGACY_TEXAS_PATH_REDIRECTS: Record<string, string> = {
  belton: "belton/i-35",
  "belton/i-35": "belton/i-35",
  bullard: "bullard/south-drive-m-roper-parkway-a",
  "copperas-cove": "copperas-cove/west-highway-190",
  corsicana: "corsicana/north-13th-street",
  "corsicana-584": "corsicana/west-7th-avenue",
  "corsicana-north-45": "corsicana/north-45th-street",
  "el-paso": "el-paso/remcon-circle",
  mcclintock: "el-paso/mcclintock-drive",
  flint: "flint/highway-155-south",
  hockley: "hockley/becker-road",
  "katy-hockley": "hockley/katy-hockley-road",
  killeen: "killeen/east-rancier-avenue",
  "killeen/central": "killeen/east-rancier-avenue",
  kountze: "kountze/barrows-drive",
  "kountze-south": "kountze/south-highway-69",
  "barrows-drive": "kountze/barrows-drive",
  mexia: "mexia/north-drive-mlk-jr-highway",
  midlothian: "midlothian/fm-663",
  "morgans-point-resort": "morgans-point-resort/morgans-point-road",
  orange: "orange/ih-10-west",
  "strickland-drive": "orange/strickland-drive",
  pearland: "pearland/old-massey-ranch-road",
  "old-massey-ranch-road": "pearland/old-massey-ranch-road",
  "royse-city": "royse-city/tx-276",
  rusk: "rusk/loop-343",
  "west-6th-street": "rusk/west-6th-street",
  temple: "temple/north-27th-street",
  "temple/loop-363": "temple/south-31st-street",
  "temple-south-31": "temple/south-31st-street",
  tyler: "tyler/north-glenwood-blvd",
  beaumont: "beaumont/college-street",
};

export const findCanonicalFacility = (
  facility: Partial<NearbyFacility> & { url?: string },
): CanonicalFacilityDef | undefined => {
  const storagelyUrl = (facility.storagelyUrl || facility.url || "").trim();
  if (storagelyUrl) {
    const byUrl = registryByUrl.get(normalizeStoragelyUrl(storagelyUrl).toLowerCase());
    if (byUrl) {
      return byUrl;
    }

    const texasPath = extractStoragelyTexasPath(storagelyUrl);
    if (texasPath) {
      const direct = registryByTexasPath.get(texasPath);
      if (direct) {
        return direct;
      }

      const redirected = LEGACY_TEXAS_PATH_REDIRECTS[texasPath];
      if (redirected) {
        return registryByTexasPath.get(redirected);
      }
    }
  }

  if (facility.id && registryById.has(facility.id)) {
    return registryById.get(facility.id);
  }

  if (facility.facilityName) {
    const byName = registryByName.get(normalizeKey(facility.facilityName));
    if (byName) {
      return byName;
    }
  }

  return undefined;
};

export const resolveCanonicalStoragelyUrl = (facility: Partial<NearbyFacility> & { url?: string }): string => {
  const canonical = findCanonicalFacility(facility);
  if (canonical) {
    return canonical.storagelyUrl;
  }

  const raw = (facility.storagelyUrl || facility.url || "").trim();
  if (!raw) {
    return "";
  }

  const texasPath = extractStoragelyTexasPath(raw);
  const redirected = texasPath ? LEGACY_TEXAS_PATH_REDIRECTS[texasPath] : undefined;
  if (redirected && registryByTexasPath.has(redirected)) {
    return registryByTexasPath.get(redirected)?.storagelyUrl ?? raw;
  }

  return raw;
};

export const toNearbyFacility = (def: CanonicalFacilityDef): NearbyFacility => ({
  id: def.id,
  facilityName: def.facilityName,
  city: def.city,
  state: def.state,
  address: def.address,
  zipCode: def.zipCode,
  storagelyUrl: def.storagelyUrl,
  imageUrl: resolveFacilityImageUrl(def.storagelyUrl, def.imageFilename),
});

export const canonicalFacilities = (): NearbyFacility[] => CANONICAL_FACILITY_REGISTRY.map(toNearbyFacility);

export const upgradeFacilityStoragelyUrl = (facility: NearbyFacility): NearbyFacility => {
  const canonical = findCanonicalFacility(facility);
  if (!canonical) {
    const resolvedUrl = resolveCanonicalStoragelyUrl(facility);
    if (resolvedUrl && resolvedUrl !== facility.storagelyUrl) {
      return { ...facility, storagelyUrl: resolvedUrl };
    }
    return facility;
  }

  return {
    ...facility,
    id: facility.id.startsWith("nearby-catalog-") || facility.id.startsWith("mgs-") ? canonical.id : facility.id,
    facilityName: canonical.facilityName,
    city: canonical.city,
    state: canonical.state,
    address: canonical.address,
    zipCode: canonical.zipCode,
    storagelyUrl: canonical.storagelyUrl,
    imageUrl: resolveFacilityImageUrl(canonical.storagelyUrl, canonical.imageFilename) ?? facility.imageUrl,
  };
};

export const upgradeFacilitiesStoragelyUrls = (facilities: NearbyFacility[]): NearbyFacility[] =>
  facilities.map(upgradeFacilityStoragelyUrl);
