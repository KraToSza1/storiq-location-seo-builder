import { mergeLocalReferences } from "./localContextUtils";
import { branchLabelFromFacilityName, formatPlaceTitleCase } from "./contentQuality";
import { formatFacilityNameWithMark } from "./myGarageGenerationSpec";
import type { FaqItem, LocationProject, StorageImage } from "../types/storiq";
import {
  copyMatchesSelectedStorageTypes,
  facilityOffersClimateControlled,
  facilityOffersVehicleStorage,
  faqMentionsClimate,
  faqMentionsVehicleTopic,
  selectedStorageCategories,
} from "./storageTypeFidelity";

export {
  facilityOffersClimateControlled,
  facilityOffersVehicleStorage,
  faqMentionsClimate,
  faqMentionsVehicleTopic,
  selectedStorageCategories,
};

export const shortFacilityLabel = (facilityName: string, city?: string): string => {
  const branch = branchLabelFromFacilityName(facilityName);
  if (branch) {
    return branch;
  }
  const trimmed = facilityName.trim();
  if (trimmed) {
    return trimmed.replace(/^My Garage Self Storage\s*\|?\s*/i, "").trim() || trimmed;
  }
  return city ? `our ${city} location` : "this location";
};

/** Drop FAQs that claim storage types not selected in Step 3. */
export const faqMatchesFacilityCapabilities = (
  faq: FaqItem,
  project: LocationProject,
  images: StorageImage[],
): boolean => {
  const combined = `${faq.question} ${faq.answer}`;
  if (!copyMatchesSelectedStorageTypes(combined, project, images)) {
    return false;
  }
  if (faqMentionsClimate(faq.question, faq.answer) && !facilityOffersClimateControlled(project, images)) {
    return false;
  }
  if (faqMentionsVehicleTopic(faq.question, faq.answer) && !facilityOffersVehicleStorage(project, images)) {
    return false;
  }
  return true;
};

export const splitAddressForNap = (
  address: string,
  city: string,
  state: string,
  zipCode: string,
): { street: string; cityLine: string } => {
  const trimmed = address.trim();
  const cityLine = [city.trim(), state.trim(), zipCode.trim()].filter(Boolean).join(", ");
  if (!trimmed) {
    return { street: "", cityLine };
  }

  const parts = trimmed.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2 && city.trim() && parts[parts.length - 1]?.toLowerCase().includes(state.trim().toLowerCase())) {
    return {
      street: parts.slice(0, -1).join(", "),
      cityLine: parts[parts.length - 1] ?? cityLine,
    };
  }

  return { street: trimmed, cityLine };
};

const streetLeadFromAddress = (address: string): string => {
  const first = address.split(",")[0]?.trim();
  return first || address.trim();
};

/** Section 7 directions only — no office/access hours in this copy. */
export const buildMapDirectionsCopy = (project: LocationProject): string => {
  const { city, state } = project.locationIdentity;
  const place = formatPlaceTitleCase(city, state);
  const localRefs = mergeLocalReferences(project.localContext);
  const street = streetLeadFromAddress(project.existingContent.address || "");
  const paragraphs: string[] = [];

  if (street && localRefs.length > 0) {
    const nearPrimary = localRefs[0];
    const nearMore = localRefs.slice(1, 4);
    paragraphs.push(
      `Located on ${street} near ${nearPrimary}, our ${place} self storage facility offers easy access for residents, students, and business owners across the area.`,
    );
    if (nearMore.length > 0) {
      paragraphs.push(`We're conveniently positioned near ${nearMore.join(", ")}.`);
    }
  } else if (street) {
    paragraphs.push(
      `Located on ${street}, our ${place} self storage facility offers straightforward access for local residents and businesses.`,
    );
  } else if (localRefs.length > 0) {
    paragraphs.push(
      `Located near ${localRefs.slice(0, 2).join(" and ")}, our ${place} self storage facility offers easy access for customers across the area.`,
    );
    if (localRefs.length > 2) {
      paragraphs.push(`We're conveniently positioned near ${localRefs.slice(2, 5).join(", ")}.`);
    }
  } else {
    paragraphs.push(
      `Our ${place} self storage facility offers convenient access for local residents and businesses. Use the map for turn-by-turn directions.`,
    );
  }

  return paragraphs.join("\n\n");
};

export const stripHoursSentencesFromMapCopy = (text: string): string =>
  text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !/office hours|access hours|gate hours/i.test(part))
    .join("\n\n");

export { formatFacilityNameWithMark };
