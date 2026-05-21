import { NEARBY_LOCATION_FILENAMES, resolveNearbyLocationImageUrl } from "./nearbyLocationImages";
import { sampleFacilities } from "./sampleFacilities";
import type { NearbyFacility, StorageImage } from "../types/storiq";

export type HealthIssue = {
  id: string;
  severity: "info" | "warning" | "error";
  label: string;
  message: string;
};

const isSampleFacility = (facility: NearbyFacility): boolean =>
  sampleFacilities.some((sample) => sample.id === facility.id);

export const runMasterDataHealthCheck = (facilities: NearbyFacility[], images: StorageImage[]): HealthIssue[] => {
  const issues: HealthIssue[] = [];

  if (facilities.length === 0) {
    issues.push({
      id: "no-facilities",
      severity: "error",
      label: "Facility library empty",
      message: "Import a facilities CSV before building location pages.",
    });
  }

  const missingUrl = facilities.filter((f) => !f.storagelyUrl.trim());
  if (missingUrl.length > 0) {
    issues.push({
      id: "missing-url",
      severity: "error",
      label: "Missing Storagely URLs",
      message: `${missingUrl.length} facility(ies) have no Storagely page URL.`,
    });
  }

  const missingImage = facilities.filter((f) => !f.imageUrl?.trim());
  if (missingImage.length > 0) {
    issues.push({
      id: "missing-image",
      severity: "warning",
      label: "Missing facility images",
      message: `${missingImage.length} facility(ies) have no image URL for nearby cards.`,
    });
  }

  const legacyPaths = facilities.filter(
    (f) => f.imageUrl?.includes("/nearby-facilities/") || f.imageUrl?.includes("/storage-types/"),
  );
  if (legacyPaths.length > 0) {
    issues.push({
      id: "legacy-paths",
      severity: "warning",
      label: "Legacy image paths",
      message: `${legacyPaths.length} facility image URL(s) use old folders — reload or reset facilities to auto-fix.`,
    });
  }

  const urlDupes = new Map<string, string[]>();
  facilities.forEach((f) => {
    const key = f.storagelyUrl.trim().toLowerCase();
    if (!key) return;
    const list = urlDupes.get(key) ?? [];
    list.push(f.facilityName);
    urlDupes.set(key, list);
  });
  const duplicateUrls = [...urlDupes.entries()].filter(([, names]) => names.length > 1);
  if (duplicateUrls.length > 0) {
    issues.push({
      id: "duplicate-url",
      severity: "error",
      label: "Duplicate Storagely URLs",
      message: `${duplicateUrls.length} URL(s) are used by more than one facility.`,
    });
  }

  const noMatchImage = facilities.filter((f) => f.city.trim() && !f.imageUrl?.trim() && !resolveNearbyLocationImageUrl(f));
  if (noMatchImage.length > 0) {
    issues.push({
      id: "no-nearby-file",
      severity: "info",
      label: "No auto-match image file",
      message: `${noMatchImage.length} city(ies) have no matching file in nearby-locations/ (${NEARBY_LOCATION_FILENAMES.length} files available).`,
    });
  }

  const sampleCount = facilities.filter(isSampleFacility).length;
  if (sampleCount === facilities.length && facilities.length > 0) {
    issues.push({
      id: "sample-only",
      severity: "warning",
      label: "Sample data only",
      message: "Facility library still uses starter sample data — import your real CSV before client work.",
    });
  }

  if (images.length === 0) {
    issues.push({
      id: "no-images",
      severity: "error",
      label: "Image library empty",
      message: "Import storage type images before Step 4 of the wizard.",
    });
  }

  const storageTypes = images.filter((i) => i.type === "storage_type");
  if (storageTypes.length < 3) {
    issues.push({
      id: "few-storage-types",
      severity: "warning",
      label: "Few storage types",
      message: `Only ${storageTypes.length} storage type image(s) in library — most locations need 3–6 cards.`,
    });
  }

  const remoteImages = images.filter((i) => /unsplash\.com|example\.com/i.test(i.imageUrl));
  if (remoteImages.length > 0) {
    issues.push({
      id: "remote-images",
      severity: "warning",
      label: "Remote demo image URLs",
      message: `${remoteImages.length} image(s) still point at demo/remote URLs.`,
    });
  }

  return issues;
};
