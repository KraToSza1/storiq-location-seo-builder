import { hasUnresolvedPlaceholderInHtml, parseGoogleMapsIframe } from "./validators";
import { resolvePublishAssetBaseUrl } from "./assetUrls";
import { defaultSettings } from "./projectDefaults";
import { renderFaqJsonLd, renderStoragelyHtml } from "./templateRenderer";
import { defaultFacilities } from "./facilityLibrary";
import { auditFacilityHeadings, FACILITY_WIREframe_SECTION_SIGNALS, VALUE_PROPOSITION_OPENING } from "./facilityWireframe";
import { containsPromotionalLanguage, isGenerationBlockedOutput } from "./myGarageGenerationSpec";
import { defaultImages, getStorageImageById } from "./imageLibrary";
import { mergeLocalReferences } from "./localContextUtils";
import type { AuditStatus, LocationProject, NearbyFacility, SEOAuditCheck } from "../types/storiq";

const makeCheck = (
  id: string,
  label: string,
  status: AuditStatus,
  message: string,
  fixSuggestion?: string,
): SEOAuditCheck => ({
  id,
  label,
  status,
  message,
  fixSuggestion,
});

const countMatches = (value: string, pattern: RegExp): number => value.match(pattern)?.length ?? 0;

const visibleFaqText = (html: string): { questions: string[]; answers: string[] } => {
  const questions = [...html.matchAll(/<summary><h3>([\s\S]*?)<\/h3><\/summary>/gi)].map((match) =>
    match[1].replace(/<[^>]*>/g, "").trim(),
  );
  const answers = [...html.matchAll(/<summary><h3>[\s\S]*?<\/h3><\/summary>\s*<p>([\s\S]*?)<\/p>/gi)].map((match) =>
    match[1].replace(/<[^>]*>/g, "").trim(),
  );

  return { questions, answers };
};

const scoreChecks = (checks: SEOAuditCheck[]): number => {
  if (checks.length === 0) {
    return 0;
  }

  const points = checks.reduce((total, check) => {
    if (check.status === "pass") return total + 1;
    if (check.status === "warning") return total + 0.55;
    return total;
  }, 0);

  return Math.round((points / checks.length) * 100);
};

