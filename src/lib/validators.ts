import {
  mapEmbedValidationMessage,
  normalizeGoogleMapsEmbedCode,
  resolveMapEmbedRaw,
  type GoogleMapsParseResult,
} from "./googleMapsEmbed";
import { defaultImages, getStorageImageById } from "./imageLibrary";
import { mergeLocalReferences } from "./localContextUtils";
import { getNearbySelectionLimits, isNearbySelectionCountValid, selectedNearbyOutsideProximity } from "./nearbySuggestions";
import type { LocationProject, NearbyFacility, StorageImage, ValidationIssue } from "../types/storiq";

export type { GoogleMapsParseResult };
export { parseGoogleMapsIframe } from "./googleMapsEmbed";

/** Strip scoped CSS before scanning — avoids false positives on class names like map-placeholder. */
export const htmlContentForPlaceholderScan = (html: string): string => html.replace(/<style[\s\S]*?<\/style>/gi, "");

export const hasUnresolvedPlaceholderInHtml = (html: string): boolean => {
  const content = htmlContentForPlaceholderScan(html);
  return (
    /\[(?:City|State|ZIP|Address|Phone|Keyword|PLACEHOLDER)\]|REPLACE_WITH_URL|TODO|INSERT_/i.test(content) ||
    /\bundefined\b|\bnull\b/i.test(content)
  );
};

const requiredIssue = (id: string, label: string, message: string): ValidationIssue => ({
  id,
  label,
  message,
  severity: "required",
});

const warningIssue = (id: string, label: string, message: string): ValidationIssue => ({
  id,
  label,
  message,
  severity: "warning",
});

