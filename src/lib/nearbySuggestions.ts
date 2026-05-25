import {
  extractFacilityLocationSlug,
  extractProjectLocationSlug,
  facilityDistanceKm,
  hasProjectOrigin,
  isWithinNearbyProximity,
  normalizeLocationKey,
  resolveProjectCoordinates,
} from "./facilityProximity";
import { isEligibleNearbyCatalogFacility, isNearbyLocationCardImage, isWrongNearbyCardImage } from "./nearbyLocationImages";
import type { LocationProject, NearbyFacility } from "../types/storiq";

/** Ideal nearby card count when enough locations are within proximity range. */
export const NEARBY_SELECTION_IDEAL = 3;

/** @deprecated Use getNearbySelectionLimits().target — kept for legacy imports. */
export const NEARBY_SELECTION_MIN = NEARBY_SELECTION_IDEAL;

/** @deprecated Use getNearbySelectionLimits().max */
export const NEARBY_SELECTION_MAX = NEARBY_SELECTION_IDEAL;

export interface NearbySelectionLimits {
  /** How many library locations are within proximity of this page. */
  availableClose: number;
  /** Auto-suggest this many (1–3 depending on what is close enough). */
  target: number;
  /** Max the user can select (same as target — never force a far-away 3rd card). */
  max: number;
}

export const isSelfNearbyFacility = (project: LocationProject, facility: NearbyFacility): boolean => {
  const pageUrl = project.locationIdentity.storagelyPageUrl.trim().toLowerCase();
  const facilityUrl = facility.storagelyUrl.trim().toLowerCase();
  const name = project.locationIdentity.facilityName.trim().toLowerCase();

  if (pageUrl.length > 0 && facilityUrl.length > 0 && pageUrl === facilityUrl) return true;
  if (name.length > 0 && facility.facilityName.trim().toLowerCase() === name) return true;

  const projectSlug = extractProjectLocationSlug(project);
  const facilitySlug = extractFacilityLocationSlug(facility);
  if (projectSlug.length > 0 && facilitySlug.length > 0 && projectSlug === facilitySlug) return true;

  const projectCity = normalizeLocationKey(project.locationIdentity.city);
  const facilityCity = normalizeLocationKey(facility.city);
  if (projectCity.length > 0 && projectCity === facilityCity) return true;

  return false;
};

export const filterEligibleNearbyFacilities = (facilities: NearbyFacility[]): NearbyFacility[] =>
  facilities.filter((f) => isEligibleNearbyCatalogFacility(f));

export const canSelectNearbyFacility = (project: LocationProject, facility: NearbyFacility): boolean => {
  if (isSelfNearbyFacility(project, facility)) return false;
  if (!hasProjectOrigin(project)) return false;
  return isWithinNearbyProximity(project, facility);
};

export const rankNearbyFacilities = (project: LocationProject, facilities: NearbyFacility[]): NearbyFacility[] => {
  const eligible = filterEligibleNearbyFacilities(facilities).filter((f) => !isSelfNearbyFacility(project, f));
  const origin = resolveProjectCoordinates(project);

  return eligible.sort((a, b) => {
    if (origin) {
      const inRangeA = isWithinNearbyProximity(project, a);
      const inRangeB = isWithinNearbyProximity(project, b);
      if (inRangeA !== inRangeB) return inRangeA ? -1 : 1;

      const distA = facilityDistanceKm(project, a);
      const distB = facilityDistanceKm(project, b);
      if (distA !== null && distB !== null && distA !== distB) return distA - distB;
      if (distA !== null && distB === null) return -1;
      if (distA === null && distB !== null) return 1;
    }

    return a.city.localeCompare(b.city);
  });
};

export const proximityEligibleFacilities = (project: LocationProject, facilities: NearbyFacility[]): NearbyFacility[] =>
  rankNearbyFacilities(project, facilities).filter((facility) => canSelectNearbyFacility(project, facility));

