import { buildGoogleMapsIframeMarkup, resolveMapDisplayType } from "./googleMapsEmbed";
import { parseGoogleMapsIframe } from "./validators";
import { extractStoragelyUrlsFromContent } from "./contentExtraction";
import { getStorageImageById } from "./imageLibrary";
import { getNearbySelectionLimits, suggestNearbyFacilityIds } from "./nearbySuggestions";
import type { LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const normalizeCategory = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]+/g, " ");

export const matchStorageImageIds = (storageTypeLabels: string[], images: StorageImage[]): string[] => {
  const storageImages = images.filter((i) => i.type === "storage_type");
  const matched: string[] = [];

  storageTypeLabels.forEach((label) => {
    const needle = normalizeCategory(label);
    const found = storageImages.find((image) => {
      const hay = normalizeCategory(image.category);
      return hay.includes(needle) || needle.includes(hay);
    });
    if (found && !matched.includes(found.id)) {
      matched.push(found.id);
    }
  });

  return matched;
};

export const matchNearbyIdsFromContent = (
  rawContent: string,
  facilities: NearbyFacility[],
  project: LocationProject,
): string[] => {
  const urls = extractStoragelyUrlsFromContent(rawContent);
  const matched = urls
    .map((url) => facilities.find((f) => f.storagelyUrl.trim().toLowerCase() === url.toLowerCase()))
    .filter((f): f is NearbyFacility => Boolean(f))
    .map((f) => f.id);

  const limits = getNearbySelectionLimits(project, facilities);
  const unique = [...new Set(matched)].slice(0, limits.target);
  if (unique.length >= limits.target || limits.target === 0) return unique;

  const suggested = suggestNearbyFacilityIds(project, facilities);
  suggested.forEach((id) => {
    if (!unique.includes(id) && unique.length < limits.target) unique.push(id);
  });

  return unique;
};

export const enhanceProjectFromLibraries = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): LocationProject => {
  let next = { ...project };

  if (!next.googleMaps.iframeCode.trim() && next.existingContent.address.trim()) {
    const mapType = resolveMapDisplayType(next.googleMaps.mapType);
    const iframeCode = buildGoogleMapsIframeMarkup(
      next.existingContent.address,
      next.locationIdentity.facilityName || "Facility map",
      mapType,
    );
    const parsed = parseGoogleMapsIframe(iframeCode);
    next = {
      ...next,
      googleMaps: {
        iframeCode,
        detectedSrc: parsed.detectedSrc,
        isValid: parsed.isValid,
        mapType,
      },
    };
  }

  if (next.selectedStorageImages.length === 0 && next.existingContent.storageTypes.length > 0) {
    const ids = matchStorageImageIds(next.existingContent.storageTypes, images);
    if (ids.length > 0) {
      next = { ...next, selectedStorageImages: ids };
    }
  }

  if (next.selectedNearbyLocations.length === 0) {
    const fromContent = matchNearbyIdsFromContent(next.existingContent.rawContent, facilities, next);
    const nearbyIds = fromContent.length > 0 ? fromContent : suggestNearbyFacilityIds(next, facilities);
    if (nearbyIds.length > 0) {
      next = { ...next, selectedNearbyLocations: nearbyIds };
    }
  }

  return next;
};

export const getFacilityLocationHeroImage = (project: LocationProject, images: StorageImage[]): string | undefined => {
  const heroId = project.selectedFacilityLocationImages[0];
  if (!heroId) return undefined;
  return getStorageImageById(images, heroId)?.imageUrl;
};
