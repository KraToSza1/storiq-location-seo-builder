import type { StorageImage } from "../types/storiq";

/** Source: client image_library.md (My Garage Image Library). */
export interface ImageLibraryCatalogEntry {
  code: string;
  category: string;
  imageUrl: string;
  destinationUrl?: string;
  altText: string;
  type: StorageImage["type"];
  id: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  "vehicle storage": "Vehicle Storage",
  "boat storage": "Boat Storage",
  "rv storage": "RV Storage",
  "truck storage": "Truck Storage",
  "business storage": "Business Storage",
  "climate controlled storage": "Climate-Controlled Storage",
  "drive up storage": "Drive-Up Storage",
  "student storage": "Student Storage",
  "military storage": "Military Storage",
  "retail storage": "Retail Storage",
  "indoor storage": "Indoor Storage",
  "container storage": "Container Storage",
  "warehouse storage": "Warehouse Storage",
};

const formatCategory = (value: string): string => {
  const key = value.trim().toLowerCase();
  if (CATEGORY_LABELS[key]) {
    return CATEGORY_LABELS[key];
  }
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const STORAGE_ID_BY_CODE: Record<string, string> = {
  "IMG-001": "vehicle-storage",
  "IMG-002": "boat-storage",
  "IMG-003": "rv-storage",
  "IMG-004": "truck-storage",
  "IMG-005": "business-storage",
  "IMG-006": "climate-controlled-storage",
  "IMG-007": "drive-up-storage",
  "IMG-008": "student-storage",
  "IMG-009": "military-storage",
  "IMG-010": "retail-storage",
  "IMG-011": "indoor-storage",
  "IMG-012": "container-storage",
  "IMG-040": "warehouse-storage",
};

/** @deprecated Renamed to drive-up-storage in client library. */
export const LEGACY_NON_CLIMATE_STORAGE_ID = "non-climate-controlled-storage";

export const IMAGE_LIBRARY_CATALOG: ImageLibraryCatalogEntry[] = [
  {
    code: "IMG-001",
    id: "vehicle-storage",
    category: "Vehicle Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/eaf7976243a0b9d092650645480c34ca.png",
    destinationUrl: "https://www.mygarageselfstorage.com/vehicle-storage",
    altText: "vehicle storage",
    type: "storage_type",
  },
  {
    code: "IMG-002",
    id: "boat-storage",
    category: "Boat Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/6d49e50f91998d8e8df93670f781cf21.png",
    altText: "boat storage",
    type: "storage_type",
  },
  {
    code: "IMG-003",
    id: "rv-storage",
    category: "RV Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/2b60d6296ac4f7b1d8df2caa484e9e59.png",
    altText: "rv storage",
    type: "storage_type",
  },
  {
    code: "IMG-004",
    id: "truck-storage",
    category: "Truck Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/990ad3a22523680881f8f27b62f4493b.png",
    altText: "truck storage",
    type: "storage_type",
  },
  {
    code: "IMG-005",
    id: "business-storage",
    category: "Business Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/75112d5d3232f5ccfcb257d87e10b28c.png",
    destinationUrl: "https://www.mygarageselfstorage.com/business-storage",
    altText: "business storage",
    type: "storage_type",
  },
  {
    code: "IMG-006",
    id: "climate-controlled-storage",
    category: "Climate-Controlled Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/23ee049f056b1e9c7f26ce8f2200fad6.png",
    destinationUrl: "https://www.mygarageselfstorage.com/climate-controlled-storage",
    altText: "climate controlled storage",
    type: "storage_type",
  },
  {
    code: "IMG-007",
    id: "drive-up-storage",
    category: "Drive-Up Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/efc180eff5bb83eecdc8200cc10bd3e6.png",
    altText: "drive up storage",
    type: "storage_type",
  },
  {
    code: "IMG-008",
    id: "student-storage",
    category: "Student Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/68a9c7cd55a83a29e29fd16e8a1d0c23.png",
    altText: "student storage",
    type: "storage_type",
  },
  {
    code: "IMG-009",
    id: "military-storage",
    category: "Military Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/0e4b1fee07ff1d1c3233befa93fde6dc.png",
    altText: "military storage",
    type: "storage_type",
  },
  {
    code: "IMG-010",
    id: "retail-storage",
    category: "Retail Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/132d3363232a1042dd4c25f487e51726.png",
    altText: "retail storage",
    type: "storage_type",
  },
  {
    code: "IMG-011",
    id: "indoor-storage",
    category: "Indoor Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/f1285e03e69647cd803901bf02fa1da5.png",
    altText: "indoor storage",
    type: "storage_type",
  },
  {
    code: "IMG-012",
    id: "container-storage",
    category: "Container Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/ef42608a67e2df92d828edbaef349622.png",
    altText: "container storage",
    type: "storage_type",
  },
  {
    code: "IMG-040",
    id: "warehouse-storage",
    category: "Warehouse Storage",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/4516ea8899596aec67c9401d635f323c.png",
    altText: "warehouse storage",
    type: "storage_type",
  },
  {
    code: "IMG-013",
    id: "img-beaumont",
    category: "Self storage units in Beaumont",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/ddc35a881ebbbf5482a290eaa78d8fcd.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-unit/texas/beaumont/college-street",
    altText: "self storage units in beaumont",
    type: "facility_location",
  },
  {
    code: "IMG-014",
    id: "img-belton",
    category: "Self storage units in Belton",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/3bd18bef4ab16cd6eb11f03b87f04944.jpg",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/belton/i-35",
    altText: "self storage units in belton",
    type: "facility_location",
  },
  {
    code: "IMG-015",
    id: "img-bullard",
    category: "Self storage units in Bullard",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/7152c5d06bad5983f91b76920030e1b5.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/bullard/south-drive-m-roper-parkway-a",
    altText: "self storage units in bullard",
    type: "facility_location",
  },
  {
    code: "IMG-016",
    id: "img-copperas-cove",
    category: "Self storage units in Copperas Cove",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/23498c176717d173b95d2d188b201170.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/copperas-cove/west-highway-190",
    altText: "self storage units in copperas cove",
    type: "facility_location",
  },
  {
    code: "IMG-017",
    id: "img-corsicana",
    category: "Self storage units in Corsicana",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/e50b2d856228f9629a94a50b55296065.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/corsicana/north-13th-street",
    altText: "self storage units in corsicana",
    type: "facility_location",
  },
  {
    code: "IMG-018",
    id: "img-corsicana-west",
    category: "Self storage units in Corsicana West",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/b700a8f3b5dd5260a4e86335510712d8.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/corsicana/west-7th-avenue",
    altText: "self storage units in corsicana west",
    type: "facility_location",
  },
  {
    code: "IMG-019",
    id: "img-corsicana-north",
    category: "Self storage units in Corsicana North",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/e54d9fe6be51fd496b50c06cc230355b.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/corsicana/north-45th-street",
    altText: "self storage units in corsicana north",
    type: "facility_location",
  },
  {
    code: "IMG-020",
    id: "img-mcclintock",
    category: "Self storage units in McClintock",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/e31e3b8ad19ec75fede8f7ca36af4051.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/el-paso/mcclintock-drive",
    altText: "self storage units in mcclintock",
    type: "facility_location",
  },
  {
    code: "IMG-021",
    id: "img-remcon",
    category: "Self storage units in Remcon",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/b79529057602dde66d2ab7aa2f0dff78.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/el-paso/remcon-circle",
    altText: "self storage units in remcon",
    type: "facility_location",
  },
  {
    code: "IMG-022",
    id: "img-flint",
    category: "Self storage units in Flint",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/3ed2999f3bbbffe6434fad60976c4a94.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/flint/highway-155-south",
    altText: "self storage units in flint",
    type: "facility_location",
  },
  {
    code: "IMG-023",
    id: "img-becker",
    category: "Self storage units in Becker",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/09804df205ccfa39b9cd14a1f520d9e2.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/hockley/becker-road",
    altText: "self storage units in becker",
    type: "facility_location",
  },
  {
    code: "IMG-024",
    id: "img-katy-hockley",
    category: "Self storage units in Katy Hockley",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/56ac30e6ed80d7b54bfeac786243e030.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/hockley/katy-hockley-road",
    altText: "self storage units in katy hockley",
    type: "facility_location",
  },
  {
    code: "IMG-025",
    id: "img-killeen",
    category: "Self storage units in Killeen",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/d111aae3e270a68911db0ad77aa2fbe9.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/killeen/east-rancier-avenue",
    altText: "self storage units in killeen",
    type: "facility_location",
  },
  {
    code: "IMG-026",
    id: "img-barrows",
    category: "Self storage units in Barrows",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/5fc636a5d0cc971fc68834b35e216f8d.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/kountze/barrows-drive",
    altText: "self storage units in barrows",
    type: "facility_location",
  },
  {
    code: "IMG-027",
    id: "img-kountze-south",
    category: "Self storage units in Kountze South",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/f107f1203d958edf8b15373c2aad0281.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/kountze/south-highway-69",
    altText: "self storage units in kountze south",
    type: "facility_location",
  },
  {
    code: "IMG-028",
    id: "img-mexia",
    category: "Self storage units in Mexia",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/4adff40bccaf5f852b0bb788fe80d0d5.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/mexia/north-drive-mlk-jr-highway",
    altText: "self storage units in mexia",
    type: "facility_location",
  },
  {
    code: "IMG-029",
    id: "img-midlothian",
    category: "Self storage units in Midlothian",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/dede11022545d1520d2bed3f5f37f3b6.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/midlothian/fm-663",
    altText: "self storage units in midlothian",
    type: "facility_location",
  },
  {
    code: "IMG-030",
    id: "img-morgans-point",
    category: "Self storage units in Morgans Point",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/856edd0d0f32e364cae5f463280bbdb0.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/morgans-point-resort/morgans-point-road",
    altText: "self storage units in morgans point",
    type: "facility_location",
  },
  {
    code: "IMG-031",
    id: "img-orange",
    category: "Self storage units in Orange",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/e8c89885e95806ef3121043de3584a55.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/orange/ih-10-west",
    altText: "self storage units in orange",
    type: "facility_location",
  },
  {
    code: "IMG-032",
    id: "img-strickland",
    category: "Self storage units in Strickland",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/1c3eb8deee521fe88f48e4f7905d6a9f.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/orange/strickland-drive",
    altText: "self storage units in strickland",
    type: "facility_location",
  },
  {
    code: "IMG-033",
    id: "img-pearland",
    category: "Self storage units in Pearland",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/9436340aaae1542b6de999b5e0b79103.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/pearland/old-massey-ranch-road",
    altText: "self storage units in pearland",
    type: "facility_location",
  },
  {
    code: "IMG-034",
    id: "img-royse-city",
    category: "Self storage units in Royse City",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/e52ab5fc4bd8db0b26d7ac148269cd6a.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/royse-city/tx-276",
    altText: "self storage units in royse city",
    type: "facility_location",
  },
  {
    code: "IMG-035",
    id: "img-rusk",
    category: "Self storage units in Rusk",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/28e778903a748064091e89b24131f6c4.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/rusk/loop-343",
    altText: "self storage units in rusk",
    type: "facility_location",
  },
  {
    code: "IMG-036",
    id: "img-west-rusk",
    category: "Self storage units in West Rusk",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/54c230270eaa4609e66cd7c2b3b87d98.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/rusk/west-6th-street",
    altText: "self storage units in west rusk",
    type: "facility_location",
  },
  {
    code: "IMG-037",
    id: "img-temple-north",
    category: "Self storage units in Temple North",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/75d7338880f5ff41cc85282e82c45a68.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/temple/north-27th-street",
    altText: "self storage units in temple north",
    type: "facility_location",
  },
  {
    code: "IMG-038",
    id: "img-temple-south",
    category: "Self storage units in Temple South",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/f6dc21eb6253190724356fb94f585e94.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/temple/south-31st-street",
    altText: "self storage units in temple south",
    type: "facility_location",
  },
  {
    code: "IMG-039",
    id: "img-tyler",
    category: "Self storage units in Tyler",
    imageUrl: "https://cloud-1de12d.becdn.net/media/original/50a56908710ac67ae7988908bdbf4c59.webp",
    destinationUrl: "https://www.mygarageselfstorage.com/storage-units/texas/tyler/north-glenwood-blvd",
    altText: "self storage units in tyler",
    type: "facility_location",
  },
];

export const catalogEntryToStorageImage = (entry: ImageLibraryCatalogEntry): StorageImage => ({
  id: entry.id,
  category: entry.category,
  imageUrl: entry.imageUrl,
  destinationUrl: entry.destinationUrl,
  altText: entry.altText,
  type: entry.type,
});

export const catalogStorageImages = (): StorageImage[] => IMAGE_LIBRARY_CATALOG.map(catalogEntryToStorageImage);

export const starterStorageTypeImages = (): StorageImage[] =>
  IMAGE_LIBRARY_CATALOG.filter((entry) => entry.type === "storage_type").map(catalogEntryToStorageImage);

export const catalogById = (): Map<string, ImageLibraryCatalogEntry> =>
  new Map(IMAGE_LIBRARY_CATALOG.map((entry) => [entry.id, entry]));

export const catalogByCode = (): Map<string, ImageLibraryCatalogEntry> =>
  new Map(IMAGE_LIBRARY_CATALOG.map((entry) => [entry.code, entry]));

export const resolveCatalogIdFromCode = (code: string): string | undefined => STORAGE_ID_BY_CODE[code.trim().toUpperCase()];

export const normalizeCatalogCategory = (value: string): string => formatCategory(value);

export const facilityImageUrlByStoragelyPath = (): Map<string, string> => {
  const map = new Map<string, string>();
  IMAGE_LIBRARY_CATALOG.filter((entry) => entry.type === "facility_location" && entry.destinationUrl).forEach((entry) => {
    map.set(entry.destinationUrl!.trim().toLowerCase(), entry.imageUrl);
  });
  return map;
};
