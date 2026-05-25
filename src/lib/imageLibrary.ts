import { createId } from "./projectDefaults";
import {
  catalogByCode,
  catalogById,
  LEGACY_NON_CLIMATE_STORAGE_ID,
  normalizeCatalogCategory,
  resolveCatalogIdFromCode,
} from "./imageLibraryCatalog";
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

/** Fix legacy `/storage-types/` destination URLs and sync approved client catalog rows. */
export const migrateImageLibrary = (images: StorageImage[]): StorageImage[] => {
  const starterById = catalogById();

  const upgraded = images.map((image) => {
    const normalizedId = image.id === LEGACY_NON_CLIMATE_STORAGE_ID ? "drive-up-storage" : image.id;
    const catalog = starterById.get(normalizedId);
    const destinationUrl = resolveStorageDestinationUrl({
      id: normalizedId,
      category: catalog?.category ?? image.category,
      destinationUrl: catalog?.destinationUrl ?? image.destinationUrl,
    });

    const next: StorageImage = {
      ...image,
      id: normalizedId,
      category: catalog?.category ?? image.category,
      imageUrl: catalog?.imageUrl ?? image.imageUrl?.trim() ?? "",
      destinationUrl,
      altText: catalog?.altText ?? image.altText,
      type: catalog?.type ?? image.type,
    };

    if (
      next.id === image.id &&
      next.category === image.category &&
      next.imageUrl === image.imageUrl &&
      next.destinationUrl === image.destinationUrl &&
      next.altText === image.altText &&
      next.type === image.type
    ) {
      return image;
    }

    return next;
  });

  const byId = new Map<string, StorageImage>();
  upgraded.forEach((image) => byId.set(image.id, image));
  starterImages.forEach((starter) => {
    if (!byId.has(starter.id)) {
      byId.set(starter.id, starter);
    }
  });

  return [...byId.values()].sort((a, b) => a.category.localeCompare(b.category));
};

export const migrateSelectedStorageImageIds = (selectedIds: string[]): string[] =>
  selectedIds.map((id) => (id === LEGACY_NON_CLIMATE_STORAGE_ID ? "drive-up-storage" : id));

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
vehicle-storage,Vehicle Storage,https://cloud-1de12d.becdn.net/media/original/eaf7976243a0b9d092650645480c34ca.png,https://www.mygarageselfstorage.com/vehicle-storage,vehicle storage,storage_type
drive-up-storage,Drive-Up Storage,https://cloud-1de12d.becdn.net/media/original/43c5cff2f285834c33a4fb8631dd9a41.png,,drive up storage,storage_type
container-storage,Container Storage,https://cloud-1de12d.becdn.net/media/original/ef42608a67e2df92d828edbaef349622.png,,container storage,storage_type
warehouse-storage,Warehouse Storage,https://cloud-1de12d.becdn.net/media/original/4516ea8899596aec67c9401d635f323c.png,,warehouse storage,storage_type`;

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

const parseMarkdownImgBlocks = (markdown: string): StorageImage[] => {
  const blocks = markdown.split(/\n(?=##\s+IMG-\d+)/i).map((block) => block.trim()).filter(Boolean);
  const byCode = catalogByCode();
  const images: StorageImage[] = [];

  blocks.forEach((block) => {
    const codeMatch = block.match(/^##\s+(IMG-\d+)/i);
    const code = codeMatch?.[1]?.toUpperCase();
    if (!code) {
      return;
    }

    const readField = (label: string): string | undefined => {
      const pattern = new RegExp(`^-\\s*${label}\\s*:\\s*(.+)$`, "im");
      return block.match(pattern)?.[1]?.trim();
    };

    const categoryRaw = readField("Category");
    const imageUrl = readField("Image URL");
    if (!categoryRaw || !imageUrl) {
      return;
    }

    const destinationRaw = readField("Destination URL");
    const catalog = byCode.get(code);
    const id = resolveCatalogIdFromCode(code) ?? catalog?.id ?? slug(categoryRaw) ?? createId();

    const image = normalizeImage({
      id,
      category: normalizeCatalogCategory(categoryRaw),
      imageUrl,
      destinationUrl: destinationRaw || catalog?.destinationUrl,
      altText: readField("Alt Text") ?? catalog?.altText,
      type: catalog?.type ?? "storage_type",
    });

    if (image) {
      images.push(image);
    }
  });

  return images;
};

/** Parse Storagely CMS media-library markdown (table, numbered blocks, or ## IMG-001 blocks). */
export const parseImagesMarkdown = (markdown: string): { images: StorageImage[]; result: ImageImportResult } => {
  const fromTable = parseMarkdownTable(markdown);
  const fromBlocks = parseMarkdownFieldBlocks(markdown);
  const fromImgBlocks = parseMarkdownImgBlocks(markdown);
  const images = mergeImages([], [...fromTable, ...fromBlocks, ...fromImgBlocks]);
  const skipped = Math.max(0, fromTable.length + fromBlocks.length + fromImgBlocks.length - images.length);

  if (images.length === 0) {
    return {
      images: [],
      result: {
        imported: 0,
        skipped: 0,
        errors: ["No images found. Use a markdown table, numbered blocks, or ## IMG-001 field blocks."],
      },
    };
  }

  return {
    images,
    result: { imported: images.length, skipped, errors: [] },
  };
};

export const isLinkableStorageType = (category: string): boolean => LINKABLE_CATEGORIES.includes(category);