export const getProjectValidation = (
  project: LocationProject,
  facilities: NearbyFacility[] = [],
  images: StorageImage[] = defaultImages,
) => {
  const hardFails: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const { locationIdentity, seo, existingContent, googleMaps } = project;
  const mapTitle = `Map to ${locationIdentity.facilityName || "facility"}`;
  const normalizedMap = normalizeGoogleMapsEmbedCode(resolveMapEmbedRaw(googleMaps), mapTitle);

  if (!locationIdentity.city.trim()) hardFails.push(requiredIssue("city", "City", "City is required."));
  if (!locationIdentity.state.trim()) hardFails.push(requiredIssue("state", "State", "State is required."));
  if (!locationIdentity.zipCode.trim()) hardFails.push(requiredIssue("zip", "ZIP code", "ZIP code is required."));
  if (!locationIdentity.facilityName.trim()) {
    hardFails.push(requiredIssue("facilityName", "Facility name", "Facility name is required."));
  }
  if (!locationIdentity.storagelyPageUrl.trim()) {
    hardFails.push(requiredIssue("storagelyUrl", "Storagely URL", "Storagely page URL is required."));
  }
  if (!seo.primaryKeyword.trim()) {
    hardFails.push(requiredIssue("primaryKeyword", "Primary keyword", "Primary keyword is required."));
  }
  if (!existingContent.rawContent.trim()) {
    hardFails.push(requiredIssue("rawContent", "Existing content", "Existing page content or brief text is required."));
  }
  if (!existingContent.address.trim()) {
    hardFails.push(requiredIssue("address", "Address", "Facility address is required."));
  }
  if (!normalizedMap.isValid) {
    hardFails.push(
      requiredIssue(
        "mapsIframe",
        "Google Maps iframe",
        mapEmbedValidationMessage(normalizedMap) || "A valid Google Maps iframe is required.",
      ),
    );
  }
  if (project.selectedStorageImages.length === 0) {
    hardFails.push(requiredIssue("storageTypes", "Storage types", "Select at least one storage type card."));
  }
  if (project.selectedNearbyLocations.length === 0) {
    hardFails.push(requiredIssue("nearbyLocations", "Nearby locations", "Select nearby locations for internal links."));
  }

  if (!existingContent.officeHours.trim()) {
    warnings.push(warningIssue("officeHours", "Office hours", "Office hours are missing."));
  }
  if (!existingContent.accessHours.trim()) {
    warnings.push(warningIssue("accessHours", "Access hours", "Access or gate hours are missing."));
  }
  if (mergeLocalReferences(project.localContext).length === 0) {
    warnings.push(warningIssue("localReferences", "Local references", "No local references within 10 miles have been added."));
  }
  if (project.localContext.doNotInclude.length === 0) {
    warnings.push(warningIssue("doNotInclude", "Do-not-include notes", "No do-not-include notes have been added."));
  }
  const nearbyLimits = getNearbySelectionLimits(project, facilities);
  const nearbyCount = project.selectedNearbyLocations.length;
  if (nearbyLimits.availableClose === 0 && nearbyCount > 0) {
    warnings.push(
      warningIssue("nearbyCount", "Nearby locations", "Selected nearby locations are outside the close-proximity range."),
    );
  } else if (nearbyLimits.availableClose > 0 && !isNearbySelectionCountValid(nearbyCount, project, facilities)) {
    warnings.push(
      warningIssue(
        "nearbyCount",
        "Nearby locations",
        nearbyLimits.target === 1
          ? "Select 1 nearby location within close proximity."
          : nearbyLimits.target === 2
            ? "Select 1–2 nearby locations — only 2 are close enough for this page."
            : "Select up to 3 nearby locations within close proximity.",
      ),
    );
  }
  const outsideProximity = selectedNearbyOutsideProximity(project, facilities, project.selectedNearbyLocations);
  if (outsideProximity.length > 0) {
    warnings.push(
      warningIssue(
        "nearbyProximity",
        "Nearby proximity",
        `${outsideProximity.map((f) => f.city).join(", ")} is too far — remove or replace with a closer location.`,
      ),
    );
  }
  if (!project.generated.faqJsonLd.trim()) {
    warnings.push(warningIssue("faqSchema", "FAQ schema", "FAQ schema has not been generated yet."));
  }
  if (!project.generated.html.trim()) {
    warnings.push(warningIssue("htmlGenerated", "HTML", "HTML has not been generated yet."));
  }
  if (normalizedMap.isOfficial && !normalizedMap.hasLazyLoading) {
    warnings.push(warningIssue("mapLazy", "Map loading", "Google Maps iframe is missing loading=\"lazy\"."));
  }
  if (normalizedMap.isOfficial && !normalizedMap.hasTitle) {
    warnings.push(warningIssue("mapTitle", "Map title", "Google Maps iframe is missing a title attribute."));
  }

  const selectedImages = project.selectedStorageImages.map((id) => getStorageImageById(images, id)).filter(Boolean);
  if (selectedImages.some((image) => !image?.altText.trim())) {
    warnings.push(warningIssue("imageAlt", "Image alt text", "One or more selected images are missing alt text."));
  }

  const selectedFacilities = project.selectedNearbyLocations
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is NearbyFacility => Boolean(f));
  selectedFacilities.forEach((facility) => {
    if (!facility.storagelyUrl) {
      warnings.push(warningIssue(`nearby-url-${facility.id}`, "Nearby URL", `${facility.facilityName} is missing a Storagely URL.`));
    }
    if (!facility.imageUrl) {
      warnings.push(warningIssue(`nearby-img-${facility.id}`, "Nearby image", `${facility.facilityName} is missing an image URL.`));
    }
  });

  const place = `${project.locationIdentity.city}, ${project.locationIdentity.state}`.toLowerCase();
  if (place.length > 3) {
    selectedImages.forEach((image) => {
      if (image && !image.altText.toLowerCase().includes(project.locationIdentity.city.toLowerCase())) {
        warnings.push(
          warningIssue(`alt-city-${image.id}`, "Alt text locality", `${image.category} alt text should include city and state.`),
        );
      }
    });
  }

  const totalRequired = 12;
  const completionPercent = Math.round(((totalRequired - hardFails.length) / totalRequired) * 100);

  return {
    hardFails,
    warnings,
    completionPercent: Math.max(0, Math.min(100, completionPercent)),
  };
};
