import { defaultImages, getStorageImageById } from "./imageLibrary";
import type { LocationProject, NearbyFacility, StorageImage, ValidationIssue } from "../types/storiq";

export interface GoogleMapsParseResult {
  isValid: boolean;
  detectedSrc: string;
  hasLazyLoading: boolean;
  hasTitle: boolean;
  hasReferrerPolicy: boolean;
}

/** Strip scoped CSS before scanning — avoids false positives on class names like map-placeholder. */
export const htmlContentForPlaceholderScan = (html: string): string => html.replace(/<style[\s\S]*?<\/style>/gi, "");

export const hasUnresolvedPlaceholderInHtml = (html: string): boolean => {
  const content = htmlContentForPlaceholderScan(html);
  return (
    /\[(?:City|State|ZIP|Address|Phone|Keyword|PLACEHOLDER)\]|REPLACE_WITH_URL|TODO|INSERT_/i.test(content) ||
    /\bundefined\b|\bnull\b/i.test(content)
  );
};

export const parseGoogleMapsIframe = (iframeCode: string): GoogleMapsParseResult => {
  const iframeMatch = iframeCode.match(/<iframe\b[\s\S]*?>[\s\S]*?<\/iframe>/i);
  const iframeTag = iframeMatch?.[0] ?? "";
  const src = iframeTag.match(/\ssrc=["']([^"']+)["']/i)?.[1] ?? "";

  return {
    isValid: Boolean(iframeMatch && src),
    detectedSrc: src,
    hasLazyLoading: /\sloading=["']lazy["']/i.test(iframeTag),
    hasTitle: /\stitle=["'][^"']+["']/i.test(iframeTag),
    hasReferrerPolicy: /\sreferrerpolicy=["'][^"']+["']/i.test(iframeTag),
  };
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
  const map = parseGoogleMapsIframe(googleMaps.iframeCode);

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
  if (!existingContent.phone.trim()) {
    hardFails.push(requiredIssue("phone", "Phone", "Phone number is required."));
  }
  if (!map.isValid) {
    hardFails.push(requiredIssue("mapsIframe", "Google Maps iframe", "A valid Google Maps iframe is required."));
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
  if (project.localContext.landmarks.length === 0) {
    warnings.push(warningIssue("landmarks", "Local landmarks", "No local landmarks have been added."));
  }
  if (project.localContext.lifestyleTieIns.length === 0) {
    warnings.push(warningIssue("lifestyleTieIns", "Lifestyle tie-ins", "No lifestyle tie-ins have been added."));
  }
  if (project.localContext.doNotInclude.length === 0) {
    warnings.push(warningIssue("doNotInclude", "Do-not-include notes", "No do-not-include notes have been added."));
  }
  if (project.selectedStorageImages.length > 6) {
    warnings.push(warningIssue("tooManyStorageTypes", "Storage cards", "More than 6 storage type cards are selected."));
  }
  if (project.selectedNearbyLocations.length !== 3) {
    warnings.push(
      warningIssue("nearbyCount", "Nearby locations", "Select exactly 3 nearby facilities for the page section."),
    );
  }
  if (!project.generated.faqJsonLd.trim()) {
    warnings.push(warningIssue("faqSchema", "FAQ schema", "FAQ schema has not been generated yet."));
  }
  if (!project.generated.html.trim()) {
    warnings.push(warningIssue("htmlGenerated", "HTML", "HTML has not been generated yet."));
  }
  if (googleMaps.iframeCode.trim() && !map.hasLazyLoading) {
    warnings.push(warningIssue("mapLazy", "Map loading", "Google Maps iframe is missing loading=\"lazy\"."));
  }
  if (googleMaps.iframeCode.trim() && !map.hasTitle) {
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
