import { formatNearbySelectionRequirement, getNearbySelectionLimits, isNearbySelectionCountValid, NEARBY_SELECTION_RANGE_LABEL } from "./nearbySuggestions";
import { makeExportCheck } from "./staticHtmlChecks";
import { runValidationGate, validationGatePass, gateChecksToExportChecks } from "./validationGate";
import type { ExportCheck, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

export const buildExportFilename = (project: LocationProject): string => {
  const slug = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "location";

  return `storiq-${slug(project.locationIdentity.city)}-${slug(project.locationIdentity.state)}-${slug(project.locationIdentity.facilityName)}.md`;
};

export const runExportChecks = (
  project: LocationProject,
  html: string,
  images: StorageImage[],
  facilities: NearbyFacility[],
): ExportCheck[] => {
  const gateChecks = runValidationGate({ html, project, images, facilities });
  const checks = gateChecksToExportChecks(gateChecks);

  const nearbyCount = project.selectedNearbyLocations.length;
  const nearbyLimits = getNearbySelectionLimits(project, facilities);
  const nearbyValid = isNearbySelectionCountValid(nearbyCount, project, facilities);
  checks.push(
    makeExportCheck(
      "nearby-count",
      formatNearbySelectionRequirement(nearbyLimits),
      nearbyValid ? "pass" : "fail",
      nearbyValid
        ? `${nearbyCount} nearby ${nearbyCount === 1 ? "facility" : "facilities"} selected.`
        : `${nearbyCount} nearby ${nearbyCount === 1 ? "facility" : "facilities"} selected — ${NEARBY_SELECTION_RANGE_LABEL} required.`,
    ),
  );

  return checks;
};

export const exportChecksPass = (checks: ExportCheck[]): boolean => !checks.some((c) => c.status === "fail");

export const exportValidationGatePass = (
  project: LocationProject,
  html: string,
  images: StorageImage[],
  facilities: NearbyFacility[],
): boolean => validationGatePass(runValidationGate({ html, project, images, facilities }));
