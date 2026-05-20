import { createId } from "./projectDefaults";
import { starterImages } from "./defaultImages";
import type { ImageImportResult, StorageImage, StorageImageType } from "../types/storiq";
import { parseCsvRows } from "./facilityLibrary";

const LINKABLE_CATEGORIES = ["Vehicle Storage", "Business Storage", "Climate-Controlled Storage"];

const headerAliases: Record<string, keyof StorageImage | "type"> = {
  id: "id",
  category: "category",
  name: "category",
  imageurl: "imageUrl",
  image: "imageUrl",
  url: "imageUrl",
  destinationurl: "destinationUrl",
  linkurl: "destinationUrl",
  alttext: "altText",
  alt: "altText",
  type: "type",
  imagetype: "type",
};

const normalizeHeader = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const defaultImages: StorageImage[] = starterImages;

export const normalizeImage = (image: Partial<StorageImage>): StorageImage | undefined => {
  const type = (image.type === "facility_location" ? "facility_location" : "storage_type") as StorageImageType;
  const category = image.category?.trim() || "";
  const imageUrl = image.imageUrl?.trim() || "";

  if (!category || !imageUrl) {
    return undefined;
  }

  return {
    id: image.id?.trim() || slug(category) || createId(),
    category,
    imageUrl,
    destinationUrl: image.destinationUrl?.trim() || undefined,
    altText: image.altText?.trim() || category,
    type,
  };
};

export const parseImagesCsv = (csv: string): { images: StorageImage[]; result: ImageImportResult } => {
  const rows = parseCsvRows(csv);
  const [headers, ...dataRows] = rows;
  const errors: string[] = [];

  if (!headers?.length) {
    return { images: [], result: { imported: 0, skipped: 0, errors: ["CSV is empty."] } };
  }

  const mappedHeaders = headers.map((header) => headerAliases[normalizeHeader(header)]);
  if (!mappedHeaders.includes("category") || !mappedHeaders.includes("imageUrl")) {
    return {
      images: [],
      result: { imported: 0, skipped: dataRows.length, errors: ["CSV must include category and imageUrl columns."] },
    };
  }

  const images: StorageImage[] = [];
  let skipped = 0;

  dataRows.forEach((row, rowIndex) => {
    const partial: Partial<StorageImage> = {};
    mappedHeaders.forEach((key, index) => {
      if (key && row[index]) {
        (partial as Record<string, string>)[key] = row[index];
      }
    });
    const image = normalizeImage(partial);
    if (image) {
      images.push(image);
    } else {
      skipped += 1;
      errors.push(`Row ${rowIndex + 2} skipped — category and imageUrl are required.`);
    }
  });

  return { images, result: { imported: images.length, skipped, errors } };
};

export const mergeImages = (current: StorageImage[], incoming: StorageImage[]): StorageImage[] => {
  const byId = new Map<string, StorageImage>();
  current.forEach((image) => byId.set(image.id, image));
  incoming.forEach((image) => byId.set(image.id, image));
  return [...byId.values()].sort((a, b) => a.category.localeCompare(b.category));
};

export const upsertImage = (current: StorageImage[], image: StorageImage): StorageImage[] => {
  const exists = current.some((item) => item.id === image.id);
  const next = exists ? current.map((item) => (item.id === image.id ? image : item)) : [...current, image];
  return next.sort((a, b) => a.category.localeCompare(b.category));
};

export const getStorageImageById = (images: StorageImage[], id: string): StorageImage | undefined =>
  images.find((image) => image.id === id);

export const getImagesByType = (images: StorageImage[], type: StorageImageType): StorageImage[] =>
  images.filter((image) => image.type === type);

export const imageWarnings = (images: StorageImage[]): string[] => {
  const warnings: string[] = [];
  if (images.length === 0) {
    warnings.push("Image library is empty. Import CSV or add images manually.");
  }
  const missingUrl = images.filter((i) => !i.imageUrl).length;
  const missingAlt = images.filter((i) => !i.altText?.trim()).length;
  if (missingUrl > 0) warnings.push(`${missingUrl} image(s) missing image URL.`);
  if (missingAlt > 0) warnings.push(`${missingAlt} image(s) missing alt text.`);

  const linkableWithDest = images.filter(
    (i) => i.type === "storage_type" && LINKABLE_CATEGORIES.includes(i.category) && i.destinationUrl,
  );
  if (linkableWithDest.length > 0) {
    warnings.push(
      `${linkableWithDest.length} linkable storage type(s) have destination URLs: ${linkableWithDest.map((i) => i.category).join(", ")}.`,
    );
  }

  return warnings;
};

export const imageCsvTemplate = `id,category,imageUrl,destinationUrl,altText,type
vehicle-storage,Vehicle Storage,https://example.com/vehicle.jpg,https://www.mygarageselfstorage.com/storage-types/vehicle-storage/,Vehicle storage units,storage_type
facility-exterior,Facility Exterior,https://example.com/exterior.jpg,,My Garage facility exterior in City State,facility_location`;

export const isLinkableStorageType = (category: string): boolean => LINKABLE_CATEGORIES.includes(category);
