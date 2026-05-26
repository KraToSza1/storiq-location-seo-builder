import { formatNearbySelectionRequirement, getNearbySelectionLimits, isNearbySelectionCountValid, NEARBY_SELECTION_RANGE_LABEL } from "./nearbySuggestions";
import { mergeLocalReferences } from "./localContextUtils";
import { getProjectValidation, hasUnresolvedPlaceholderInHtml, parseGoogleMapsIframe } from "./validators";
import { debugLog, debugWarn } from "./debugLog";
import { runExportChecks } from "./exportChecks";
import type { LaunchReadiness, LaunchReadinessItem, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const item = (
  id: string,
  label: string,
  status: LaunchReadinessItem["status"],
  score: number,
  message: string,
  action: string,
): LaunchReadinessItem => ({
  id,
  label,
  status,
  score,
  message,
  action,
});

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
};

export const getLaunchReadiness = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): LaunchReadiness => {
  const validation = getProjectValidation(project, facilities, images);
  const map = parseGoogleMapsIframe(project.googleMaps.iframeCode);
  const failCount = project.audit.checks.filter((check) => check.status === "fail").length;
  const schemaFail = project.audit.checks.some((check) => check.id.includes("faq") && check.status === "fail");
  const exportChecks = runExportChecks(project, project.generated.html, images, facilities);
  const exportFail = exportChecks.some((c) => c.status === "fail");

  debugLog("launchReadiness", "computed inputs", {
    projectId: project.id,
    validationFails: validation.hardFails.length,
    exportFail,
    auditFails: failCount,
    mapValid: map.isValid,
    htmlLength: project.generated.html.length,
  });

  const selectedFacilities = project.selectedNearbyLocations
    .map((id) => facilities.find((f) => f.id === id))
    .filter((f): f is NearbyFacility => Boolean(f));

  const nearbyMissingUrl = selectedFacilities.filter((f) => !f.storagelyUrl).length;
  const nearbyMissingImage = selectedFacilities.filter((f) => !f.imageUrl).length;
  const landmarkWarning = mergeLocalReferences(project.localContext).length > 0;

  const blockedReasons: string[] = [];
  if (!project.locationIdentity.city.trim()) blockedReasons.push("Missing city");
  if (!project.locationIdentity.state.trim()) blockedReasons.push("Missing state");
  if (!project.locationIdentity.facilityName.trim()) blockedReasons.push("Missing facility name");
  if (!project.seo.primaryKeyword.trim()) blockedReasons.push("Missing primary keyword");
  if (!project.existingContent.address.trim()) blockedReasons.push("Missing address");
  if (!map.isValid) blockedReasons.push("Missing Google Maps iframe");
  if (project.selectedStorageImages.length === 0) blockedReasons.push("No storage types selected");
  if (project.selectedNearbyLocations.length === 0) blockedReasons.push("No nearby locations selected");
  if (hasUnresolvedPlaceholderInHtml(project.generated.html)) blockedReasons.push("HTML has unresolved placeholders");
  if (!project.generated.faqJsonLd.includes('"@type": "FAQPage"') || schemaFail) blockedReasons.push("FAQ schema missing or invalid");

  const warnings: string[] = [];
  if (!project.existingContent.officeHours.trim()) warnings.push("Missing office hours");
  if (!project.existingContent.accessHours.trim()) warnings.push("Missing access hours");
  if (landmarkWarning) warnings.push("Landmark distance not verified — manual review required");
  if (nearbyMissingImage > 0) warnings.push(`${nearbyMissingImage} nearby location(s) missing image`);
  if (nearbyMissingUrl > 0) warnings.push(`${nearbyMissingUrl} nearby location(s) missing URL`);
  const nearbyLimits = getNearbySelectionLimits(project, facilities);
  if (!isNearbySelectionCountValid(project.selectedNearbyLocations.length, project, facilities)) {
    warnings.push(
      nearbyLimits.target === 0
        ? `Select ${NEARBY_SELECTION_RANGE_LABEL} (add Storagely page URL in Step 1 first)`
        : `Nearby locations should be ${formatNearbySelectionRequirement(nearbyLimits)}`,
    );
  }
  if (map.isValid && (!map.hasLazyLoading || !map.hasTitle || !map.hasReferrerPolicy)) {
    warnings.push("Map iframe missing lazy loading, title, or referrerpolicy");
  }
  exportChecks.filter((c) => c.status === "warning").forEach((c) => warnings.push(c.message));

  const briefScore = validation.completionPercent;
  const seoScore = project.audit.score;
  const imageScore =
    project.selectedStorageImages.length > 0 && nearbyMissingImage === 0
      ? 100
      : project.selectedStorageImages.length > 0
        ? 70
        : 30;
  const mapScore = map.isValid && map.hasLazyLoading && map.hasTitle && map.hasReferrerPolicy ? 100 : map.isValid ? 65 : 15;
  const nearbyCount = project.selectedNearbyLocations.length;
  const nearbyScore =
    isNearbySelectionCountValid(nearbyCount, project, facilities) && nearbyMissingUrl === 0 ? 100 : nearbyCount > 0 ? 50 : 20;
  const schemaScore = schemaFail ? 25 : 100;
  const exportScore = project.generated.html && !exportFail ? 100 : project.generated.html ? 55 : 25;

  const items = [
    item(
      "brief",
      "Brief Completion",
      validation.hardFails.length === 0 ? "pass" : "fail",
      briefScore,
      validation.hardFails.length === 0 ? "Required intake fields are complete." : `${validation.hardFails.length} required field(s) need attention.`,
      "Complete Brief and Content Inputs tabs.",
    ),
    item(
      "seo",
      "SEO Score",
      failCount > 0 ? "fail" : project.audit.checks.some((c) => c.status === "warning") ? "warning" : "pass",
      seoScore,
      failCount > 0 ? `${failCount} SEO audit failure(s).` : "SEO audit is acceptable.",
      "Resolve SEO Audit failures first.",
    ),
    item(
      "images",
      "Image Score",
      project.selectedStorageImages.length === 0 ? "fail" : nearbyMissingImage > 0 ? "warning" : "pass",
      imageScore,
      project.selectedStorageImages.length === 0
        ? "No storage type images selected."
        : nearbyMissingImage > 0
          ? "Some nearby cards lack facility images."
          : "Storage and nearby images configured.",
      "Select storage types and verify facility library images.",
    ),
    item(
      "map",
      "Map Score",
      !map.isValid ? "fail" : !map.hasLazyLoading || !map.hasTitle ? "warning" : "pass",
      mapScore,
      !map.isValid ? "Google Maps iframe missing." : "Map embed present.",
      "Paste full iframe with loading, title, referrerpolicy.",
    ),
    item(
      "nearby",
      "Nearby Locations",
      !isNearbySelectionCountValid(project.selectedNearbyLocations.length, project, facilities) || nearbyMissingUrl > 0
        ? "fail"
        : "pass",
      nearbyScore,
      isNearbySelectionCountValid(project.selectedNearbyLocations.length, project, facilities)
        ? `${project.selectedNearbyLocations.length} nearby ${project.selectedNearbyLocations.length === 1 ? "facility" : "facilities"} selected (${NEARBY_SELECTION_RANGE_LABEL}).`
        : `${project.selectedNearbyLocations.length} nearby ${project.selectedNearbyLocations.length === 1 ? "facility" : "facilities"} selected (${NEARBY_SELECTION_RANGE_LABEL}).`,
      "Pick the closest eligible facilities from Master Data.",
    ),
    item(
      "schema",
      "Schema Score",
      schemaFail ? "fail" : "pass",
      schemaScore,
      schemaFail ? "FAQ schema missing or mismatched." : "FAQPage JSON-LD is valid.",
      "Regenerate HTML and FAQ from the same source.",
    ),
    item(
      "export",
      "Export Score",
      exportFail ? "fail" : !project.generated.html ? "warning" : "pass",
      exportScore,
      exportFail ? "Export checks failed." : project.generated.html ? "HTML ready for export." : "HTML not generated yet.",
      "Review Export tab checks before download.",
    ),
  ];

  if (landmarkWarning) {
    items.push(
      item(
        "manual",
        "Manual Verification",
        "warning",
        60,
        "Local landmarks listed — distance not auto-verified.",
        "Confirm landmarks are within 10 mi / 16 km before publishing.",
      ),
    );
  }

  const score = average(items.map((entry) => entry.score));
  const status: LaunchReadiness["status"] =
    blockedReasons.length > 0 ? "blocked" : warnings.length > 0 || items.some((i) => i.status === "warning") ? "needs_review" : "ready";
  const overallLabel = status === "ready" ? "Ready" : status === "needs_review" ? "Needs Review" : "Blocked";

  if (blockedReasons.length > 0) {
    debugWarn("launchReadiness", "BLOCKED", blockedReasons);
  } else {
    debugLog("launchReadiness", "status", { status, overallLabel, score, warnings: warnings.length });
  }

  return {
    score,
    status,
    overallLabel,
    items,
    blockedReasons,
    warnings,
  };
};
