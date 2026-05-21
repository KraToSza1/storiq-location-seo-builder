import { nearbyLocationImage } from "./mediaPaths";
import type { NearbyFacility } from "../types/storiq";

/** Filenames in `public/media-library/nearby-locations/` (paste new files here). */
export const NEARBY_LOCATION_FILENAMES = [
  "self-storage-units-in-barrows-drive.webp",
  "self-storage-units-in-beaumont.jpg",
  "self-storage-units-in-belton.jpg",
  "self-storage-units-in-bullard.webp",
  "self-storage-units-in-copperas-cove.webp",
  "self-storage-units-in-corsicana-584.webp",
  "self-storage-units-in-corsicana.webp",
  "self-storage-units-in-el-paso.webp",
  "self-storage-units-in-flint.webp",
  "self-storage-units-in-hockley.webp",
  "self-storage-units-in-katy-hockley.webp",
  "self-storage-units-in-killeen.webp",
  "self-storage-units-in-kountze-south.webp",
  "self-storage-units-in-mcclintock.webp",
  "self-storage-units-in-mexia.webp",
  "self-storage-units-in-midlothian.webp",
  "self-storage-units-in-morgans-point-resort.webp",
  "self-storage-units-in-old-massey-ranch-road.webp",
  "self-storage-units-in-orange.webp",
  "self-storage-units-in-royse-city.webp",
  "self-storage-units-in-rusk.webp",
  "self-storage-units-in-strickland-drive.webp",
  "self-storage-units-in-temple-south-31.webp",
  "self-storage-units-in-temple.webp",
  "self-storage-units-in-tyler.webp",
  "self-storage-units-in-west-6th-street.webp",
  "self-storage-in-corsicana-north-45.webp",
] as const;

const citySlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const locationSlugFromFilename = (filename: string): string =>
  filename
    .replace(/^self-storage(-units)?-in-/, "")
    .replace(/\.(webp|jpg|jpeg|png)$/i, "");

export const resolveNearbyLocationImageUrl = (
  input: Pick<NearbyFacility, "city" | "facilityName" | "address">,
): string | undefined => {
  const city = citySlug(input.city);
  const context = `${input.facilityName ?? ""} ${input.address ?? ""}`.toLowerCase();

  if (city === "temple" || context.includes("temple")) {
    if (/south|loop\s*363|\b31\b/.test(context)) {
      const south = NEARBY_LOCATION_FILENAMES.find((f) => f.includes("temple-south-31"));
      if (south) return nearbyLocationImage(south);
    }
    const main = NEARBY_LOCATION_FILENAMES.find((f) => f === "self-storage-units-in-temple.webp");
    if (main) return nearbyLocationImage(main);
  }

  const exactCandidates = [
    `self-storage-units-in-${city}.webp`,
    `self-storage-units-in-${city}.jpg`,
    `self-storage-in-${city}.webp`,
  ];
  for (const candidate of exactCandidates) {
    if ((NEARBY_LOCATION_FILENAMES as readonly string[]).includes(candidate)) {
      return nearbyLocationImage(candidate);
    }
  }

  const byCityPrefix = NEARBY_LOCATION_FILENAMES.find((filename) => {
    const loc = locationSlugFromFilename(filename);
    return loc === city || loc.startsWith(`${city}-`) || city.startsWith(loc);
  });
  if (byCityPrefix) return nearbyLocationImage(byCityPrefix);

  return undefined;
};

export const shouldAutoAssignNearbyImage = (url?: string): boolean =>
  !url || url.includes("/nearby-facilities/") || url.includes("/storage-types/");

export const upgradeFacilityImageUrl = (facility: NearbyFacility): NearbyFacility => {
  let imageUrl = facility.imageUrl;

  if (imageUrl?.includes("/nearby-facilities/")) {
    const filename = imageUrl.split("/").filter(Boolean).pop();
    if (filename) {
      imageUrl = nearbyLocationImage(filename);
    }
  }

  if (shouldAutoAssignNearbyImage(imageUrl)) {
    const resolved = resolveNearbyLocationImageUrl(facility);
    if (resolved) {
      imageUrl = resolved;
    }
  }

  return imageUrl === facility.imageUrl ? facility : { ...facility, imageUrl };
};
