/** Client wireframe: My Garage Content & SEO page structure (7 sections). */

export const FACILITY_WIREframe_SECTION_COUNT = 7;
export const FACILITY_WIREframe_FAQ_COUNT = 6;
export const VALUE_PROPOSITION_OPENING = "At My Garage Self Storage®,";

export interface FacilityWireframeHeadings {
  features: string;
  value: string;
  storage: string;
  local: string;
  nearby: string;
  faq: string;
  map: string;
}

export const buildFacilityWireframeHeadings = (city: string, state: string, place: string): FacilityWireframeHeadings => ({
  features: `Features & Amenities in ${city}, ${state}`,
  value: `Why Choose Our Self Storage Units in ${city}, ${state}?`,
  storage: `Types of Self Storage Units Available in ${city}, ${state}`,
  local: `Serving ${place} and Surrounding Areas`,
  nearby: "Other Nearby Locations at My Garage",
  faq: `FAQs about Self Storage units in ${city}, ${state}`,
  map: `Convenient Self Storage in ${city}, ${state}`,
});

/** Wireframe section signals used in export/SEO audits. */
export const FACILITY_WIREframe_SECTION_SIGNALS = [
  "Features &amp; Amenities",
  "Why Choose Our Self Storage Units",
  "Types of Self Storage Units Available",
  "Serving",
  "Other Nearby Locations at My Garage",
  "FAQs about Self Storage units",
  "map-section",
] as const;

export interface FacilityHeadingAudit {
  h2Count: number;
  storageH3Count: number;
  nearbyH3Count: number;
  faqH3Count: number;
  faqCount: number;
  valid: boolean;
  message: string;
}

const countMatches = (value: string, pattern: RegExp): number => value.match(pattern)?.length ?? 0;

export const auditFacilityHeadings = (html: string): FacilityHeadingAudit => {
  const h2Count = countMatches(html, /<h2[\s>]/gi);
  const storageH3Count = countMatches(html, /storage-card[\s\S]*?<h3/gi);
  const nearbyH3Count = countMatches(html, /location-card__content[\s\S]*?<h3/gi);
  const faqH3Count = countMatches(html, /<summary><h3>/gi);
  const faqCount = faqH3Count;
  const sectionsPresent = FACILITY_WIREframe_SECTION_SIGNALS.every((signal) => html.includes(signal));

  const valid =
    sectionsPresent &&
    h2Count === FACILITY_WIREframe_SECTION_COUNT &&
    storageH3Count >= 1 &&
    faqH3Count >= 1 &&
    faqCount === FACILITY_WIREframe_FAQ_COUNT;

  const message = valid
    ? "H tag hierarchy matches the client wireframe — 7 section H2 titles, H3 on storage cards, nearby cards, and FAQ questions. No heading changes needed."
    : `Heading check: ${h2Count}/7 H2 sections, ${storageH3Count} storage H3, ${nearbyH3Count} nearby H3, ${faqCount}/6 FAQ H3.${sectionsPresent ? "" : " Missing wireframe section(s)."}`;

  return { h2Count, storageH3Count, nearbyH3Count, faqH3Count, faqCount, valid, message };
};

export const ensureValuePropositionOpening = (body: string, fallback: string): string => {
  const trimmed = body.trim();
  if (/^At My Garage Self Storage/i.test(trimmed)) {
    return trimmed.includes("®") ? trimmed : trimmed.replace(/^At My Garage Self Storage,?\s*/i, `${VALUE_PROPOSITION_OPENING} `);
  }
  return fallback.trim().startsWith(VALUE_PROPOSITION_OPENING) ? fallback.trim() : fallback;
};
