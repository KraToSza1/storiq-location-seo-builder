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

/** Link only when the image library record has a non-empty destination_url (never pattern-invent). */
export const resolveStorageDestinationUrl = (image: {
  id: string;
  category: string;
  destinationUrl?: string;
}): string | undefined => normalizeStorageDestinationUrl(image.destinationUrl);
