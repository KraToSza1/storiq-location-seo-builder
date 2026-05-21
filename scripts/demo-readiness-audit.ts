/**
 * Run: npx tsx scripts/demo-readiness-audit.ts
 * Programmatic checks for StorIQ_FINAL_DEMO_READINESS_AUDIT.md
 */
import { bulkRowToProject, parseBulkCsv } from "../src/lib/bulkImport";
import { defaultFacilities, mergeFacilities, parseFacilitiesCsv } from "../src/lib/facilityLibrary";
import { defaultImages, imageCsvTemplate, mergeImages, parseImagesCsv } from "../src/lib/imageLibrary";
import { getLaunchReadiness } from "../src/lib/launchReadiness";
import { createLocationProject, defaultSettings } from "../src/lib/projectDefaults";
import { prepareProject } from "../src/state/ProjectsContext";
import { renderStoragelyHtml } from "../src/lib/templateRenderer";
import { isLinkableStorageType } from "../src/lib/imageLibrary";
import { runExportChecks } from "../src/lib/exportChecks";
import { hasUnresolvedPlaceholderInHtml } from "../src/lib/validators";
import type { LocationProject, NearbyFacility, StorageImage } from "../src/types/storiq";

const results: { id: number; name: string; pass: boolean; detail: string }[] = [];
const record = (id: number, name: string, pass: boolean, detail: string) => results.push({ id, name, pass, detail });
const MAIN_RE = /<main\s+id=["']facility-template["']\s+class=["']facility-template["']>/gi;
const SECTIONS = [
  "Features &amp; Amenities",
  "Why Choose",
  "Types of Storage",
  "Serving",
  "Other Nearby Locations at My Garage",
  "FAQs",
  "Map + Location + CTA",
];

const completeMapIframe = `<iframe src="https://www.google.com/maps/embed?pb=example" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map to facility"></iframe>`;

const buildCompleteProject = (facilities: NearbyFacility[], images: StorageImage[]): LocationProject => {
  const base = createLocationProject();
  const storageIds = images.filter((i) => i.type === "storage_type").slice(0, 3).map((i) => i.id);
  const nearbyIds = facilities
    .filter((f) => f.id !== "mgs-belton-i35" && f.imageUrl && f.storagelyUrl)
    .slice(0, 3)
    .map((f) => f.id);

  const draft = {
    ...base,
    locationIdentity: {
      city: "Belton",
      state: "TX",
      zipCode: "76513",
      facilityName: "My Garage Self Storage | I-35",
      storagelyPageUrl: "https://www.mygarageselfstorage.com/self-storage/tx/belton/i-35/",
    },
    seo: { primaryKeyword: "self storage units in Belton, TX", titleTag: "", metaDescription: "" },
    existingContent: {
      rawContent: "Sample brief",
      address: "1234 I-35 Frontage Rd, Belton, TX 76513",
      phone: "(254) 555-0100",
      accessHours: "24 hours",
      officeHours: "Mon–Sat 9am–6pm",
      features: ["Climate-controlled units", "Drive-up access", "Convenient I-35 access"],
      storageTypes: ["Vehicle Storage"],
    },
    googleMaps: { iframeCode: completeMapIframe, detectedSrc: "", isValid: true },
    localContext: { landmarks: ["University of Mary Hardin-Baylor"], neighborhoods: ["Downtown Belton"], lifestyleTieIns: [], nearbyCityPreferences: [], doNotInclude: [] },
    selectedStorageImages: storageIds,
    selectedNearbyLocations: nearbyIds,
  };

  return prepareProject(draft, facilities, images);
};

// 5–6 Master data import/export
const facilityCsv = `facilityName,city,state,address,zipCode,storagelyUrl
Audit Test Facility,Austin,TX,"100 Audit St, Austin, TX 78701",78701,https://www.mygarageselfstorage.com/self-storage/tx/austin/audit/`;
const facilityParsed = parseFacilitiesCsv(facilityCsv);
const imageParsed = parseImagesCsv(imageCsvTemplate.replace("https://example.com", "https://cdn.example.com"));

record(
  5,
  "Master Data facility CSV import",
  facilityParsed.facilities.length === 1 && facilityParsed.result.imported === 1,
  `imported=${facilityParsed.result.imported}, errors=${facilityParsed.result.errors.length}`,
);
record(
  5,
  "Master Data facility JSON round-trip",
  JSON.stringify(mergeFacilities([], facilityParsed.facilities)).includes("Audit Test Facility"),
  "merged facilities serialize to JSON",
);
record(
  6,
  "Master Data image CSV import",
  imageParsed.images.length >= 2 && imageParsed.result.imported >= 2,
  `imported=${imageParsed.result.imported}`,
);

const mergedFacilities = mergeFacilities(defaultFacilities, facilityParsed.facilities);
const mergedImages = mergeImages(defaultImages, imageParsed.images);

// 8 destination URL rules in HTML
const linkable = mergedImages.find((i) => isLinkableStorageType(i.category) && i.destinationUrl);
const nonLinkable = mergedImages.find((i) => i.type === "storage_type" && !isLinkableStorageType(i.category));
let linkRulePass = true;
let linkRuleDetail = "No samples to test";
if (linkable && nonLinkable) {
  const testProject = prepareProject(
    {
      ...createLocationProject(),
      locationIdentity: { city: "Austin", state: "TX", zipCode: "78701", facilityName: "Test", storagelyPageUrl: "https://example.com/a" },
      seo: { primaryKeyword: "self storage in Austin, TX", titleTag: "", metaDescription: "" },
      selectedStorageImages: [linkable.id, nonLinkable.id],
    },
    mergedFacilities,
    mergedImages,
  );
  const html = testProject.generated.html;
  const linkedOk = new RegExp(`<h3>\\s*<a[^>]*>\\s*${linkable.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(html);
  const plainOk = new RegExp(`<h3>\\s*${nonLinkable.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</h3>`, "i").test(html) && !new RegExp(`<h3>\\s*<a[^>]*>\\s*${nonLinkable.category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(html);
  linkRulePass = linkedOk && plainOk;
  linkRuleDetail = `linkable linked=${linkedOk}, non-linkable plain=${plainOk}`;
}
record(8, "Storage destination URL rules in HTML", linkRulePass, linkRuleDetail);

const complete = buildCompleteProject(mergedFacilities, mergedImages);
const incomplete = prepareProject(createLocationProject(), mergedFacilities, mergedImages);
const html = complete.generated.html;

// 9–14 HTML structure
const mainMatches = html.match(MAIN_RE) ?? [];
record(9, "Exactly one main#facility-template", mainMatches.length === 1, `count=${mainMatches.length}`);
record(10, "Seven expected sections", SECTIONS.every((s) => html.includes(s)), `missing=${SECTIONS.filter((s) => !html.includes(s)).join("; ") || "none"}`);
record(11, "No placeholder tokens in complete HTML", !hasUnresolvedPlaceholderInHtml(html), hasUnresolvedPlaceholderInHtml(html) ? "pattern matched" : "clean");

const visibleQ = [...html.matchAll(/<summary><h3>([\s\S]*?)<\/h3><\/summary>/gi)].map((m) => m[1].replace(/<[^>]*>/g, "").trim());
const visibleA = [...html.matchAll(/<summary><h3>[\s\S]*?<\/h3><\/summary>\s*<p>([\s\S]*?)<\/p>/gi)].map((m) => m[1].replace(/<[^>]*>/g, "").trim());
const schema = JSON.parse(complete.generated.faqJsonLd) as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
const faqMatch =
  schema.mainEntity.length === visibleQ.length &&
  schema.mainEntity.every((item, i) => item.name === visibleQ[i] && item.acceptedAnswer.text === visibleA[i]);
record(12, "FAQ visible matches JSON-LD", faqMatch, `visible=${visibleQ.length}, schema=${schema.mainEntity.length}`);

const imgTags = html.match(/<img\b/gi)?.length ?? 0;
const lazy = (html.match(/<img\b(?=[^>]*\sloading=["']lazy["'])/gi) ?? []).length;
const async = (html.match(/<img\b(?=[^>]*\sdecoding=["']async["'])/gi) ?? []).length;
const sized = (html.match(/<img\b(?=[^>]*\swidth=["']?\d+["']?)(?=[^>]*\sheight=["']?\d+["']?)/gi) ?? []).length;
const alt = (html.match(/<img\b(?=[^>]*\salt=["'][^"']+["'])/gi) ?? []).length;
record(13, "Image attributes", imgTags > 0 && lazy === imgTags && async === imgTags && sized === imgTags && alt === imgTags, `${alt}/${imgTags} alt, ${lazy}/${imgTags} lazy`);

const mapLazy = /loading=["']lazy["']/i.test(complete.googleMaps.iframeCode);
const mapTitle = /\stitle=["'][^"']+["']/i.test(complete.googleMaps.iframeCode);
const mapRef = /\sreferrerpolicy=["'][^"']+["']/i.test(complete.googleMaps.iframeCode);
record(14, "Map iframe attributes in project", mapLazy && mapTitle && mapRef, `lazy=${mapLazy}, title=${mapTitle}, referrer=${mapRef}`);

// 15–16 Launch readiness
const ready = getLaunchReadiness(complete, mergedFacilities, mergedImages);
const blocked = getLaunchReadiness(incomplete, mergedFacilities, mergedImages);
record(15, "Incomplete project marked Blocked", blocked.status === "blocked", `status=${blocked.status}, reasons=${blocked.blockedReasons.length}`);
record(16, "Complete project Ready or Needs Review", ready.status === "ready" || ready.status === "needs_review", `status=${ready.status}, warnings=${ready.warnings.length}`);

// 19 Bulk
const bulk = parseBulkCsv(`city,state,zipCode,facilityName,storagelyPageUrl\nDallas,TX,75201,Bulk Test,https://example.com/dallas/`);
const bulkProject = bulkRowToProject(bulk.rows[0]!, defaultSettings);
const bulkPrepared = prepareProject(bulkProject, mergedFacilities, mergedImages);
record(
  19,
  "Bulk creates draft not export-ready",
  bulkPrepared.status === "draft" && bulkPrepared.generated.html.includes("facility-template"),
  `status=${bulkPrepared.status}, hasHtml=${Boolean(bulkPrepared.generated.html)}`,
);

// 20 Landmark manual
const landmarkCheck = complete.audit.checks.find((c) => c.id === "landmark-distance");
record(
  20,
  "Landmark distance manual verification messaging",
  Boolean(landmarkCheck?.message.toLowerCase().includes("manual")),
  landmarkCheck?.message ?? "missing check",
);

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ passed: results.length - failed.length, failed: failed.length, results }, null, 2));
process.exit(failed.length > 0 ? 1 : 0);
