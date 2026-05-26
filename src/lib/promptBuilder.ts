import { defaultImages, getStorageImageById } from "./imageLibrary";
import { defaultFacilities } from "./facilityLibrary";
import { mergeLocalReferences } from "./localContextUtils";
import systemPrompt from "../spec/my-garage-location-tool-system-prompt.md?raw";
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
      return `- ${image.category}: image=${image.imageUrl}; destinationUrl=${image.destinationUrl || "none — keep H3 plain text"}`;
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

  return `${systemPrompt.trim()}

---

## Current location inputs (populate the template above)

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

FEATURES & AMENITIES (8–12 for Section 1)
${lines(project.existingContent.features)}

STORAGE TYPES OFFERED
${lines(project.existingContent.storageTypes)}

SELECTED STORAGE TYPE CARDS (Image Library)
${selectedStorage || "- None selected"}

WORKING DRAFT COPY (starter — refine to match spec)
Title tag draft: ${project.generated.draftTitleTag || "MISSING"}
Meta description draft: ${project.generated.draftMetaDescription || "MISSING"}
${project.generated.draftSections.length > 0 ? project.generated.draftSections.map((section) => `${section.label} - ${section.heading}\n${section.body}\n${lines(section.bullets)}`).join("\n\n") : "- No working draft generated yet"}

FAQ DRAFTS (must match visible FAQ + JSON-LD word-for-word)
${project.generated.draftFaqs.length > 0 ? project.generated.draftFaqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`).join("\n\n") : "- None generated yet"}

NEARBY LOCATIONS (3 cards, Section 5 — keyword-free H2)
${nearby || "- None selected"}

LOCAL CONTEXT (Section 4 — 10-mile rule; manual verification)
${lines(mergeLocalReferences(project.localContext))}

Do-not-include notes:
${lines(project.localContext.doNotInclude)}

GOOGLE MAPS IFRAME
${project.googleMaps.iframeCode || "MISSING"}

Output the final HTML document only, per the system prompt. If required inputs are missing, output the [GENERATION BLOCKED] block instead.`;
};
