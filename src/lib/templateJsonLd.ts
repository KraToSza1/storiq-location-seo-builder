import { DEFAULT_PUBLISH_ASSET_BASE, toAbsoluteMediaUrl } from "./assetUrls";
import { defaultFacilities } from "./facilityLibrary";
import { defaultImages, getStorageImageById } from "./imageLibrary";
import { formatFacilityNameWithMark } from "./myGarageGenerationSpec";
import type { LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

export interface MapGeoCoordinates {
  latitude: number;
  longitude: number;
}

/** Parse lat/lng from Google Maps embed `pb=` (!3d = latitude, !2d = longitude). */
export const parseGeoFromMapEmbed = (iframeCode: string): MapGeoCoordinates | undefined => {
  const latitude = iframeCode.match(/!3d(-?\d+(?:\.\d+)?)/i)?.[1];
  const longitude = iframeCode.match(/!2d(-?\d+(?:\.\d+)?)/i)?.[1];
  if (!latitude || !longitude) {
    return undefined;
  }
  return { latitude: Number(latitude), longitude: Number(longitude) };
};

const e164Phone = (phone: string): string | undefined => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length === 10) return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return digits.startsWith("1") ? `+${digits}` : `+1${digits}`;
};

const parseStreetFromAddress = (address: string): string => address.split(",")[0]?.trim() || address.trim();

const representativeFacilityImage = (
  project: LocationProject,
  images: StorageImage[],
  publishAssetBaseUrl: string,
): string | undefined => {
  const facilityImageId = project.selectedFacilityLocationImages[0];
  const facilityImage = facilityImageId ? getStorageImageById(images, facilityImageId) : undefined;
  const locationTypeImage = images.find(
    (img) => img.type === "facility_location" && img.destinationUrl?.trim() === project.locationIdentity.storagelyPageUrl.trim(),
  );
  const url = facilityImage?.imageUrl || locationTypeImage?.imageUrl;
  return url ? toAbsoluteMediaUrl(url, publishAssetBaseUrl) : undefined;
};

export const renderSelfStorageJsonLd = (
  project: LocationProject,
  facilities: NearbyFacility[] = defaultFacilities,
  images: StorageImage[] = defaultImages,
  publishAssetBaseUrl: string = DEFAULT_PUBLISH_ASSET_BASE,
): string => {
  const { city, state, zipCode, facilityName, storagelyPageUrl } = project.locationIdentity;
  const geo = parseGeoFromMapEmbed(project.googleMaps.iframeCode);
  const phone = e164Phone(project.existingContent.phone);
  const image = representativeFacilityImage(project, images, publishAssetBaseUrl);
  const nearbyPlaces = project.selectedNearbyLocations
    .map((id) => facilities.find((facility) => facility.id === id))
    .filter((facility): facility is NearbyFacility => Boolean(facility))
    .map((facility) => `${facility.city}, ${facility.state}`.trim());

  const areaServedNames = Array.from(
    new Set([`${city}, ${state}`.trim(), ...nearbyPlaces].filter((name) => name.length > 3)),
  );

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SelfStorage",
    name: formatFacilityNameWithMark(facilityName).replace(/®/g, "").trim() || `My Garage Self Storage | ${parseStreetFromAddress(project.existingContent.address)}`,
    url: storagelyPageUrl.trim() || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: parseStreetFromAddress(project.existingContent.address),
      addressLocality: city,
      addressRegion: state,
      postalCode: zipCode,
      addressCountry: "US",
    },
    areaServed: areaServedNames.map((name) => ({ "@type": "City", name })),
  };

  if (image) {
    jsonLd.image = image;
  }
  if (phone) {
    jsonLd.telephone = phone;
  }
  if (geo) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }
  if (project.existingContent.accessHours.trim()) {
    jsonLd.openingHoursSpecification = [
      {
        "@type": "OpeningHoursSpecification",
        description: project.existingContent.accessHours.trim(),
      },
    ];
  }

  return JSON.stringify(jsonLd, null, 2);
};
