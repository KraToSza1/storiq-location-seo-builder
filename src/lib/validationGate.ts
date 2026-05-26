/**
 * Pre-publish validation gate — docs/validation-gate-spec.md
 * All checks are blocking (pass/fail). Judgment checks accept OVERRIDE:<id>:<reason>.
 */
import { AMENITY_SYNONYM_GROUPS } from "../config/validationGate/amenitySynonyms";
import { areaCodesForState } from "../config/validationGate/areaCodesByState";
import { FAQ_WIDGET_FRAGMENTS } from "../config/validationGate/faqWidgetFragments";
import { GENERIC_LIBRARY_ALTS } from "../config/validationGate/genericImageAlts";
import { LANDMARK_COLLISION_PHRASES } from "../config/validationGate/landmarkCollisions";
import { MILITARY_DISCOUNT_LABEL, PROMO_PHRASES, PROMO_REGEXES } from "../config/validationGate/promoLanguage";
import { SCAFFOLD_PHRASES } from "../config/validationGate/scaffoldTokens";
import { VALUE_PROPOSITION_OPENING } from "./facilityWireframe";
import { getStorageImageById } from "./imageLibrary";
import { mergeLocalReferences } from "./localContextUtils";
import { isGenerationBlockedOutput } from "./myGarageGenerationSpec";
import {
  extractMapIframeFromHtml,
  extractVisibleFaqText,
  findJsonLdByType,
  parseEmbeddedJsonLd,
} from "./staticHtmlChecks";
import { parseGeoFromMapEmbed } from "./templateJsonLd";
import { parsePhoneDigits } from "./templateUtils";
import { hasUnresolvedPlaceholderInHtml, parseGoogleMapsIframe } from "./validators";
import type { ExportCheck, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

export type ValidationGateCategory = "safety" | "structural" | "content" | "schema" | "judgment";

export interface ValidationGateCheck {
  id: string;
  label: string;
  category: ValidationGateCategory;
  passed: boolean;
  message: string;
  offendingValue?: string;
  overrideEligible?: boolean;
}

export interface ValidationGateInput {
  html: string;
  project?: LocationProject;
  images: StorageImage[];
  facilities: NearbyFacility[];
  /** Logged human overrides: OVERRIDE:G1:reason */
  overrides?: string[];
}

const SECTION_VARIANTS = [
  "facility-section--white",
  "facility-section--light",
  "facility-section--white",
  "facility-section--light",
  "facility-section--white",
  "facility-section--light",
  "facility-section--brand",
] as const;

const NEARBY_SECTION_H2 = "Other Nearby Locations at My Garage";

const fail = (
  id: string,
  label: string,
  category: ValidationGateCategory,
  message: string,
  offendingValue?: string,
  overrideEligible = false,
): ValidationGateCheck => ({
  id,
  label,
  category,
  passed: false,
  message,
  offendingValue,
  overrideEligible,
});

const pass = (id: string, label: string, category: ValidationGateCategory, message: string): ValidationGateCheck => ({
  id,
  label,
  category,
  passed: true,
  message,
});

const parseOverrides = (overrides: string[] = []): Map<string, string> => {
  const map = new Map<string, string>();
  for (const token of overrides) {
    const match = token.trim().match(/^OVERRIDE:([A-Z0-9]+):(.+)$/i);
    if (match?.[1] && match[2]?.trim()) {
      map.set(match[1].toUpperCase(), match[2].trim());
    }
  }
  return map;
};

const sectionSlice = (html: string, sectionNumber: number): string => {
  const next = sectionNumber < 7 ? `<!-- SECTION ${sectionNumber + 1}` : "</main>";
  const re = new RegExp(`<!-- SECTION ${sectionNumber}[\\s\\S]*?(?=${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
  return html.match(re)?.[0] ?? "";
};

const visibleText = (html: string): string => html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");

const normalizeListText = (value: string): string => value.replace(/\s+/g, " ").trim().toLowerCase();

const extractListItems = (sectionHtml: string): string[] =>
  [...sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

const extractTelDigits = (html: string): string => {
  const href = html.match(/class=["']cta-button["'][^>]*href=["']([^"']+)["']/i)?.[1]
    ?? html.match(/href=["'](tel:[^"']+)["'][^>]*class=["']cta-button["']/i)?.[1]
    ?? "";
  return parsePhoneDigits(href.replace(/^tel:/i, ""));
};

const extractCtaDisplayPhone = (html: string): string => {
  const match = html.match(/class=["']cta-button["'][^>]*>Call\s+([^<]+)</i)
    ?? html.match(/class=["']cta-button["'][^>]*>\s*Call\s+([^<]+)</i);
  return match?.[1]?.trim() ?? "";
};

const containsPromoLanguage = (text: string): string | undefined => {
  const lower = text.toLowerCase();
  for (const phrase of PROMO_PHRASES) {
    if (lower.includes(phrase)) {
      return phrase;
    }
  }
  const withoutMilitary = text.replace(/\bmilitary\s+discounts?\b/gi, "");
  for (const re of PROMO_REGEXES) {
    if (re.test(withoutMilitary) && !MILITARY_DISCOUNT_LABEL.test(text.trim())) {
      return re.source;
    }
  }
  if (/\bmilitary\s+discounts?\b/i.test(text)) {
    return undefined;
  }
  if (/\bdiscount\b/i.test(text) && (/\d/.test(text) || /%/.test(text) || /month/i.test(text))) {
    return "discount with offer context";
  }
  return undefined;
};

const synonymGroupFor = (label: string): number | undefined => {
  const norm = normalizeListText(label);
  for (let i = 0; i < AMENITY_SYNONYM_GROUPS.length; i += 1) {
    if (AMENITY_SYNONYM_GROUPS[i].some((term) => norm.includes(term) || term.includes(norm))) {
      return i;
    }
  }
  return undefined;
};

const properNounCount = (sectionHtml: string): number => {
  const text = sectionHtml.replace(/<[^>]+>/g, " ");
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) ?? [];
  const roads = text.match(/\b(?:I-|US-|FM-|SH-|Loop|Highway|Street|Road|Avenue|Blvd)\s+[\w\s-]+/gi) ?? [];
  return new Set([...matches, ...roads].map((m) => m.trim())).size;
};

export const runValidationGate = (input: ValidationGateInput): ValidationGateCheck[] => {
  const { html, project, images, facilities, overrides = [] } = input;
  const overrideMap = parseOverrides(overrides);
  const checks: ValidationGateCheck[] = [];
  const push = (check: ValidationGateCheck) => {
    if (!check.passed && check.overrideEligible && overrideMap.has(check.id)) {
      checks.push({
        ...check,
        passed: true,
        message: `${check.message} Cleared by override: ${overrideMap.get(check.id)}`,
      });
      return;
    }
    checks.push(check);
  };

  if (isGenerationBlockedOutput(html)) {
    return [fail("blocked", "Generation blocked", "safety", "Complete required wizard fields before export.")];
  }

  const selfStorage = findJsonLdByType(html, "SelfStorage") as
    | {
        telephone?: string;
        url?: string;
        address?: { streetAddress?: string; addressLocality?: string; addressRegion?: string; postalCode?: string };
        areaServed?: { name?: string }[];
        geo?: { latitude?: number; longitude?: number };
      }
    | undefined;

  const city = project?.locationIdentity.city ?? selfStorage?.address?.addressLocality ?? "";
  const state = project?.locationIdentity.state ?? selfStorage?.address?.addressRegion ?? "";
  const sourcePhone = project?.existingContent.phone ?? selfStorage?.telephone ?? "";
  const storagelyUrl = project?.locationIdentity.storagelyPageUrl ?? selfStorage?.url ?? "";
  const primaryKeyword = project?.seo.primaryKeyword ?? `self storage units in ${city}, ${state}`.toLowerCase();
  const mapIframe = project?.googleMaps.iframeCode ?? extractMapIframeFromHtml(html);

  const selectedImages = project
    ? project.selectedStorageImages
        .map((id) => getStorageImageById(images, id))
        .filter((img): img is StorageImage => Boolean(img))
    : images;

  const allowedDestUrls = new Set(
    selectedImages.map((img) => img.destinationUrl?.trim()).filter((url): url is string => Boolean(url)),
  );
  const allowedFacilityUrls = new Set(
    (project
      ? project.selectedNearbyLocations.map((id) => facilities.find((f) => f.id === id)?.storagelyUrl?.trim())
      : facilities.map((f) => f.storagelyUrl?.trim())
    ).filter((url): url is string => Boolean(url)),
  );

  // --- S1 Phone ---
  const sourceDigits = parsePhoneDigits(sourcePhone);
  const telDigits = extractTelDigits(html);
  const displayPhone = extractCtaDisplayPhone(html);
  const displayDigits = parsePhoneDigits(displayPhone);
  const schemaPhone = parsePhoneDigits(selfStorage?.telephone ?? "");
  const areaCode = telDigits.slice(0, 3);
  const allowedAreas = areaCodesForState(state);

  const phoneOk =
    sourceDigits.length === 10 &&
    telDigits.length === 10 &&
    telDigits === sourceDigits &&
    displayDigits === telDigits &&
    /^\(\d{3}\) \d{3}-\d{4}$/.test(displayPhone) &&
    (allowedAreas.length === 0 || allowedAreas.includes(areaCode)) &&
    (schemaPhone.length === 0 || schemaPhone === telDigits);

  push(
    phoneOk
      ? pass("S1", "Phone number integrity", "safety", `CTA and tel: use (${areaCode}) ${telDigits.slice(3, 6)}-${telDigits.slice(6)}.`)
      : fail(
          "S1",
          "Phone number integrity",
          "safety",
          `Source ${sourceDigits || "?"} vs tel ${telDigits || "?"} vs display "${displayPhone}" vs schema ${schemaPhone || "?"}. Expected (NXX) NXX-XXXX with valid ${state} area code.`,
          displayPhone || telDigits,
        ),
  );

  // --- S2 Promo ---
  const textBlob = visibleText(html);
  const jsonLdBlob = parseEmbeddedJsonLd(html).map((b) => JSON.stringify(b)).join(" ");
  const promoHit = containsPromoLanguage(`${textBlob} ${jsonLdBlob}`);
  push(
    promoHit
      ? fail("S2", "No pricing or promotional language", "safety", `Promotional language detected: "${promoHit}".`, promoHit)
      : pass("S2", "No pricing or promotional language", "safety", "No pricing or promo phrases in visible copy or JSON-LD."),
  );

  // --- S3 Scaffold ---
  const lowerHtml = html.toLowerCase();
  const scaffoldHit = SCAFFOLD_PHRASES.find((p) => lowerHtml.includes(p)) ?? (hasUnresolvedPlaceholderInHtml(html) ? "placeholder token" : undefined);
  const genericAltHit = GENERIC_LIBRARY_ALTS.find((alt) =>
    new RegExp(`alt=["']${alt.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i").test(html),
  );
  push(
    scaffoldHit || genericAltHit
      ? fail(
          "S3",
          "No scaffold or placeholder strings",
          "safety",
          scaffoldHit ? `Scaffold phrase: "${scaffoldHit}".` : `Generic library alt shipped verbatim: "${genericAltHit}".`,
          scaffoldHit ?? genericAltHit,
        )
      : pass("S3", "No scaffold or placeholder strings", "safety", "No scaffold, placeholder, or generic library alt strings."),
  );

  // --- S4 Links ---
  const storageHeadingLinks = [...html.matchAll(/<h3>\s*<a[^>]*class=["'][^"']*storage-card__heading-link[^"']*["'][^>]*href=["']([^"']+)["']/gi)];
  const badStorageLinks = storageHeadingLinks.filter((m) => !allowedDestUrls.has(m[1].trim()));
  const badNearbyLinks = [...html.matchAll(/class=["']location-card__link["'][^>]*href=["']([^"']+)["']/gi)].filter((m) => {
    const href = m[1].trim();
    return !href || href === "#" || /^javascript:/i.test(href) || /^REPLACE_WITH/i.test(href) || !allowedFacilityUrls.has(href);
  });
  const inventedPattern = [...html.matchAll(/href=["'][^"']*\/(boat|truck|rv)-storage[^"']*["']/gi)];
  push(
    badStorageLinks.length === 0 && badNearbyLinks.length === 0 && inventedPattern.length === 0
      ? pass("S4", "No fabricated outbound links", "safety", "Storage and nearby links match library/facilities records.")
      : fail(
          "S4",
          "No fabricated outbound links",
          "safety",
          badStorageLinks.length
            ? `Storage link not in library: ${badStorageLinks.map((m) => m[1]).join(", ")}`
            : badNearbyLinks.length
              ? `Invalid nearby link: ${badNearbyLinks.map((m) => m[1]).join(", ")}`
              : `Pattern-derived storage URL: ${inventedPattern.map((m) => m[0]).join(", ")}`,
        ),
  );

  // --- T1 H1 ---
  const h1Count = (html.match(/<h1[\s>]/gi) ?? []).length;
  push(
    h1Count === 0
      ? pass("T1", "No H1", "structural", "No H1 in template (Storagely injects page H1).")
      : fail("T1", "No H1", "structural", `Found ${h1Count} H1 tag(s).`, String(h1Count)),
  );

  // --- T2 Sections ---
  const sectionBlocks = [...html.matchAll(/<section\s+class=["']([^"']+)["']/gi)].filter((m) => m[1].includes("facility-section"));
  const variantOk = sectionBlocks.length === 7 && sectionBlocks.every((m, i) => m[1].includes(SECTION_VARIANTS[i]));
  push(
    sectionBlocks.length === 7 && variantOk
      ? pass("T2", "Section count and order", "structural", "Seven facility sections in wireframe order with correct variants.")
      : fail("T2", "Section count and order", "structural", `Found ${sectionBlocks.length} facility sections (expected 7 with white/light/brand pattern).`),
  );

  // --- T3 H2 ---
  const h2Texts = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => m[1].replace(/<[^>]+>/g, "").trim());
  const section5 = sectionSlice(html, 5);
  const section5H2 = section5.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
  const keywordH2s = h2Texts.filter((h) => /self storage|storage units/i.test(h));
  const dupKeywordH2 = keywordH2s.length !== new Set(keywordH2s).size;
  push(
    h2Texts.length === 7 && section5H2 === NEARBY_SECTION_H2 && !dupKeywordH2
      ? pass("T3", "One H2 per section", "structural", "Seven H2 headings; Section 5 title is keyword-free.")
      : fail("T3", "One H2 per section", "structural", `H2 count ${h2Texts.length}; Section 5 H2 "${section5H2}" (expected "${NEARBY_SECTION_H2}").`),
  );

  // --- T4 Wrapper / CSS ---
  const mainCount = (html.match(/<main\s+id=["']facility-template["']/gi) ?? []).length;
  const cssDefenses =
    html.includes("#facility-template .storage-card__image") &&
    html.includes("facility-section--brand") &&
    html.includes("faq-item summary h3");
  push(
    mainCount === 1 && cssDefenses
      ? pass("T4", "Wrapper and cascade defenses", "structural", "Single main wrapper and required scoped CSS defenses present.")
      : fail("T4", "Wrapper and cascade defenses", "structural", `main count=${mainCount}; CSS defenses=${cssDefenses}.`),
  );

  // --- T5 Grid ---
  const storageCards = (html.match(/<div\s+class=["']storage-card["']/gi) ?? []).length;
  const gridStyle = html.match(/\.storage-grid\s*\{[^}]*grid-template-columns:\s*([^;]+)/i)?.[1] ?? "";
  const gridOk =
    storageCards >= 3 &&
    (storageCards <= 4 ? /repeat\s*\(\s*4/i.test(gridStyle) : storageCards <= 6 ? /repeat\s*\(\s*3/i.test(gridStyle) : false);
  push(
    gridOk
      ? pass("T5", "Storage grid columns", "structural", `${storageCards} cards with matching grid columns.`)
      : fail("T5", "Storage grid columns", "structural", `${storageCards} cards; grid rule "${gridStyle.trim()}" does not match spec.`),
  );

  // --- T6 Card minimums ---
  const nearbyCards = (html.match(/<article\s+class=["']location-card["']/gi) ?? []).length;
  push(
    storageCards >= 3 && nearbyCards === 3
      ? pass("T6", "Card minimums", "structural", `Section 3: ${storageCards} storage cards; Section 5: ${nearbyCards} nearby cards.`)
      : fail("T6", "Card minimums", "structural", `Storage cards=${storageCards} (min 3); nearby cards=${nearbyCards} (expected 3).`),
  );

  // --- C1 Amenities ---
  const section1 = sectionSlice(html, 1);
  const amenities = extractListItems(section1);
  const groups = new Map<number, string>();
  let synonymClash: string | undefined;
  for (const item of amenities) {
    const group = synonymGroupFor(item);
    if (group !== undefined) {
      if (groups.has(group)) {
        synonymClash = `${groups.get(group)} / ${item}`;
        break;
      }
      groups.set(group, item);
    }
  }
  push(
    amenities.length >= 8 && amenities.length <= 12 && !synonymClash
      ? pass("C1", "Section 1 amenity count", "content", `${amenities.length} amenities; no synonym duplicates.`)
      : fail(
          "C1",
          "Section 1 amenity count",
          "content",
          synonymClash
            ? `Near-duplicate amenities: ${synonymClash}.`
            : `${amenities.length} amenities (spec: 8–12).`,
        ),
  );

  // --- C2 Duplicate descriptions ---
  const dupInSection = (sectionNum: number): string | undefined => {
    const items = extractListItems(sectionSlice(html, sectionNum));
    const descs = items.map((item) => {
      const strong = item.match(/<strong[^>]*>[\s\S]*?<\/strong>\s*([\s\S]*)/i)?.[1] ?? item;
      return normalizeListText(strong.replace(/^[^:]+:\s*/, ""));
    });
    for (let i = 0; i < descs.length; i += 1) {
      for (let j = i + 1; j < descs.length; j += 1) {
        if (descs[i].length > 20 && descs[i] === descs[j]) {
          return descs[i];
        }
      }
    }
    return undefined;
  };
  const dupDesc = dupInSection(1) ?? dupInSection(2);
  push(
    !dupDesc
      ? pass("C2", "No duplicated bullet descriptions", "content", "Section 1 and 2 list items have distinct descriptions.")
      : fail("C2", "No duplicated bullet descriptions", "content", `Duplicate description: "${dupDesc.slice(0, 80)}…".`, dupDesc),
  );

  // --- C3 Alt patterns ---
  const storageAlts = [...html.matchAll(/class=["'][^"']*storage-card__image[^"']*["'][^>]*alt=["']([^"]+)["']/gi)].map((m) => m[1]);
  const nearbyAlts = [...html.matchAll(/class=["'][^"']*location-card__image[^"']*["'][^>]*alt=["']([^"]+)["']/gi)].map((m) => m[1]);
  const cityStatePlace = `${city}, ${state}`;
  const badStorageAlt = storageAlts.find(
    (alt) => GENERIC_LIBRARY_ALTS.includes(alt.toLowerCase() as (typeof GENERIC_LIBRARY_ALTS)[number]) || !/self storage units in/i.test(alt),
  );
  const badNearbyAlt = nearbyAlts.find((alt) => !/^Self storage units in /i.test(alt) || !/near/i.test(alt));
  push(
    !badStorageAlt && !badNearbyAlt && storageAlts.length > 0
      ? pass("C3", "Dynamic alt text", "content", "Storage and nearby image alts follow dynamic patterns.")
      : fail(
          "C3",
          "Dynamic alt text",
          "content",
          badStorageAlt
            ? `Storage alt "${badStorageAlt}" must match "<Type> self storage units in ${cityStatePlace}".`
            : `Nearby alt "${badNearbyAlt ?? "missing"}" must include city and "near ${city}".`,
          badStorageAlt ?? badNearbyAlt,
        ),
  );

  // --- C4 Brand mark ---
  const misplacedReg = /(?:Street|Road|Avenue|Highway|Loop|St\.|Blvd)\s*®/i.test(html);
  const valueSection = sectionSlice(html, 2);
  const valueOpenerOk = valueSection.includes(VALUE_PROPOSITION_OPENING);
  push(
    !misplacedReg && valueOpenerOk
      ? pass("C4", "Brand mark placement", "content", "® only on brand name; Value Prop opens with spec phrase.")
      : fail(
          "C4",
          "Brand mark placement",
          "content",
          misplacedReg ? "® appears after a street/road name." : "Value Proposition must begin with At My Garage Self Storage®.",
        ),
  );

  // --- C5 Keyword stuffing ---
  const keywordLower = primaryKeyword.trim().toLowerCase();
  let perParagraphViolations = 0;
  let lowercasePlaceViolations = 0;
  let totalKeyword = 0;
  if (keywordLower.length > 4) {
    const placeTitle = `${city}, ${state}`;
    const placeLower = placeTitle.toLowerCase();
    for (const p of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
      const rawText = p[1].replace(/<[^>]+>/g, " ");
      const text = rawText.toLowerCase();
      const count = text.split(keywordLower).length - 1;
      if (count > 1) perParagraphViolations += 1;
      totalKeyword += count;
      if (city && state && text.includes(placeLower) && !rawText.includes(placeTitle)) {
        lowercasePlaceViolations += 1;
      }
    }
    for (const li of html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)) {
      const text = li[1].replace(/<[^>]+>/g, " ").toLowerCase();
      if (text.split(keywordLower).length - 1 > 1) perParagraphViolations += 1;
    }
  }
  const keywordCeiling = 8;
  const c5Fail = perParagraphViolations > 0 || lowercasePlaceViolations > 0 || totalKeyword > keywordCeiling;
  push(
    !c5Fail
      ? pass("C5", "Keyword stuffing cap", "content", `Primary keyword used ${totalKeyword} time(s) (max ${keywordCeiling}).`)
      : {
          ...fail(
            "C5",
            "Keyword stuffing cap",
            "content",
            `Keyword violations: per-block repeats=${perParagraphViolations}, lowercased place=${lowercasePlaceViolations}, total=${totalKeyword}.`,
          ),
          overrideEligible: true,
        },
  );

  // --- C6 FAQs ---
  const faqs = extractVisibleFaqText(html);
  const widgetHit = [...faqs.questions, ...faqs.answers].find((text) =>
    FAQ_WIDGET_FRAGMENTS.some((frag) => text.toLowerCase().includes(frag)),
  );
  const shortAnswer = faqs.answers.find((a) => a.split(/\s+/).length < 12);
  push(
    faqs.questions.length === 6 && !widgetHit && !shortAnswer
      ? pass("C6", "FAQ source integrity", "content", "Six FAQs with substantive answers; no widget fragments.")
      : fail(
          "C6",
          "FAQ source integrity",
          "content",
          widgetHit ? `Widget fragment in FAQ: "${widgetHit}".` : shortAnswer ? `Stub answer (${shortAnswer.split(/\s+/).length} words).` : `${faqs.questions.length}/6 FAQs.`,
          widgetHit ?? shortAnswer,
        ),
  );

  // --- C7 Section 5 ---
  const selfUrl = storagelyUrl.trim();
  const nearbyArticles = [...html.matchAll(/<article\s+class=["']location-card["'][\s\S]*?<\/article>/gi)];
  let c7Fail: string | undefined;
  for (const article of nearbyArticles) {
    const link = article[0].match(/class=["']location-card__link["'][^>]*href=["']([^"']+)["']/i)?.[1]?.trim();
    if (link && selfUrl && link === selfUrl) {
      c7Fail = "Nearby card links to current facility URL.";
      break;
    }
    const h3 = article[0].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
    const nearbyCity = h3.split(",")[0]?.trim();
    if (nearbyCity.toLowerCase() === city.toLowerCase() && city && !/—|-\s*\w/.test(h3)) {
      c7Fail = `Same-city card needs branch disambiguation: "${h3}".`;
      break;
    }
  }
  push(
    !c7Fail
      ? pass("C7", "Section 5 self-reference", "content", "No self-links; same-city branches are disambiguated.")
      : fail("C7", "Section 5 self-reference", "content", c7Fail, c7Fail),
  );

  const map = parseGoogleMapsIframe(mapIframe);
  const isEmbedPb = /google\.com\/maps\/embed/i.test(map.detectedSrc) && /!3d/i.test(map.detectedSrc);
  const isLegacyQueryEmbed = /maps\.google\.com\/maps\?q=/i.test(map.detectedSrc);
  push(
    map.isValid && !isLegacyQueryEmbed
      ? pass("T-map-embed", "Google Maps embed quality", "structural", isEmbedPb ? "Proper maps/embed iframe with coordinates." : "Map iframe present.")
      : fail(
          "T-map-embed",
          "Google Maps embed quality",
          "structural",
          isLegacyQueryEmbed
            ? "Replace basic maps?q= embed with the full Google Maps Embed iframe (pb= coordinates)."
            : "Valid Google Maps iframe required.",
          map.detectedSrc.slice(0, 120),
        ),
  );
  push(
    map.isValid && map.hasLazyLoading && map.hasTitle && map.hasReferrerPolicy
      ? pass("map-attrs", "Map iframe attributes", "structural", `lazy=${map.hasLazyLoading}, title=${map.hasTitle}, referrerpolicy=${map.hasReferrerPolicy}`)
      : fail(
          "map-attrs",
          "Map iframe attributes",
          "structural",
          map.isValid
            ? `Missing map attributes (lazy=${map.hasLazyLoading}, title=${map.hasTitle}, referrer=${map.hasReferrerPolicy}).`
            : "Valid Google Maps iframe required.",
        ),
  );

  // --- J1 Schema blocks ---
  const blocks = parseEmbeddedJsonLd(html);
  const types = blocks.map((b) => (b as { "@type"?: string })["@type"]);
  push(
    blocks.length === 2 && types.includes("FAQPage") && types.includes("SelfStorage")
      ? pass("J1", "JSON-LD blocks present", "schema", "Exactly two valid JSON-LD blocks (FAQPage + SelfStorage).")
      : fail("J1", "JSON-LD blocks present", "schema", `Found ${blocks.length} JSON-LD block(s): ${types.join(", ")}.`),
  );

  // --- J2 FAQ match ---
  const faqSchema = findJsonLdByType(html, "FAQPage") as
    | { mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }
    | undefined;
  const normalizeFaq = (v: string) => v.replace(/®/g, "").replace(/\s+/g, " ").trim();
  const j2Match =
    faqSchema?.mainEntity?.length === faqs.questions.length &&
    faqSchema.mainEntity.every(
      (item, i) =>
        normalizeFaq(item.name) === normalizeFaq(faqs.questions[i] ?? "") &&
        normalizeFaq(item.acceptedAnswer.text) === normalizeFaq(faqs.answers[i] ?? ""),
    );
  push(
    j2Match
      ? pass("J2", "FAQPage matches visible FAQ", "schema", "FAQ JSON-LD matches Section 6 word-for-word.")
      : fail("J2", "FAQPage matches visible FAQ", "schema", "Visible FAQ copy does not match FAQPage schema."),
  );

  // --- J3 SelfStorage NAP ---
  const mapGeo = parseGeoFromMapEmbed(mapIframe);
  const schemaLat = (selfStorage as { geo?: { latitude?: number } })?.geo?.latitude;
  const schemaLng = (selfStorage as { geo?: { longitude?: number } })?.geo?.longitude;
  const areaServed = ((selfStorage as { areaServed?: { name?: string }[] })?.areaServed ?? []).map((a) =>
    (a.name ?? "").trim().toLowerCase(),
  );
  const dupArea = areaServed.length !== new Set(areaServed).size;
  const street = project?.existingContent.address ?? (selfStorage as { address?: { streetAddress?: string } })?.address?.streetAddress ?? "";
  push(
    !dupArea &&
      mapGeo &&
      typeof schemaLat === "number" &&
      typeof schemaLng === "number" &&
      Math.abs(schemaLat - mapGeo.latitude) < 0.000001 &&
      Math.abs(schemaLng - mapGeo.longitude) < 0.000001 &&
      schemaPhone === telDigits
      ? pass("J3", "SelfStorage NAP + geo", "schema", "Telephone, geo, and areaServed are consistent with inputs and map embed.")
      : fail(
          "J3",
          "SelfStorage NAP + geo",
          "schema",
          dupArea
            ? "Duplicate areaServed city entries."
            : `Geo/schema/phone mismatch (schema ${schemaPhone} vs CTA ${telDigits}). Address baseline: ${street.slice(0, 40)}.`,
        ),
  );

  // --- G1 Landmark collisions ---
  const section4 = sectionSlice(html, 4).replace(/<!--[\s\S]*?-->/g, "");
  const collisionHit = LANDMARK_COLLISION_PHRASES.find((p) => section4.toLowerCase().includes(p));
  push(
    !collisionHit
      ? pass("G1", "Section 4 landmark collisions", "judgment", "No flagged landmark identity collisions in Section 4.")
      : { ...fail("G1", "Section 4 landmark collisions", "judgment", `Flagged landmark "${collisionHit}" — verify distance or remove.`, collisionHit), overrideEligible: true },
  );

  // --- G2 Local content ---
  const namedPlaces = properNounCount(section4);
  const localRefs = project ? mergeLocalReferences(project.localContext).length : 0;
  push(
    namedPlaces >= 2
      ? pass("G2", "Section 4 local content", "judgment", `${namedPlaces} named place reference(s) in Section 4.`)
      : {
          ...fail("G2", "Section 4 local content", "judgment", `Only ${namedPlaces} named places in Section 4 (need ≥2). Project refs: ${localRefs}.`),
          overrideEligible: true,
        },
  );

  // --- G3 Storage fidelity ---
  const renderedTypes = [...html.matchAll(/<div\s+class=["']storage-card["'][\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map((m) =>
    m[1].replace(/<[^>]+>/g, "").trim(),
  );
  push(
    renderedTypes.length >= 3
      ? pass("G3", "Storage-type fidelity", "judgment", `${renderedTypes.length} storage types rendered — confirm against source content.`)
      : { ...fail("G3", "Storage-type fidelity", "judgment", "Too few storage types to validate source fidelity."), overrideEligible: true },
  );

  return checks;
};

export const validationGatePass = (checks: ValidationGateCheck[]): boolean => checks.every((c) => c.passed);

export const formatValidationGateReport = (
  checks: ValidationGateCheck[],
  meta: { facilityName: string; city: string; state: string; storagelyUrl: string },
): string => {
  const failed = checks.filter((c) => !c.passed);
  if (failed.length === 0) {
    return "[BUILD PASSED] — all checks green. Safe to publish.";
  }
  const byCategory = (cat: ValidationGateCategory) => failed.filter((c) => c.category === cat);
  const lines = [
    `[BUILD BLOCKED] — ${failed.length} check(s) failed`,
    `Page: ${meta.facilityName} | ${meta.city}, ${meta.state} | ${meta.storagelyUrl}`,
    "",
  ];
  const append = (title: string, cat: ValidationGateCategory) => {
    const items = byCategory(cat);
    if (items.length === 0) return;
    lines.push(title);
    items.forEach((c) => {
      lines.push(`- [${c.id}] ${c.message}${c.offendingValue ? ` (${c.offendingValue})` : ""}`);
    });
    lines.push("");
  };
  append("SAFETY-CRITICAL", "safety");
  append("STRUCTURAL", "structural");
  append("CONTENT", "content");
  append("SCHEMA", "schema");
  append("JUDGMENT (override-eligible)", "judgment");
  lines.push("Resolution: fix flagged items and re-run. Override-eligible items may be cleared with OVERRIDE:<checkID>:<reason>.");
  return lines.join("\n");
};

export const gateChecksToExportChecks = (checks: ValidationGateCheck[]): ExportCheck[] =>
  checks.map((c) => ({
    id: c.id,
    label: c.label,
    status: c.passed ? "pass" : "fail",
    message: c.message,
  }));

export const runValidationGateExportChecks = (input: ValidationGateInput): ExportCheck[] =>
  gateChecksToExportChecks(runValidationGate(input));

export const validationGateExportPass = (input: ValidationGateInput): boolean =>
  validationGatePass(runValidationGate(input));
