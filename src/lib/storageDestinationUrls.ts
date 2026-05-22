const SITE_ORIGIN = "https://www.mygarageselfstorage.com";

/** Approved destination paths from client final.md / media library markdown. */
export const STORAGE_DESTINATION_BY_ID: Record<string, string> = {
  "vehicle-storage": `${SITE_ORIGIN}/vehicle-storage`,
  "climate-controlled-storage": `${SITE_ORIGIN}/climate-controlled-storage`,
  "business-storage": `${SITE_ORIGIN}/business-storage`,
  "boat-storage": `${SITE_ORIGIN}/boat-storage`,
  "rv-storage": `${SITE_ORIGIN}/rv-storage`,
  "truck-storage": `${SITE_ORIGIN}/truck-storage`,
};

/** Strip legacy `/storage-types/` segment from My Garage destination URLs. */
export const normalizeStorageDestinationUrl = (url?: string): string | undefined => {
  const trimmed = url?.trim();
  if (!trimmed) {
    return undefined;
  }

  return trimmed
    .replace(/^(https?:\/\/(?:www\.)?mygarageselfstorage\.com)\/storage-types\//i, "$1/")
    .replace(/\/+$/, "");
};

export const resolveStorageDestinationUrl = (image: {
  id: string;
  category: string;
  destinationUrl?: string;
}): string | undefined => {
  const fromImage = normalizeStorageDestinationUrl(image.destinationUrl);
  if (fromImage) {
    return fromImage;
  }

  return STORAGE_DESTINATION_BY_ID[image.id];
};
