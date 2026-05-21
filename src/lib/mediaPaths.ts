/** Local paths under `public/media-library/` (served from site root). */
const STORAGE_TYPES = "/media-library/storage-types";
const FACILITY_LOCATIONS = "/media-library/facility-locations";
const NEARBY_LOCATIONS = "/media-library/nearby-locations";

export const storageTypeImage = (filename: string): string => `${STORAGE_TYPES}/${filename}`;

export const facilityLocationImage = (filename: string): string => `${FACILITY_LOCATIONS}/${filename}`;

export const nearbyLocationImage = (filename: string): string => `${NEARBY_LOCATIONS}/${filename}`;

/** @deprecated Use `nearbyLocationImage` — folder renamed to `nearby-locations`. */
export const nearbyFacilityImage = nearbyLocationImage;
