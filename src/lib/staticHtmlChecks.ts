import {
  auditFacilityHeadings,
  FACILITY_WIREframe_FAQ_COUNT,
  FACILITY_WIREframe_SECTION_SIGNALS,
  faqTextIncludesKeyword,
} from "./facilityWireframe";
import { isGenerationBlockedOutput } from "./myGarageGenerationSpec";
import { parseGeoFromMapEmbed } from "./templateJsonLd";
import { hasUnresolvedPlaceholderInHtml, parseGoogleMapsIframe } from "./validators";
import type { ExportCheck } from "../types/storiq";

export const makeExportCheck = (
  id: string,
  label: string,
  status: ExportCheck["status"],
  message: string,
): ExportCheck => ({ id, label, status, message });

export const countHtmlMatches = (value: string, pattern: RegExp): number => value.match(pattern)?.length ?? 0;

export const extractVisibleFaqText = (html: string): { questions: string[]; answers: string[] } => {
  const questions = [...html.matchAll(/<summary><h3>([\s\S]*?)<\/h3><\/summary>/gi)].map((match) =>
    match[1].replace(/<[^>]*>/g, "").trim(),
  );
  const answers = [...html.matchAll(/<summary><h3>[\s\S]*?<\/h3><\/summary>\s*<p>([\s\S]*?)<\/p>/gi)].map((match) =>
    match[1].replace(/<[^>]*>/g, "").trim(),
  );
  return { questions, answers };
};

