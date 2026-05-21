import { resolveNearbyLocationImageUrl } from "./nearbyLocationImages";
import type { LocationProject, NearbyFacility } from "../types/storiq";

const NEARBY_LIMIT = 3;

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
  if (!facility.storagelyUrl.trim()) score -= 50;
  if (!facility.imageUrl?.trim()) score -= 10;
  else if (!facility.imageUrl.includes("/storage-types/")) score += 5;

  if (state && facilityState === state) score += 40;
  if (city && facilityCity && facilityCity !== city) score += 15;
  if (city && facilityCity === city) score -= 5;

  if (resolveNearbyLocationImageUrl(facility)) score += 8;

  return score;
};

export const rankNearbyFacilities = (project: LocationProject, facilities: NearbyFacility[]): NearbyFacility[] =>
  [...facilities]
    .filter((f) => !isSelfFacility(project, f))
    .sort((a, b) => scoreFacility(project, b) - scoreFacility(project, a));

export const suggestNearbyFacilityIds = (project: LocationProject, facilities: NearbyFacility[]): string[] =>
  rankNearbyFacilities(project, facilities)
    .slice(0, NEARBY_LIMIT)
    .map((f) => f.id);

export const canSelectMoreNearby = (selectedIds: string[]): boolean => selectedIds.length < NEARBY_LIMIT;

export const NEARBY_SELECTION_LIMIT = NEARBY_LIMIT;
