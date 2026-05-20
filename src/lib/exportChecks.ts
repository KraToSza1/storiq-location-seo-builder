import { hasUnresolvedPlaceholderInHtml, parseGoogleMapsIframe } from "./validators";
import { renderFaqJsonLd } from "./templateRenderer";
import type { ExportCheck, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";
import { getStorageImageById } from "./imageLibrary";

const makeCheck = (id: string, label: string, status: ExportCheck["status"], message: string): ExportCheck => ({
  id,
  label,
  status,
  message,
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

export const buildExportFilename = (project: LocationProject): string => {
  const slug = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "location";

  return `storiq-${slug(project.locationIdentity.city)}-${slug(project.locationIdentity.state)}-${slug(project.locationIdentity.facilityName)}.html`;
};

export const runExportChecks = (
  project: LocationProject,
  html: string,
  images: StorageImage[],
  facilities: NearbyFacility[],
): ExportCheck[] => {
  const checks: ExportCheck[] = [];
  const map = parseGoogleMapsIframe(project.googleMaps.iframeCode);
  const selectedImages = project.selectedStorageImages
    .map((id) => getStorageImageById(images, id))
    .filter((image): image is StorageImage => Boolean(image));
  const selectedFacilities = project.selectedNearbyLocations
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is NearbyFacility => Boolean(f));

  checks.push(
    makeCheck(
      "placeholders",
      "No unresolved placeholders",
      hasUnresolvedPlaceholderInHtml(html) ? "fail" : "pass",
      hasUnresolvedPlaceholderInHtml(html)
        ? "Unresolved tokens detected ([City], TODO, REPLACE_WITH_URL, undefined, null)."
        : "No placeholder tokens found.",
    ),
  );

  const mainCount = countMatches(html, /<main\s+id=["']facility-template["']/gi);
  checks.push(
    makeCheck(
      "main-wrapper",
      "Exactly one main#facility-template",
      mainCount === 1 ? "pass" : "fail",
      `Found ${mainCount} main wrapper(s). Expected exactly 1.`,
    ),
  );

  const sections = [
    "Features &amp; Amenities",
    "Why Choose",
    "Types of Storage",
    "Serving",
    "Other Nearby Locations at My Garage",
    "FAQs",
    "Map + Location + CTA",
  ];
  const missing = sections.filter((s) => !html.includes(s));
  checks.push(
    makeCheck(
      "seven-sections",
      "7 expected sections",
      missing.length === 0 ? "pass" : "fail",
      missing.length === 0 ? "All 7 sections present." : `Missing: ${missing.join(", ")}.`,
    ),
  );

  try {
    const faqJsonLd = renderFaqJsonLd(project);
    const visible = visibleFaqText(html);
    const schema = JSON.parse(faqJsonLd) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
    const matches =
      schema.mainEntity.length === visible.questions.length &&
      schema.mainEntity.every(
        (item, i) => item.name === visible.questions[i] && item.acceptedAnswer.text === visible.answers[i],
      );
    checks.push(
      makeCheck(
        "faq-match",
        "FAQ text matches JSON-LD",
        matches ? "pass" : "fail",
        matches ? "Visible FAQ matches FAQPage schema." : "FAQ visible copy does not match JSON-LD.",
      ),
    );
  } catch {
    checks.push(makeCheck("faq-match", "FAQ text matches JSON-LD", "fail", "FAQ JSON-LD could not be parsed."));
  }

  const imageTags = countMatches(html, /<img\b/gi);
  const withAlt = countMatches(html, /<img\b(?=[^>]*\salt=["'][^"']+["'])/gi);
  checks.push(
    makeCheck(
      "image-alt",
      "All images have alt text",
      imageTags > 0 && imageTags === withAlt ? "pass" : imageTags === 0 ? "warning" : "fail",
      `${withAlt}/${imageTags} images include alt attributes.`,
    ),
  );

  const lazy = countMatches(html, /<img\b(?=[^>]*\sloading=["']lazy["'])/gi);
  const async = countMatches(html, /<img\b(?=[^>]*\sdecoding=["']async["'])/gi);
  const sized = countMatches(html, /<img\b(?=[^>]*\swidth=)(?=[^>]*\sheight=)/gi);
  checks.push(
    makeCheck(
      "image-perf",
      "Images: lazy, async, width, height",
      imageTags > 0 && lazy === imageTags && async === imageTags && sized === imageTags ? "pass" : "warning",
      `${lazy}/${imageTags} lazy, ${async}/${imageTags} async, ${sized}/${imageTags} sized.`,
    ),
  );

  selectedImages.forEach((image) => {
    const place = `${project.locationIdentity.city}, ${project.locationIdentity.state}`.toLowerCase();
    if (place.replace(/,\s*/g, "").length > 2 && !image.altText.toLowerCase().includes(project.locationIdentity.city.toLowerCase())) {
      checks.push(
        makeCheck(
          `alt-place-${image.id}`,
          `Alt includes city/state: ${image.category}`,
          "warning",
          `Alt text for ${image.category} should include ${project.locationIdentity.city}, ${project.locationIdentity.state}.`,
        ),
      );
    }
  });

  checks.push(
    makeCheck(
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

  selectedFacilities.forEach((facility) => {
    if (!facility.imageUrl) {
      checks.push(
        makeCheck(
          `nearby-img-${facility.id}`,
          `Nearby image: ${facility.facilityName}`,
          "warning",
          `${facility.facilityName} has no image in the facility library.`,
        ),
      );
    }
    if (!facility.storagelyUrl) {
      checks.push(
        makeCheck(
          `nearby-url-${facility.id}`,
          `Nearby URL: ${facility.facilityName}`,
          "fail",
          `${facility.facilityName} has no Storagely URL.`,
        ),
      );
    }
  });

  return checks;
};

export const exportChecksPass = (checks: ExportCheck[]): boolean => !checks.some((c) => c.status === "fail");