export const parseEmbeddedJsonLd = (html: string): unknown[] => {
  const blocks: unknown[] = [];
  for (const match of html.matchAll(/<script\s+type=["']application\/ld\+json["']>\s*([\s\S]*?)<\/script>/gi)) {
    try {
      blocks.push(JSON.parse(match[1].trim()));
    } catch {
      /* skip malformed */
    }
  }
  return blocks;
};

export const findJsonLdByType = (html: string, type: string): Record<string, unknown> | undefined => {
  for (const block of parseEmbeddedJsonLd(html)) {
    if (block && typeof block === "object" && (block as { "@type"?: string })["@type"] === type) {
      return block as Record<string, unknown>;
    }
  }
  return undefined;
};

export const extractMapIframeFromHtml = (html: string): string => {
  const match = html.match(/<iframe\b[\s\S]*?<\/iframe>/i);
  if (!match) {
    return "";
  }
  return /google\.com\/maps\/embed/i.test(match[0]) ? match[0] : "";
};

const normalizeFaqCompareText = (value: string): string =>
  value.replace(/®/g, "").replace(/\s+/g, " ").trim();

export interface StaticHtmlCheckOptions {
  /** When set, nearby semantic <img> count must meet or exceed this. */
  expectedNearbyCards?: number;
  /** When set, storage-grid card count must match. */
  expectedStorageCards?: number;
  faqCity?: string;
  faqState?: string;
  primaryKeyword?: string;
  /** Compare visible FAQs to embedded FAQPage JSON-LD (golden / full-page exports). */
  matchEmbeddedFaqJsonLd?: boolean;
  /** Require SelfStorage geo to match map embed !2d/!3d. */
  verifySelfStorageGeoFromMap?: boolean;
  /** Named places that must appear in Section 4 copy (golden regression). */
  section4RequiredPhrases?: string[];
}

export const runStaticHtmlChecks = (html: string, options: StaticHtmlCheckOptions = {}): ExportCheck[] => {
  const checks: ExportCheck[] = [];

  if (isGenerationBlockedOutput(html)) {
    return [
      makeExportCheck(
        "generation-blocked",
        "Generation blocked",
        "fail",
        "Required inputs missing — complete the location wizard before exporting HTML.",
      ),
    ];
  }

  checks.push(
    makeExportCheck(
      "placeholders",
      "No unresolved placeholders",
      hasUnresolvedPlaceholderInHtml(html) ? "fail" : "pass",
      hasUnresolvedPlaceholderInHtml(html)
        ? "Unresolved tokens detected ([City], TODO, REPLACE_WITH_URL, undefined, null)."
        : "No placeholder tokens found.",
    ),
  );

  const h1Count = countHtmlMatches(html, /<h1[\s>]/gi);
  checks.push(
    makeExportCheck(
      "no-h1",
      "No H1 in template",
      h1Count === 0 ? "pass" : "fail",
      h1Count === 0 ? "No H1 in template (Storagely injects page H1)." : `Found ${h1Count} H1 tag(s) — remove from template.`,
    ),
  );

  const mainCount = countHtmlMatches(html, /<main\s+id=["']facility-template["']/gi);
  checks.push(
    makeExportCheck(
      "main-wrapper",
      "Exactly one main#facility-template",
      mainCount === 1 ? "pass" : "fail",
      `Found ${mainCount} main wrapper(s). Expected exactly 1.`,
    ),
  );

  const sections = [...FACILITY_WIREframe_SECTION_SIGNALS];
  const missing = sections.filter((s) => !html.includes(s));
  checks.push(
    makeExportCheck(
      "seven-sections",
      "7 wireframe sections",
      missing.length === 0 ? "pass" : "fail",
      missing.length === 0 ? "All 7 client wireframe sections present." : `Missing: ${missing.join(", ")}.`,
    ),
  );

  const headingAudit = auditFacilityHeadings(html);
  checks.push(
    makeExportCheck(
      "heading-hierarchy",
      "H2/H3 wireframe headings",
      headingAudit.valid ? "pass" : "fail",
      headingAudit.message,
    ),
  );

  const visible = extractVisibleFaqText(html);
  if (options.matchEmbeddedFaqJsonLd) {
    try {
      const faqSchema = findJsonLdByType(html, "FAQPage") as
        | { mainEntity?: { name: string; acceptedAnswer: { text: string } }[] }
        | undefined;
      const entities = faqSchema?.mainEntity ?? [];
      const matches =
        entities.length === visible.questions.length &&
        entities.every(
          (item, i) =>
            normalizeFaqCompareText(item.name) === normalizeFaqCompareText(visible.questions[i] ?? "") &&
            normalizeFaqCompareText(item.acceptedAnswer.text) === normalizeFaqCompareText(visible.answers[i] ?? ""),
        );
      checks.push(
        makeExportCheck(
          "faq-match",
          "FAQ text matches JSON-LD",
          matches ? "pass" : "fail",
          matches ? "Visible FAQ matches FAQPage schema." : "FAQ visible copy does not match embedded FAQPage JSON-LD.",
        ),
      );
    } catch {
      checks.push(makeExportCheck("faq-match", "FAQ text matches JSON-LD", "fail", "FAQPage JSON-LD could not be parsed."));
    }
  }

  if (options.faqCity && options.faqState) {
    const locality = `${options.faqCity}, ${options.faqState}`.toLowerCase();
    const pairedCount = visible.questions.filter((q, i) => {
      const a = visible.answers[i] ?? "";
      const blob = `${q} ${a}`.toLowerCase();
      return (
        blob.includes(locality) ||
        faqTextIncludesKeyword(q, options.primaryKeyword ?? "", options.faqCity!, options.faqState!) ||
        faqTextIncludesKeyword(a, options.primaryKeyword ?? "", options.faqCity!, options.faqState!)
      );
    }).length;
    checks.push(
      makeExportCheck(
        "faq-local-keyword",
        "FAQs include local keyword",
        pairedCount === FACILITY_WIREframe_FAQ_COUNT ? "pass" : "fail",
        pairedCount === FACILITY_WIREframe_FAQ_COUNT
          ? `All ${FACILITY_WIREframe_FAQ_COUNT} FAQs include the local keyword for ${options.faqCity}, ${options.faqState}.`
          : `${pairedCount}/${FACILITY_WIREframe_FAQ_COUNT} FAQs include the local keyword.`,
      ),
    );
  }

  const faqDetailsCount = countHtmlMatches(html, /<details\s+class=["']faq-item["']/gi);
  checks.push(
    makeExportCheck(
      "faq-count",
      "Six FAQ items",
      faqDetailsCount === FACILITY_WIREframe_FAQ_COUNT ? "pass" : "fail",
      `${faqDetailsCount} FAQ item(s) (expected ${FACILITY_WIREframe_FAQ_COUNT}).`,
    ),
  );

  const legacyNearbyBackground = /--img-loc-|background-image:\s*var\(--img-loc/i.test(html);
  checks.push(
    makeExportCheck(
      "no-legacy-nearby-bg",
      "No legacy Section 5 CSS backgrounds",
      legacyNearbyBackground ? "fail" : "pass",
      legacyNearbyBackground
        ? "Found --img-loc-* or CSS background nearby images — use semantic <img class=\"location-card__image\"> per system-prompt-v2."
        : "No legacy nearby background-image pattern.",
    ),
  );

  const nearbyDivRoleImg = countHtmlMatches(
    html,
    /<div[^>]*class=["'][^"']*location-card__image[^"']*["'][^>]*role=["']img["']/gi,
  );
  checks.push(
    makeExportCheck(
      "no-nearby-div-role-img",
      "Nearby cards are not div role=img",
      nearbyDivRoleImg === 0 ? "pass" : "fail",
      nearbyDivRoleImg === 0
        ? "Nearby cards use semantic <img> (not div background placeholders)."
        : `${nearbyDivRoleImg} nearby card(s) still use <div role=\"img\"> — replace with <img>.`,
    ),
  );

  const section1AmenityItems = (html.match(/<!-- SECTION 1[\s\S]*?<ul class="facility-list">([\s\S]*?)<\/ul>/i)?.[1]?.match(/<li>/gi) ?? []).length;
  checks.push(
    makeExportCheck(
      "section1-amenity-count",
      "Section 1 has 8–12 amenities",
      section1AmenityItems >= 8 && section1AmenityItems <= 12 ? "pass" : section1AmenityItems === 0 ? "fail" : "warning",
      section1AmenityItems === 0
        ? "Section 1 amenity list is empty."
        : `${section1AmenityItems} amenities in Section 1 (spec: 8–12 distinct).`,
    ),
  );

  const nearbySemanticImg = countHtmlMatches(html, /<img\b[^>]*class=["'][^"']*location-card__image/gi);
  const expectedNearby = options.expectedNearbyCards ?? 0;
  checks.push(
    makeExportCheck(
      "nearby-semantic-img",
      "Nearby cards use semantic img",
      expectedNearby === 0
        ? nearbySemanticImg > 0
          ? "pass"
          : "warning"
        : nearbySemanticImg >= expectedNearby
          ? "pass"
          : "fail",
      expectedNearby === 0
        ? `${nearbySemanticImg} nearby <img class="location-card__image"> tag(s).`
        : `${nearbySemanticImg}/${expectedNearby} nearby cards use <img class="location-card__image">.`,
    ),
  );

  if (options.expectedStorageCards !== undefined) {
    const storageCards = countHtmlMatches(html, /<div\s+class=["']storage-card["']/gi);
    checks.push(
      makeExportCheck(
        "storage-card-count",
        "Storage type cards",
        storageCards === options.expectedStorageCards ? "pass" : "fail",
        `${storageCards} storage card(s) (expected ${options.expectedStorageCards}).`,
      ),
    );
  }

  checks.push(
    makeExportCheck(
      "faqpage-jsonld",
      "FAQPage JSON-LD present",
      Boolean(findJsonLdByType(html, "FAQPage")) ? "pass" : "fail",
      Boolean(findJsonLdByType(html, "FAQPage")) ? "FAQPage schema block found." : "FAQPage JSON-LD is missing.",
    ),
  );

  checks.push(
    makeExportCheck(
      "self-storage-jsonld",
      "SelfStorage JSON-LD present",
      Boolean(findJsonLdByType(html, "SelfStorage")) ? "pass" : "fail",
      Boolean(findJsonLdByType(html, "SelfStorage")) ? "SelfStorage schema block found." : "SelfStorage JSON-LD is missing.",
    ),
  );

  if (options.verifySelfStorageGeoFromMap) {
    const selfStorage = findJsonLdByType(html, "SelfStorage") as
      | { geo?: { latitude?: number; longitude?: number } }
      | undefined;
    const mapIframe = extractMapIframeFromHtml(html);
    const mapGeo = parseGeoFromMapEmbed(mapIframe);
    const lat = selfStorage?.geo?.latitude;
    const lng = selfStorage?.geo?.longitude;
    const geoOk =
      typeof lat === "number" &&
      typeof lng === "number" &&
      mapGeo !== undefined &&
      Math.abs(lat - mapGeo.latitude) < 0.000001 &&
      Math.abs(lng - mapGeo.longitude) < 0.000001;
    checks.push(
      makeExportCheck(
        "self-storage-geo",
        "SelfStorage geo matches map embed",
        geoOk ? "pass" : "fail",
        geoOk
          ? `Geo ${lat}, ${lng} matches map embed.`
          : "SelfStorage latitude/longitude must match Google Maps embed !2d/!3d coordinates.",
      ),
    );
  }

  checks.push(
    makeExportCheck(
      "no-meta-description",
      "No meta description in template",
      /<meta\s+name=["']description["']/i.test(html) ? "fail" : "pass",
      /<meta\s+name=["']description["']/i.test(html)
        ? "Meta description must not be in template output (managed outside generator)."
        : "No meta description tag in export.",
    ),
  );

  const imageTags = countHtmlMatches(html, /<img\b/gi);
  const withAlt = countHtmlMatches(html, /<img\b(?=[^>]*\salt=["'][^"']+["'])/gi);
  checks.push(
    makeExportCheck(
      "image-alt",
      "All images have alt text",
      imageTags > 0 && imageTags === withAlt ? "pass" : imageTags === 0 ? "warning" : "fail",
      `${withAlt}/${imageTags} images include alt attributes.`,
    ),
  );

  const lazy = countHtmlMatches(html, /<img\b(?=[^>]*\sloading=["']lazy["'])/gi);
  const async = countHtmlMatches(html, /<img\b(?=[^>]*\sdecoding=["']async["'])/gi);
  const sized = countHtmlMatches(html, /<img\b(?=[^>]*\swidth=)(?=[^>]*\sheight=)/gi);
  checks.push(
    makeExportCheck(
      "image-perf",
      "Images: lazy, async, width, height",
      imageTags > 0 && lazy === imageTags && async === imageTags && sized === imageTags ? "pass" : "warning",
      `${lazy}/${imageTags} lazy, ${async}/${imageTags} async, ${sized}/${imageTags} sized.`,
    ),
  );

  const mapIframe = extractMapIframeFromHtml(html);
  const map = parseGoogleMapsIframe(mapIframe);
  checks.push(
    makeExportCheck(
      "map-attrs",
      "Map iframe attributes",
      map.isValid && map.hasLazyLoading && map.hasTitle && map.hasReferrerPolicy
        ? "pass"
        : map.isValid
          ? "warning"
          : "fail",
      map.isValid
        ? `lazy=${map.hasLazyLoading}, title=${map.hasTitle}, referrerpolicy=${map.hasReferrerPolicy}`
        : "Valid Google Maps iframe required.",
    ),
  );

  if (options.section4RequiredPhrases?.length) {
    const section4 = html.match(/<!-- SECTION 4[\s\S]*?<!-- SECTION 5/i)?.[0] ?? "";
    const missingPhrases = options.section4RequiredPhrases.filter((phrase) => !section4.includes(phrase));
    checks.push(
      makeExportCheck(
        "section4-landmarks",
        "Section 4 named local places",
        missingPhrases.length === 0 ? "pass" : "fail",
        missingPhrases.length === 0
          ? `${options.section4RequiredPhrases.length} required landmark phrase(s) present in Section 4.`
          : `Missing in Section 4: ${missingPhrases.join(", ")}.`,
      ),
    );
  }

  return checks;
};

export const staticHtmlChecksPass = (checks: ExportCheck[]): boolean => !checks.some((c) => c.status === "fail");