export const getNearbySelectionLimits = (project: LocationProject, facilities: NearbyFacility[]): NearbySelectionLimits => {
  const availableClose = proximityEligibleFacilities(project, facilities).length;
  const target = Math.min(NEARBY_SELECTION_IDEAL, availableClose);
  return { availableClose, target, max: target };
};

/** Shown in Launch Readiness and export checks as the general nearby rule. */
export const NEARBY_SELECTION_RANGE_LABEL = "1–3 nearby locations";

export const formatNearbySelectionRequirement = (limits: NearbySelectionLimits): string => {
  if (limits.target === 0) return NEARBY_SELECTION_RANGE_LABEL;
  if (limits.target === 1) return "1 nearby location (only 1 is close enough)";
  if (limits.target === 2) return "1–2 nearby locations (only 2 are close enough)";
  return NEARBY_SELECTION_RANGE_LABEL;
};

export const suggestNearbyFacilityIds = (project: LocationProject, facilities: NearbyFacility[]): string[] => {
  if (!hasProjectOrigin(project)) return [];

  const { target } = getNearbySelectionLimits(project, facilities);
  if (target === 0) return [];

  const ranked = proximityEligibleFacilities(project, facilities);
  const withNearbyImages = ranked.filter((f) => isNearbyLocationCardImage(f.imageUrl));
  const pool = withNearbyImages.length > 0 ? withNearbyImages : ranked.filter((f) => !isWrongNearbyCardImage(f.imageUrl));

  return pool.slice(0, target).map((f) => f.id);
};

export const suggestNearbyFacilityNames = (project: LocationProject, facilities: NearbyFacility[]): string[] => {
  const ids = suggestNearbyFacilityIds(project, facilities);
  return ids
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is NearbyFacility => Boolean(f))
    .map((f) => `${f.city}, ${f.state}`);
};

export const selectedNearbyOutsideProximity = (
  project: LocationProject,
  facilities: NearbyFacility[],
  selectedIds: string[],
): NearbyFacility[] =>
  selectedIds
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is NearbyFacility => Boolean(f))
    .filter((facility) => !canSelectNearbyFacility(project, facility));

export const canSelectMoreNearby = (
  selectedIds: string[],
  project: LocationProject,
  facilities: NearbyFacility[],
): boolean => selectedIds.length < getNearbySelectionLimits(project, facilities).max;

export const isNearbySelectionCountValid = (
  count: number,
  project: LocationProject,
  facilities: NearbyFacility[],
): boolean => {
  const { max, availableClose } = getNearbySelectionLimits(project, facilities);
  if (availableClose === 0) return count === 0;
  return count >= 1 && count <= max;
};

/** @deprecated Use getNearbySelectionLimits().max */
export const NEARBY_SELECTION_LIMIT = NEARBY_SELECTION_IDEAL;

export const filterNearbyFacilities = (
  project: LocationProject,
  facilities: NearbyFacility[],
  query: string,
): NearbyFacility[] => {
  const ranked = rankNearbyFacilities(project, facilities);
  const needle = query.trim().toLowerCase();
  if (!needle) return ranked;

  return ranked.filter((facility) => {
    const haystack = [facility.facilityName, facility.city, facility.state, facility.address, facility.zipCode, facility.storagelyUrl]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
};

export const nearbyLocationAnchor = (project: LocationProject): string =>
  [
    project.locationIdentity.storagelyPageUrl.trim().toLowerCase(),
    project.locationIdentity.city.trim().toLowerCase(),
    project.locationIdentity.state.trim().toLowerCase(),
  ].join("|");

export const selectionsMatch = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((id, index) => id === right[index]);

export { facilityDistanceMiles, hasProjectOrigin, isWithinNearbyProximity } from "./facilityProximity";
export { NEARBY_PROXIMITY_MAX_MILES } from "./facilityProximity";
