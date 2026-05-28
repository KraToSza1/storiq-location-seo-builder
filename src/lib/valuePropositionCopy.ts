import { shortFacilityLabel } from "./facilityCopy";
import { facilityOffersClimateControlled, facilityOffersVehicleStorage } from "./storageTypeFidelity";
import type { LocationProject, StorageImage } from "../types/storiq";

const cityState = (project: LocationProject): string =>
  [project.locationIdentity.city, project.locationIdentity.state].filter(Boolean).join(", ") || "the local area";

/** Build "Feature: benefit copy" bullets for Section 2 export (matches client final.md). */
export const describeFeatureBenefit = (feature: string, project: LocationProject, images?: StorageImage[]): string => {
  const place = cityState(project);
  const facility = shortFacilityLabel(project.locationIdentity.facilityName, project.locationIdentity.city);
  const normalized = feature.toLowerCase();

  if (normalized.includes("climate") && (!images || facilityOffersClimateControlled(project, images))) {
    return `Protect temperature-sensitive belongings from extreme heat and humidity with climate-controlled storage in ${place}.`;
  }
  if (normalized.includes("gate") || normalized.includes("24/7") || normalized.includes("24 hour")) {
    return `Secure code gate entry makes it easy to reach your unit whenever your schedule allows, day or night.`;
  }
  if (
    (normalized.includes("vehicle") || normalized.includes("parking")) &&
    (!images || facilityOffersVehicleStorage(project, images))
  ) {
    return `Spacious parking and drive-up access at ${facility} help when your garage, driveway, or lot is full.`;
  }
  if (normalized.includes("drive-up") || normalized.includes("drive up")) {
    return `Pull up directly to your unit for easier loading and unloading of furniture, boxes, and bulky items.`;
  }
  if (normalized.includes("fence") || normalized.includes("security")) {
    return `A fully fenced perimeter and secure access controls help keep your belongings protected at ${facility}.`;
  }
  if (normalized.includes("month-to-month") || normalized.includes("month to month")) {
    return `Flexible month-to-month rentals give ${place} customers storage without long-term lease commitments.`;
  }
  if (normalized.includes("moving")) {
    return `Boxes, locks, and moving supplies available on-site help simplify move-in day at ${facility}.`;
  }
  if (normalized.includes("military")) {
    return `Active-duty and veteran customers can take advantage of military-friendly storage options in ${place}.`;
  }
  if (normalized.includes("smart")) {
    return `Select units include smart storage technology with alerts designed to add peace of mind while you store.`;
  }
  if (normalized.includes("online")) {
    return `Browse, reserve, and manage your storage online for a faster, more convenient rental experience.`;
  }

  return `${feature} adds practical value for households and businesses comparing storage options in ${place}.`;
};

export const formatValueBullet = (feature: string, project: LocationProject, images?: StorageImage[]): string => {
  const trimmed = feature.trim();
  if (!trimmed) {
    return trimmed;
  }

  const colonIndex = trimmed.indexOf(":");
  if (colonIndex > 0) {
    return trimmed;
  }

  const label = trimmed.endsWith(":") ? trimmed : `${trimmed}:`;
  return `${label} ${describeFeatureBenefit(trimmed.replace(/:$/, ""), project, images)}`;
};
