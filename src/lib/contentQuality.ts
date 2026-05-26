import { FAQ_WIDGET_FRAGMENTS } from "../config/validationGate/faqWidgetFragments";
import { SCAFFOLD_PHRASES } from "../config/validationGate/scaffoldTokens";
import { containsPromotionalLanguage, stripPromotionalLanguage } from "./myGarageGenerationSpec";

const MIN_FAQ_ANSWER_WORDS = 12;

export const collapseWhitespace = (text: string): string =>
  text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();

export const isScaffoldMetaText = (text: string): boolean => {
  const lower = text.toLowerCase();
  return SCAFFOLD_PHRASES.some((phrase) => lower.includes(phrase));
};

export const formatPlaceTitleCase = (city: string, state: string): string =>
  [city.trim(), state.trim().toUpperCase()].filter(Boolean).join(", ");

/** SEO phrase for headings/FAQs — title-case place, never raw lowercase mid-sentence. */
export const formatKeywordPhrase = (city: string, state: string, style: "faq" | "body" = "body"): string => {
  const place = formatPlaceTitleCase(city, state);
  if (!place) {
    return style === "faq" ? "Self Storage units" : "self storage units";
  }
  return style === "faq" ? `Self Storage units in ${place}` : `self storage units in ${place}`;
};

export const resolveBodyKeyword = (primaryKeyword: string, city: string, state: string): string => {
  const trimmed = primaryKeyword.trim();
  if (!trimmed) {
    return formatKeywordPhrase(city, state, "body");
  }
  const place = formatPlaceTitleCase(city, state);
  if (place && trimmed.toLowerCase() === `self storage units in ${place.toLowerCase()}`) {
    return formatKeywordPhrase(city, state, "body");
  }
  if (place && trimmed.toLowerCase().includes(place.toLowerCase())) {
    return trimmed.replace(new RegExp(place.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), place);
  }
  return trimmed;
};

export const faqHasWidgetOrPricingNoise = (question: string, answer: string): boolean => {
  const blob = `${question} ${answer}`.toLowerCase();
  if (containsPromotionalLanguage(blob)) {
    return true;
  }
  return FAQ_WIDGET_FRAGMENTS.some((frag) => blob.includes(frag));
};

export const isValidFaqCandidate = (question: string, answer: string): boolean => {
  const q = stripPromotionalLanguage(question).trim();
  const a = stripPromotionalLanguage(answer).trim();
  if (!q || !a) {
    return false;
  }
  if (faqHasWidgetOrPricingNoise(q, a)) {
    return false;
  }
  if (a.split(/\s+/).filter(Boolean).length < MIN_FAQ_ANSWER_WORDS) {
    return false;
  }
  if (isScaffoldMetaText(q) || isScaffoldMetaText(a)) {
    return false;
  }
  return true;
};

export const branchLabelFromFacilityName = (facilityName: string): string => {
  const parts = facilityName.split("|").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1]! : "";
};

export const nearbyFacilityHeading = (
  facility: { city: string; state: string; facilityName: string },
  currentCity: string,
): string => {
  const sameCity = facility.city.trim().toLowerCase() === currentCity.trim().toLowerCase();
  if (sameCity) {
    const branch = branchLabelFromFacilityName(facility.facilityName);
    if (branch) {
      return `${facility.city}, ${facility.state} — ${branch}`;
    }
  }
  return `${facility.city}, ${facility.state}`;
};

export const nearbyCardImageAlt = (
  facility: { city: string; state: string; facilityName: string },
  current: { city: string; state: string; facilityName: string },
): string => {
  const sisterBranch = branchLabelFromFacilityName(facility.facilityName);
  const currentBranch = branchLabelFromFacilityName(current.facilityName);
  const sameCity = facility.city.trim().toLowerCase() === current.city.trim().toLowerCase();
  const nearLabel =
    sameCity && currentBranch ? currentBranch : formatPlaceTitleCase(current.city, current.state);
  const locationPart = sisterBranch
    ? `Self storage units in ${facility.city}, ${facility.state} on ${sisterBranch}`
    : `Self storage units in ${facility.city}, ${facility.state}`;
  return `${locationPart} near ${nearLabel}`;
};

export const nearbyCardDescription = (
  facility: { city: string; state: string; facilityName: string; notes?: string },
  currentPlace: string,
): string => {
  const notes = facility.notes?.trim();
  if (notes && !isScaffoldMetaText(notes)) {
    return notes;
  }
  const branch = branchLabelFromFacilityName(facility.facilityName);
  if (branch) {
    return `Our ${facility.city}, ${facility.state} location on ${branch} offers flexible month-to-month rentals and the same My Garage Self Storage® amenities customers expect near ${currentPlace}.`;
  }
  return `Reliable self storage in ${facility.city}, ${facility.state}, with drive-up access, secure gated entry, and flexible rentals for residents and businesses near ${currentPlace}.`;
};
