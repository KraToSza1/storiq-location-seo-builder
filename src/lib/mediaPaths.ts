/** Local paths under `public/media-library/` (served from site root). */
const STORAGE_TYPES = "/media-library/storage-types";
const FACILITY_LOCATIONS = "/media-library/facility-locations";
const NEARBY_FACILITIES = "/media-library/nearby-facilities";

export const storageTypeImage = (filename: string): string => `${STORAGE_TYPES}/${filename}`;

export const facilityLocationImage = (filename: string): string => `${FACILITY_LOCATIONS}/${filename}`;

export const nearbyFacilityImage = (filename: string): string => `${NEARBY_FACILITIES}/${filename}`;
