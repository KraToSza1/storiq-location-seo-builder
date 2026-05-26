import type { ValidationIssue } from "../types/storiq";

/** Limits from my-garage-location-tool-system-prompt.md */
export const SECTION1_AMENITY_MIN = 8;
export const SECTION1_AMENITY_MAX = 12;
export const SECTION2_VALUE_BULLET_MIN = 5;
export const SECTION2_VALUE_BULLET_MAX = 8;

const PROMO_PATTERNS = [
  /\d+%\s*off/gi,
  /first\s+month\s+free/gi,
  /\$\d+(?:\.\d{2})?\s*(?:\/\s*)?(?:per\s+)?month/gi,
  /limited[\s-]time\s+offer/gi,
  /move[\s-]in\s+special/gi,
  /promo(?:tion)?\s+code/gi,
  /discount(?:s)?\s+available/gi,
];

export const containsPromotionalLanguage = (text: string): boolean =>
  PROMO_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(text);
  });

/** Section 9 — strip promos from raw content before parsing or publishing. */
export const stripPromotionalLanguage = (text: string): string => {
  let result = text;
  PROMO_PATTERNS.forEach((pattern) => {
    result = result.replace(pattern, "");
  });
  return result.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
};

export const amenitiesForSection1 = (features: string[]): string[] => {
  const cleaned = features.map((item) => stripPromotionalLanguage(item)).filter(Boolean);
  if (cleaned.length === 0) {
    return cleaned;
  }
  return cleaned.slice(0, SECTION1_AMENITY_MAX);
};

export const valueBulletsForSection2 = (bullets: string[]): string[] => {
  const cleaned = bullets.filter(Boolean);
  if (cleaned.length <= SECTION2_VALUE_BULLET_MAX) {
    return cleaned;
  }
  return cleaned.slice(0, SECTION2_VALUE_BULLET_MAX);
};

/** Section 3 — grid columns per card count (desktop). */
export const storageGridColumnRule = (cardCount: number): string => {
  if (cardCount === 4) {
    return "repeat(4, 1fr)";
  }
  if (cardCount >= 5) {
    return "repeat(3, 1fr)";
  }
  if (cardCount === 3) {
    return "repeat(3, 1fr)";
  }
  if (cardCount === 2) {
    return "repeat(2, 1fr)";
  }
  return "1fr";
};

export const buildStorageGridStyle = (cardCount: number): string =>
  cardCount > 0 ? ` style="grid-template-columns: ${storageGridColumnRule(cardCount)};"` : "";

/** Section 6 — alt text: [Type] self storage units in [City, State] */
export const buildStorageImageAltText = (storageType: string, city: string, state: string): string => {
  const type = storageType.trim() || "Storage";
  const place = [city.trim(), state.trim()].filter(Boolean).join(", ");
  return place ? `${type} self storage units in ${place}` : `${type} self storage units`;
};

/** Section 1 lead — name street/highway from address when available. */
export const buildSection1IntroFallback = (
  facilityName: string,
  place: string,
  address: string,
  featureSummary: string,
): string => {
  const streetLead = address.split(",")[0]?.trim();
  const locationLead = streetLead
    ? `${facilityName} along ${streetLead} in ${place}`
    : `${facilityName} in ${place}`;
  return `${locationLead} offers ${featureSummary} designed to make your storage experience secure, convenient, and hassle-free.`;
};

export const formatFacilityNameWithMark = (facilityName: string): string => {
  const trimmed = facilityName.trim();
  if (!trimmed) {
    return "My Garage Self Storage®";
  }
  return trimmed.includes("®") ? trimmed : `${trimmed}®`;
};

/** Section 7 — clean Google Maps iframe per system prompt Section 6. */
export const sanitizeGoogleMapsIframe = (iframeCode: string, city: string, state: string): string => {
  const trimmed = iframeCode.trim();
  if (!trimmed) {
    return `<p style="padding:2rem;text-align:center;color:#555;">Add a Google Maps embed in Step 7 before exporting.</p>`;
  }

  const match = trimmed.match(/<iframe\b[\s\S]*?<\/iframe>/i);
  if (!match) {
    return trimmed;
  }

  let tag = match[0];
  tag = tag.replace(/\s(width|height|style)=["'][^"']*["']/gi, "");

  if (!/\sloading=/i.test(tag)) {
    tag = tag.replace(/<iframe/i, '<iframe loading="lazy"');
  }

  const titlePlace = [city.trim(), state.trim()].filter(Boolean).join(", ");
  const title = `My Garage Self Storage ${titlePlace} location map`.trim();
  if (!/\stitle=/i.test(tag)) {
    tag = tag.replace(/<iframe/i, `<iframe title="${title}"`);
  } else {
    tag = tag.replace(/\stitle=["'][^"']*["']/i, ` title="${title}"`);
  }

  if (!/\sreferrerpolicy=/i.test(tag)) {
    tag = tag.replace(/<iframe/i, '<iframe referrerpolicy="no-referrer-when-downgrade"');
  }

  if (!/\sallowfullscreen/i.test(tag)) {
    tag = tag.replace(/<iframe/i, "<iframe allowfullscreen");
  }

  return tag;
};

/** Section 12 — blocked generation output. */
export const formatGenerationBlocked = (issues: ValidationIssue[]): string => {
  const lines = issues.map((issue) => `- ${issue.label}: ${issue.message}`);
  return `[GENERATION BLOCKED]
Reason: Required inputs missing or a hard SEO rule cannot be met safely.
Missing or problematic:
${lines.join("\n")}
Needed to proceed: Complete all required wizard fields (identity, keyword, map iframe, raw content, address, storage types, nearby locations) before exporting.`;
};

export const isGenerationBlockedOutput = (output: string): boolean => output.trimStart().startsWith("[GENERATION BLOCKED]");