export const runSEOAudit = (
  project: LocationProject,
  html = renderStoragelyHtml(project, defaultFacilities, defaultImages, resolvePublishAssetBaseUrl(defaultSettings)),
  facilities: NearbyFacility[] = defaultFacilities,
  images = defaultImages,
) => {
  const checks: SEOAuditCheck[] = [];

  if (isGenerationBlockedOutput(html)) {
    return {
      score: 0,
      checks: [
        makeCheck(
          "generation-blocked",
          "Generation blocked",
          "fail",
          "Required inputs are missing — complete the wizard before export.",
          "Fill city, state, keyword, map iframe, raw content, address, storage types, and nearby locations.",
        ),
      ],
    };
  }

  const keyword = project.seo.primaryKeyword.toLowerCase();
  const city = project.locationIdentity.city.toLowerCase();
  const state = project.locationIdentity.state.toLowerCase();
  const map = parseGoogleMapsIframe(project.googleMaps.iframeCode);
  const selectedImages = project.selectedStorageImages.map((id) => getStorageImageById(images, id)).filter(Boolean);
  const selectedFacilities = project.selectedNearbyLocations
    .map((id) => facilities.find((facility) => facility.id === id))
    .filter(Boolean);

  checks.push(
    makeCheck(
      "keyword-exists",
      "Primary keyword exists",
      project.seo.primaryKeyword.trim() ? "pass" : "fail",
      project.seo.primaryKeyword.trim() ? "Primary keyword is present." : "Primary keyword is missing.",
      "Add or auto-generate the primary keyword from city and state.",
    ),
  );

  const keywordIncludesPlace = Boolean(keyword && city && state && keyword.includes(city) && keyword.includes(state));
  checks.push(
    makeCheck(
      "keyword-place",
      "Keyword includes city and state",
      keywordIncludesPlace ? "pass" : "fail",
      keywordIncludesPlace ? "Primary keyword includes city and state." : "Primary keyword should include city and state.",
      "Use the default pattern: self storage units in {City}, {State}.",
    ),
  );

  const expectedSectionSignals = [...FACILITY_WIREframe_SECTION_SIGNALS];
  const missingSections = expectedSectionSignals.filter((section) => !html.includes(section));
  checks.push(
    makeCheck(
      "seven-sections",
      "7 wireframe sections exist",
      missingSections.length === 0 ? "pass" : "fail",
      missingSections.length === 0
        ? "All 7 client wireframe sections are present."
        : `Missing section signals: ${missingSections.join(", ")}.`,
      "Regenerate the deterministic HTML template.",
    ),
  );

  checks.push(
    makeCheck(
      "no-h1",
      "No H1 in template",
      /<h1[\s>]/i.test(html) ? "fail" : "pass",
      /<h1[\s>]/i.test(html) ? "Template must not include H1 — Storagely injects it." : "No H1 in template output.",
    ),
  );

  const valuePropStartsCorrectly = html.includes(VALUE_PROPOSITION_OPENING);
  checks.push(
    makeCheck(
      "value-prop-opening",
      "Value prop opens with brand line",
      valuePropStartsCorrectly ? "pass" : "warning",
      valuePropStartsCorrectly
        ? `Value proposition paragraph starts with "${VALUE_PROPOSITION_OPENING}".`
        : `Value proposition should start with "${VALUE_PROPOSITION_OPENING}".`,
      "Regenerate Section 2 draft copy.",
    ),
  );

  const promoInContent =
    containsPromotionalLanguage(project.existingContent.rawContent) ||
    containsPromotionalLanguage(html);
  checks.push(
    makeCheck(
      "no-promos",
      "No promotional language",
      promoInContent ? "warning" : "pass",
      promoInContent
        ? "Promotional or pricing language detected — remove before publish."
        : "No promotional language detected.",
      "Strip % off, first month free, and $/month offers from content.",
    ),
  );

  const headingAudit = auditFacilityHeadings(html);
  checks.push(
    makeCheck(
      "heading-hierarchy",
      "H2/H3 wireframe headings",
      headingAudit.valid ? "pass" : "fail",
      headingAudit.message,
      headingAudit.valid ? undefined : "Complete storage cards, nearby locations, and 6 FAQs before export.",
    ),
  );

  const imageTags = countMatches(html, /<img\b/gi);
  const imagesWithAlt = countMatches(html, /<img\b(?=[^>]*\salt=["'][^"']+["'])/gi);
  checks.push(
    makeCheck(
      "image-alt",
      "Every image has alt text",
      imageTags === imagesWithAlt ? "pass" : "fail",
      `${imagesWithAlt} of ${imageTags} image(s) include alt text.`,
      "Add alt text to all storage and facility images.",
    ),
  );

  const placeText = `${project.locationIdentity.city}, ${project.locationIdentity.state}`.toLowerCase();
  const storageAltIncludesPlace = selectedImages.length > 0 && selectedImages.every((image) => {
    const category = image?.category ?? "";
    const categoryIndex = html.toLowerCase().indexOf(category.toLowerCase());
    const localHtml = categoryIndex >= 0 ? html.slice(Math.max(0, categoryIndex - 600), categoryIndex + 600).toLowerCase() : html.toLowerCase();
    return localHtml.includes(placeText);
  });
  checks.push(
    makeCheck(
      "storage-alt-place",
      "Storage image alt text includes City, State",
      storageAltIncludesPlace ? "pass" : "warning",
      storageAltIncludesPlace
        ? "Storage image alt text includes the city and state."
        : "Storage image alt text should include the city and state.",
      "Use alt text: [Type] self storage units in [City, State].",
    ),
  );

  const lazyCount = countMatches(html, /<img\b(?=[^>]*\sloading=["']lazy["'])/gi);
  const asyncCount = countMatches(html, /<img\b(?=[^>]*\sdecoding=["']async["'])/gi);
  const sizedCount = countMatches(html, /<img\b(?=[^>]*\swidth=["']?\d+["']?)(?=[^>]*\sheight=["']?\d+["']?)/gi);
  checks.push(
    makeCheck(
      "image-performance",
      "Images include lazy, async, width, height",
      imageTags === lazyCount && imageTags === asyncCount && imageTags === sizedCount ? "pass" : "warning",
      `${lazyCount}/${imageTags} lazy, ${asyncCount}/${imageTags} async, ${sizedCount}/${imageTags} sized.`,
      "Ensure every image includes loading, decoding, width, and height attributes.",
    ),
  );

  const linkedWithoutDestination = selectedImages.some((image) => {
    if (!image || image.destinationUrl) return false;
    const escapedCategory = image.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`<h3>\\s*<a[^>]*>\\s*${escapedCategory}\\s*</a>\\s*</h3>`, "i").test(html);
  });
  checks.push(
    makeCheck(
      "storage-link-rules",
      "Storage heading link rules",
      linkedWithoutDestination ? "fail" : "pass",
      linkedWithoutDestination
        ? "A storage H3 appears linked without a destination URL."
        : "Storage H3 links are only used when destination URLs exist.",
      "Keep H3 headings plain text when destinationUrl is missing.",
    ),
  );

  if (mergeLocalReferences(project.localContext).length > 0) {
    checks.push(
      makeCheck(
        "landmark-distance",
        "Landmark distance verification",
        "warning",
        "Manual verification required for all listed landmarks within 10 miles / 16 km.",
        "Use Google Maps or a distance API in Phase 2 before claiming verification.",
      ),
    );
  }

  const currentUrl = project.locationIdentity.storagelyPageUrl.trim().toLowerCase();
  const currentFacility = project.locationIdentity.facilityName.trim().toLowerCase();
  const selfLinked = selectedFacilities.some((facility) => {
    if (!facility) return false;
    return facility.storagelyUrl.toLowerCase() === currentUrl || facility.facilityName.toLowerCase() === currentFacility;
  });
  checks.push(
    makeCheck(
      "nearby-self-link",
      "Nearby section avoids self-linking",
      selfLinked ? "fail" : "pass",
      selfLinked ? "A nearby card links to the current facility." : "No selected nearby facility matches the current location.",
      "Remove the current facility from nearby location selections.",
    ),
  );

  const faqJsonLd = renderFaqJsonLd(project, images);
  checks.push(
    makeCheck(
      "faq-jsonld",
      "FAQPage JSON-LD exists",
      faqJsonLd.includes('"@type": "FAQPage"') ? "pass" : "fail",
      faqJsonLd.includes('"@type": "FAQPage"') ? "FAQPage JSON-LD exists." : "FAQPage JSON-LD is missing.",
      "Regenerate the FAQ JSON-LD block.",
    ),
  );

  const visibleFaq = visibleFaqText(html);
  const schema = JSON.parse(faqJsonLd) as {
    mainEntity: { name: string; acceptedAnswer: { text: string } }[];
  };
  const schemaMatchesVisible =
    schema.mainEntity.length === visibleFaq.questions.length &&
    schema.mainEntity.every(
      (item, index) =>
        item.name === visibleFaq.questions[index] && item.acceptedAnswer.text === visibleFaq.answers[index],
    );
  checks.push(
    makeCheck(
      "faq-schema-match",
      "FAQ schema matches visible FAQs",
      schemaMatchesVisible ? "pass" : "fail",
      schemaMatchesVisible
        ? "FAQ JSON-LD questions and answers match the visible FAQ copy."
        : "FAQ JSON-LD does not match visible FAQ copy.",
      "Regenerate visible FAQ and JSON-LD from the same source data.",
    ),
  );

  checks.push(
    makeCheck(
      "map-exists",
      "Google Maps iframe exists",
      map.isValid ? "pass" : "fail",
      map.isValid ? "Valid Google Maps iframe detected." : "Google Maps iframe is missing or invalid.",
      "Paste the full Google Maps iframe embed code.",
    ),
  );

  checks.push(
    makeCheck(
      "map-attributes",
      "Map iframe has lazy, title, referrerpolicy",
      map.hasLazyLoading && map.hasTitle && map.hasReferrerPolicy ? "pass" : "warning",
      `Map attributes: lazy=${map.hasLazyLoading ? "yes" : "no"}, title=${map.hasTitle ? "yes" : "no"}, referrerpolicy=${map.hasReferrerPolicy ? "yes" : "no"}.`,
      "Add loading=\"lazy\", title, and referrerpolicy attributes to the iframe.",
    ),
  );

  checks.push(
    makeCheck(
      "main-wrapper",
      "Main wrapper exists",
      /<main\s+id=["']facility-template["']\s+class=["']facility-template["']>/i.test(html) ? "pass" : "fail",
      "The export should contain one main wrapper with id=\"facility-template\".",
      "Regenerate the deterministic HTML template.",
    ),
  );

  checks.push(
    makeCheck(
      "scoped-css",
      "CSS is scoped",
      /#facility-template/.test(html) ? "pass" : "fail",
      "Scoped CSS selector #facility-template was detected.",
      "Keep all exported CSS scoped to #facility-template.",
    ),
  );

  checks.push(
    makeCheck(
      "placeholders",
      "No unresolved placeholders",
      hasUnresolvedPlaceholderInHtml(html) ? "fail" : "pass",
      hasUnresolvedPlaceholderInHtml(html)
        ? "Unresolved placeholder-like text was detected."
        : "No unresolved placeholder tokens were detected.",
      "Replace bracketed placeholders, TODOs, and REPLACE_WITH_URL before export.",
    ),
  );

  return {
    score: scoreChecks(checks),
    checks,
  };
};
