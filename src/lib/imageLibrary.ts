import { createId } from "./projectDefaults";
import { starterImages } from "./defaultImages";
import { resolveStorageDestinationUrl } from "./storageDestinationUrls";
import type { ImageImportResult, StorageImage, StorageImageType } from "../types/storiq";
import { parseCsvRows } from "./facilityLibrary";

const LINKABLE_CATEGORIES = ["Vehicle Storage", "Business Storage", "Climate-Controlled Storage"];

const headerAliases: Record<string, keyof StorageImage | "type"> = {
  id: "id",
  number: "id",
  imagenumber: "id",
  "#": "id",
  category: "category",
  name: "category",
  imagename: "category",
  imageurl: "imageUrl",
  image: "imageUrl",
  url: "imageUrl",
  destinationurl: "destinationUrl",
  destination: "destinationUrl",
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
    destinationUrl: resolveStorageDestinationUrl({
      id: image.id?.trim() || slug(category) || createId(),
      category,
      destinationUrl: image.destinationUrl,
    }),
    altText: image.altText?.trim() || category,
    type,
  };
};

/** Fix legacy `/storage-types/` destination URLs in saved Master Data. */
export const migrateImageLibrary = (images: StorageImage[]): StorageImage[] => {
  const starterById = new Map(starterImages.map((image) => [image.id, image]));

  return images.map((image) => {
    const destinationUrl = resolveStorageDestinationUrl(image);
    const starter = starterById.get(image.id);
    const next = {
      ...image,
      destinationUrl,
      imageUrl: image.imageUrl?.trim() || starter?.imageUrl || image.imageUrl,
    };

    if (
      next.destinationUrl === image.destinationUrl &&
      next.imageUrl === image.imageUrl
    ) {
      return image;
    }

    return next;
  });
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
vehicle-storage,Vehicle Storage,/media-library/storage-types/vehicle_storage.png,https://www.mygarageselfstorage.com/vehicle-storage,Vehicle storage,storage_type
climate-controlled-storage,Climate-Controlled Storage,/media-library/storage-types/climate_controlled_storage.png,https://www.mygarageselfstorage.com/climate-controlled-storage,Climate-controlled storage,storage_type`;

export const imageMarkdownTemplate = `# Storagely Media Library (import template)

| image number | image name | image URL | destination | ALT tag |
| --- | --- | --- | --- | --- |
| 1 | Vehicle Storage | /media-library/storage-types/vehicle_storage.png | https://www.mygarageselfstorage.com/vehicle-storage | Vehicle storage |
| 2 | Climate-Controlled Storage | /media-library/storage-types/climate_controlled_storage.png | https://www.mygarageselfstorage.com/climate-controlled-storage | Climate-controlled storage |
`;

const parseMarkdownTable = (markdown: string): StorageImage[] => {
  const lines = markdown.split(/\r?\n/).map((line) => line.trim());
  const tableLines = lines.filter((line) => line.startsWith("|") && !/^\|[-\s|:]+\|$/.test(line));
  if (tableLines.length < 2) return [];

  const headers = tableLines[0]
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean)
    .map((cell) => normalizeHeader(cell));
  const mappedHeaders = headers.map((header) => headerAliases[header]).filter(Boolean);

  if (!mappedHeaders.includes("category") || !mappedHeaders.includes("imageUrl")) {
    return [];
  }

  const images: StorageImage[] = [];
  tableLines.slice(1).forEach((rowLine) => {
    const cells = rowLine
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);

    const partial: Partial<StorageImage> = {};
    headers.forEach((header, index) => {
      const key = headerAliases[header];
      if (key && cells[index]) {
        (partial as Record<string, string>)[key] = cells[index];
      }
    });

    const image = normalizeImage(partial);
    if (image) images.push(image);
  });

  return images;
};

const parseMarkdownFieldBlocks = (markdown: string): StorageImage[] => {
  const blocks = markdown.split(/\n(?=\d+\.\s+)/).map((block) => block.trim()).filter(Boolean);
  const images: StorageImage[] = [];

  blocks.forEach((block) => {
    const titleMatch = block.match(/^\d+\.\s*(.+)$/m);
    const category = titleMatch?.[1]?.trim();
    if (!category) return;

    const readField = (labels: string[]): string | undefined => {
      const pattern = new RegExp(`(?:${labels.join("|")})\\s*[:\\-]\\s*(.+)$`, "im");
      return block.match(pattern)?.[1]?.trim();
    };

    const image = normalizeImage({
      id: readField(["image number", "number", "#"]),
      category,
      imageUrl: readField(["image url", "url"]),
      destinationUrl: readField(["destination", "destination url", "link"]),
      altText: readField(["alt tag", "alt", "alt text"]),
      type: readField(["type", "image type"]) as StorageImage["type"] | undefined,
    });

    if (image) images.push(image);
  });

  return images;
};

/** Parse Storagely CMS media-library markdown (table or numbered field blocks). */
export const parseImagesMarkdown = (markdown: string): { images: StorageImage[]; result: ImageImportResult } => {
  const fromTable = parseMarkdownTable(markdown);
  const fromBlocks = parseMarkdownFieldBlocks(markdown);
  const images = mergeImages([], [...fromTable, ...fromBlocks]);
  const skipped = Math.max(0, fromTable.length + fromBlocks.length - images.length);

  if (images.length === 0) {
    return {
      images: [],
      result: {
        imported: 0,
        skipped: 0,
        errors: ["No images found. Use a markdown table or numbered blocks with image name, URL, destination, and ALT."],
      },
    };
  }

  return {
    images,
    result: { imported: images.length, skipped, errors: [] },
  };
};

export const isLinkableStorageType = (category: string): boolean => LINKABLE_CATEGORIES.includes(category);
