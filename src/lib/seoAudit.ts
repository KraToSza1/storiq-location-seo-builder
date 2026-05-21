import { hasUnresolvedPlaceholderInHtml, parseGoogleMapsIframe } from "./validators";
import { renderFaqJsonLd, renderStoragelyHtml } from "./templateRenderer";
import { defaultFacilities } from "./facilityLibrary";
import { defaultImages, getStorageImageById } from "./imageLibrary";
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
  html = renderStoragelyHtml(project),
  facilities: NearbyFacility[] = defaultFacilities,
  images = defaultImages,
) => {
  const checks: SEOAuditCheck[] = [];
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

  const expectedSectionSignals = [
    "Features &amp; Amenities",
    "Why Choose",
    "Types of Self Storage",
    "Serving",
    "Other Nearby Locations at My Garage",
    "FAQs about Self Storage",
    "map-section",
  ];
  const missingSections = expectedSectionSignals.filter((section) => !html.includes(section));
  checks.push(
    makeCheck(
      "seven-sections",
      "7 page sections exist",
      missingSections.length === 0 ? "pass" : "fail",
      missingSections.length === 0
        ? "All 7 required page sections are present."
        : `Missing section signals: ${missingSections.join(", ")}.`,
      "Regenerate the deterministic HTML template.",
    ),
  );

  const h2Count = countMatches(html, /<h2[\s>]/gi);
  checks.push(
    makeCheck(
      "h2-count",
      "Page uses 7 H2 sections",
      h2Count === 7 ? "pass" : "fail",
      `Detected ${h2Count} H2 headings.`,
      "The page template should render exactly 7 H2 headings.",
    ),
  );

  const hasStorageH3 = project.selectedStorageImages.length > 0 && countMatches(html, /storage-card[\s\S]*?<h3/gi) > 0;
  checks.push(
    makeCheck(
      "storage-h3",
      "Storage cards use H3",
      hasStorageH3 ? "pass" : "fail",
      hasStorageH3 ? "Storage type cards use H3 headings." : "No H3 storage card headings were detected.",
      "Select at least one storage type card.",
    ),
  );

  const nearbyH3Count = countMatches(html, /location-card__content[\s\S]*?<h3/gi);
  checks.push(
    makeCheck(
      "nearby-h3",
      "Nearby cards use H3",
      nearbyH3Count >= 1 ? "pass" : "fail",
      `Detected ${nearbyH3Count} nearby H3 heading group(s).`,
      "Select nearby facilities before export.",
    ),
  );

  const faqH3Count = countMatches(html, /<summary><h3>/gi);
  checks.push(
    makeCheck(
      "faq-h3",
      "FAQ questions use H3 inside summary",
      faqH3Count >= 1 ? "pass" : "fail",
      `Detected ${faqH3Count} FAQ summary H3 heading(s).`,
      "Regenerate the FAQ section.",
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
      "Use image alt text in the form: Storage type in City, State.",
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

  if (project.localContext.landmarks.length > 0) {
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
