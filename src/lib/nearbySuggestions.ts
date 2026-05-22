import { isEligibleNearbyCatalogFacility, isNearbyLocationCardImage, isWrongNearbyCardImage } from "./nearbyLocationImages";
import type { LocationProject, NearbyFacility } from "../types/storiq";

/** Storagely grid supports 3–6 nearby cards; picker shows every eligible library row. */
export const NEARBY_SELECTION_MIN = 3;
export const NEARBY_SELECTION_MAX = 6;

const isSelfFacility = (project: LocationProject, facility: NearbyFacility): boolean => {
  const pageUrl = project.locationIdentity.storagelyPageUrl.trim().toLowerCase();
  const name = project.locationIdentity.facilityName.trim().toLowerCase();
  return (
    (pageUrl.length > 0 && facility.storagelyUrl.trim().toLowerCase() === pageUrl) ||
    (name.length > 0 && facility.facilityName.trim().toLowerCase() === name)
  );
};

const scoreFacility = (project: LocationProject, facility: NearbyFacility): number => {
  let score = 0;
  const state = project.locationIdentity.state.trim().toLowerCase();
  const city = project.locationIdentity.city.trim().toLowerCase();
  const facilityState = facility.state.trim().toLowerCase();
  const facilityCity = facility.city.trim().toLowerCase();

  if (isSelfFacility(project, facility)) return -1000;
  if (!isEligibleNearbyCatalogFacility(facility)) return -500;
  if (!facility.storagelyUrl.trim()) score -= 50;

  if (state && facilityState === state) score += 40;
  if (city && facilityCity && facilityCity !== city) score += 15;
  if (city && facilityCity === city) score -= 5;

  if (isNearbyLocationCardImage(facility.imageUrl)) score += 25;

  return score;
};

export const filterEligibleNearbyFacilities = (facilities: NearbyFacility[]): NearbyFacility[] =>
  facilities.filter((f) => isEligibleNearbyCatalogFacility(f));

export const rankNearbyFacilities = (project: LocationProject, facilities: NearbyFacility[]): NearbyFacility[] =>
  filterEligibleNearbyFacilities(facilities)
    .filter((f) => !isSelfFacility(project, f))
    .sort((a, b) => scoreFacility(project, b) - scoreFacility(project, a));

export const suggestNearbyFacilityIds = (project: LocationProject, facilities: NearbyFacility[]): string[] => {
  const ranked = rankNearbyFacilities(project, facilities);
  const withNearbyImages = ranked.filter((f) => isNearbyLocationCardImage(f.imageUrl));
  const pool = withNearbyImages.length > 0 ? withNearbyImages : ranked.filter((f) => !isWrongNearbyCardImage(f.imageUrl));
  const fallback = pool.length > 0 ? pool : ranked;

  return fallback.slice(0, NEARBY_SELECTION_MAX).map((f) => f.id);
};

export const suggestNearbyFacilityNames = (project: LocationProject, facilities: NearbyFacility[]): string[] => {
  const ids = suggestNearbyFacilityIds(project, facilities);
  return ids
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is NearbyFacility => Boolean(f))
    .map((f) => `${f.city}, ${f.state}`);
};

export const canSelectMoreNearby = (selectedIds: string[]): boolean => selectedIds.length < NEARBY_SELECTION_MAX;

export const isNearbySelectionCountValid = (count: number): boolean =>
  count >= NEARBY_SELECTION_MIN && count <= NEARBY_SELECTION_MAX;

/** @deprecated Use NEARBY_SELECTION_MAX */
export const NEARBY_SELECTION_LIMIT = NEARBY_SELECTION_MAX;
