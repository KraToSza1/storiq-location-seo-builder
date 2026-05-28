import { defaultImages, getStorageImageById } from "./imageLibrary";
import { defaultFacilities } from "./facilityLibrary";
import { mergeLocalReferences } from "./localContextUtils";
import { selectedStorageCategories } from "./storageTypeFidelity";
import systemPrompt from "../spec/system-prompt-v2.md?raw";
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
      return `- ${facility.facilityName} | ${facility.city}, ${facility.state} | image=${facility.imageUrl?.trim() || "MISSING — Section 5 requires library image URL"} | ${facility.storagelyUrl}`;
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

STORAGE TYPES (Step 3 — mention ONLY these in all copy; ignore types named in raw source unless listed here)
${lines(selectedStorageCategories(project, images))}

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

ENGINEER NOTE (before portfolio-wide SelfStorage JSON-LD): view-source a live Storagely location page and confirm Storagely is NOT already injecting facility/LocalBusiness/SelfStorage schema. If it is, do not duplicate — reconcile first.

OUTPUT RULES
- Storage types: mention only categories listed under STORAGE TYPES (Step 3). Do not add RV, boat, climate-controlled, vehicle, or other types from raw source unless they appear in that list.
- Emit HTML only (or [GENERATION BLOCKED] if required inputs / hard rules fail).
- Do NOT output <meta name="description"> (out of scope).
- Section 5: <img class="location-card__image"> only — no CSS background-image / --img-loc-* tokens.
- JSON-LD before </main>: FAQPage + SelfStorage (geo from map !2d=longitude, !3d=latitude).
- Run system prompt Section 11 self-check before final output.`;
};
