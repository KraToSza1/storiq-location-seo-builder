import { extractStoragelyTexasPath } from "./facilityRegistry";
import type { LocationProject, NearbyFacility } from "../types/storiq";

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** Max driving distance for a card to count as a valid nearby location pick. */
export const NEARBY_PROXIMITY_MAX_MILES = 75;

/** Approximate city / location centroids for My Garage Texas facilities. */
const LOCATION_COORDS: Record<string, GeoPoint> = {
  beaumont: { lat: 30.0802, lng: -94.1266 },
  belton: { lat: 31.056, lng: -97.4645 },
  bullard: { lat: 32.1399, lng: -95.3752 },
  "copperas-cove": { lat: 31.1241, lng: -97.9031 },
  corsicana: { lat: 32.0954, lng: -96.4689 },
  "corsicana-584": { lat: 32.098, lng: -96.475 },
  "corsicana-north-45": { lat: 32.12, lng: -96.48 },
  "el-paso": { lat: 31.7619, lng: -106.485 },
  mcclintock: { lat: 31.79, lng: -106.52 },
  remcon: { lat: 31.85, lng: -106.55 },
  flint: { lat: 32.2049, lng: -95.3488 },
  hockley: { lat: 30.0544, lng: -95.8566 },
  "katy-hockley": { lat: 29.9, lng: -95.9 },
  "becker-road": { lat: 30.05, lng: -95.87 },
  killeen: { lat: 31.1171, lng: -97.7278 },
  kountze: { lat: 30.3716, lng: -94.3124 },
  "kountze-south": { lat: 30.36, lng: -94.3 },
  "barrows-drive": { lat: 30.37, lng: -94.32 },
  mexia: { lat: 31.6799, lng: -96.4822 },
  midlothian: { lat: 32.4824, lng: -96.9945 },
  "morgans-point-resort": { lat: 31.1485, lng: -97.4545 },
  orange: { lat: 30.093, lng: -93.7366 },
  "strickland-drive": { lat: 30.12, lng: -93.75 },
  "ih-10-west": { lat: 30.08, lng: -93.8 },
  pearland: { lat: 29.5636, lng: -95.286 },
  "old-massey-ranch-road": { lat: 29.55, lng: -95.28 },
  "royse-city": { lat: 32.9751, lng: -96.3325 },
  rusk: { lat: 31.796, lng: -95.1502 },
  "west-6th-street": { lat: 31.8, lng: -95.14 },
  "loop-343": { lat: 31.8, lng: -95.15 },
  temple: { lat: 31.0982, lng: -97.3428 },
  "temple-south-31": { lat: 31.05, lng: -97.36 },
  tyler: { lat: 32.3513, lng: -95.3011 },
};

export const normalizeLocationKey = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const extractFacilityLocationSlug = (facility: NearbyFacility): string => {
  const fromUrl = extractStoragelyTexasPath(facility.storagelyUrl);
  if (fromUrl) {
    return fromUrl;
  }
  return normalizeLocationKey(facility.city);
};

const lookupCoordinates = (key: string): GeoPoint | undefined => {
  if (!key) return undefined;
  if (LOCATION_COORDS[key]) return LOCATION_COORDS[key];

  const cityKey = key.split("/")[0];
  if (cityKey && LOCATION_COORDS[cityKey]) return LOCATION_COORDS[cityKey];

  const prefix = Object.keys(LOCATION_COORDS).find((candidate) => key.startsWith(candidate) || candidate.startsWith(key));
  return prefix ? LOCATION_COORDS[prefix] : undefined;
};

export const extractProjectLocationSlug = (project: LocationProject): string => {
  const fromUrl = extractStoragelyTexasPath(project.locationIdentity.storagelyPageUrl);
  if (fromUrl) {
    return fromUrl;
  }
  return normalizeLocationKey(project.locationIdentity.city);
};

export const resolveProjectPlaceLabel = (project: LocationProject): string => {
  const city = project.locationIdentity.city.trim();
  const state = project.locationIdentity.state.trim();
  if (city && state) return `${city}, ${state}`;
  if (city) return city;

  const slug = extractProjectLocationSlug(project);
  if (!slug) return "this facility";

  const label = slug
    .split("-")
    .map((part) => (part.length <= 2 ? part.toUpperCase() : `${part.charAt(0).toUpperCase()}${part.slice(1)}`))
    .join(" ");

  return state ? `${label}, ${state}` : label;
};

export const resolveProjectCoordinates = (project: LocationProject): GeoPoint | null => {
  const urlSlug = extractProjectLocationSlug(project);
  const fromUrl = lookupCoordinates(urlSlug);
  if (fromUrl) return fromUrl;

  const cityKey = normalizeLocationKey(project.locationIdentity.city);
  return lookupCoordinates(cityKey) ?? null;
};

export const resolveFacilityCoordinates = (facility: NearbyFacility): GeoPoint | null => {
  const slug = extractFacilityLocationSlug(facility);
  return lookupCoordinates(slug) ?? lookupCoordinates(normalizeLocationKey(facility.city)) ?? null;
};

const toRadians = (value: number): number => (value * Math.PI) / 180;

export const distanceKm = (from: GeoPoint, to: GeoPoint): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLng = toRadians(to.lng - from.lng);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const facilityDistanceKm = (project: LocationProject, facility: NearbyFacility): number | null => {
  const origin = resolveProjectCoordinates(project);
  const target = resolveFacilityCoordinates(facility);
  if (!origin || !target) return null;
  return distanceKm(origin, target);
};

export const facilityDistanceMiles = (project: LocationProject, facility: NearbyFacility): number | null => {
  const km = facilityDistanceKm(project, facility);
  return km === null ? null : km * 0.621371;
};

export const hasProjectOrigin = (project: LocationProject): boolean => resolveProjectCoordinates(project) !== null;

export const isWithinNearbyProximity = (
  project: LocationProject,
  facility: NearbyFacility,
  maxMiles = NEARBY_PROXIMITY_MAX_MILES,
): boolean => {
  const miles = facilityDistanceMiles(project, facility);
  return miles !== null && miles <= maxMiles;
};
