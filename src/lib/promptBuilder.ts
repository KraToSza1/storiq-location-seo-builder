import { defaultImages, getStorageImageById } from "./imageLibrary";
import { defaultFacilities } from "./facilityLibrary";
import { mergeLocalReferences } from "./localContextUtils";
import type { LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const lines = (items: string[]): string => (items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- None provided");

export const buildAiPrompt = (
  project: LocationProject,
  facilities: NearbyFacility[] = defaultFacilities,
  images: StorageImage[] = defaultImages,
): string => {
  const selectedStorage = project.selectedStorageImages
    .map((id) => getStorageImageById(images, id))
    .filter(Boolean)
    .map((image) => {
      if (!image) return "";
      return `- ${image.category}: image=${image.imageUrl}; destinationUrl=${image.destinationUrl || "none; keep H3 plain text"}`;
    })
    .join("\n");

  const nearby = project.selectedNearbyLocations
    .map((id) => facilities.find((facility) => facility.id === id))
    .filter(Boolean)
    .map((facility) => {
      if (!facility) return "";
      return `- ${facility.facilityName} | ${facility.address} | ${facility.storagelyUrl}`;
    })
    .join("\n");

  return `Create a complete Storagely-ready local SEO HTML location page for My Garage Self Storage.

LOCATION IDENTITY
- City: ${project.locationIdentity.city || "MISSING"}
- State: ${project.locationIdentity.state || "MISSING"}
- ZIP code: ${project.locationIdentity.zipCode || "MISSING"}
- Facility name: ${project.locationIdentity.facilityName || "MISSING"}
- Storagely page URL: ${project.locationIdentity.storagelyPageUrl || "MISSING"}

PRIMARY SEO KEYWORD
${project.seo.primaryKeyword || "MISSING"}

EXISTING LOCATION CONTENT
- Address: ${project.existingContent.address || "MISSING"}
- Phone: ${project.existingContent.phone || "MISSING"}
- Office hours: ${project.existingContent.officeHours || "MISSING"}
- Access hours: ${project.existingContent.accessHours || "MISSING"}

Raw source content:
${project.existingContent.rawContent || "MISSING"}

FEATURES & AMENITIES
${lines(project.existingContent.features)}

STORAGE TYPES OFFERED
${lines(project.existingContent.storageTypes)}

SELECTED STORAGE TYPE CARDS AND IMAGES
${selectedStorage || "- None selected"}

WORKING DRAFT COPY
Title tag draft: ${project.generated.draftTitleTag || "MISSING"}
Meta description draft: ${project.generated.draftMetaDescription || "MISSING"}
${project.generated.draftSections.length > 0 ? project.generated.draftSections.map((section) => `${section.label} - ${section.heading}\n${section.body}\n${lines(section.bullets)}`).join("\n\n") : "- No working draft generated yet"}

NEARBY LOCATIONS
${nearby || "- None selected"}

LOCAL CONTEXT
Local references within 10 miles / 16 km, manual verification required:
${lines(mergeLocalReferences(project.localContext))}

Do-not-include notes:
${lines(project.localContext.doNotInclude)}

GOOGLE MAPS IFRAME
${project.googleMaps.iframeCode || "MISSING"}

SEO AND HTML RULES
- Use one main wrapper: <main id="facility-template" class="facility-template">.
- Include exactly 7 H2 page sections inside #facility-template: Features & Amenities, Why Choose, Types of Storage, Serving, Other Nearby Locations at My Garage, FAQs, and Map/Location CTA (map-section layout).
- Storage cards must use H3 headings.
- Nearby location cards must use H3 headings.
- FAQ questions must use H3 inside summary.
- Every image needs alt text that includes the City and State.
- Images should include loading="lazy", decoding="async", width, and height.
- Only link a storage type H3 when a destinationUrl exists. If destinationUrl is missing, keep the H3 plain text.
- Do not link nearby locations to the current facility URL.
- Do not claim local landmark distance verification is complete unless actual distance data exists.
- FAQPage JSON-LD must match the visible FAQ question and answer text exactly.
- Google Maps iframe should include loading="lazy", title, and referrerpolicy.
- CSS must be scoped to #facility-template.
- Do not leave unresolved placeholders such as [City], [State], REPLACE_WITH_URL, or TODO.

OUTPUT REQUIREMENTS
- Return only paste-safe HTML for Storagely.
- Keep claims factual and based on the supplied content.
- Use clear, professional copy for an internal production workflow.`;
};
