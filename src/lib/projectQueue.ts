import { exportChecksPass, runExportChecks } from "./exportChecks";
import { getLaunchReadiness } from "./launchReadiness";
import type { LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

export type ProjectQueueFilter = "all" | "in_progress" | "export_ready" | "needs_review" | "approved";

export type ProjectQueueStatus = {
  filter: ProjectQueueFilter;
  label: string;
  exportReady: boolean;
  launchStatus: ReturnType<typeof getLaunchReadiness>["status"];
};

const hasIdentity = (project: LocationProject): boolean =>
  Boolean(
    project.locationIdentity.city.trim() &&
      project.locationIdentity.state.trim() &&
      project.locationIdentity.facilityName.trim(),
  );

export const getProjectQueueStatus = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): ProjectQueueStatus => {
  const readiness = getLaunchReadiness(project, facilities, images);
  const exportChecks = runExportChecks(project, project.generated.html, images, facilities);
  const exportReady = exportChecksPass(exportChecks) && readiness.status !== "blocked";

  if (project.status === "approved") {
    return { filter: "approved", label: "Approved", exportReady, launchStatus: readiness.status };
  }

  if (project.status === "needs_review" || readiness.status === "needs_review") {
    return { filter: "needs_review", label: "Needs review", exportReady, launchStatus: readiness.status };
  }

  if (exportReady) {
    return { filter: "export_ready", label: "Export ready", exportReady, launchStatus: readiness.status };
  }

  if (hasIdentity(project)) {
    return { filter: "in_progress", label: "In progress", exportReady, launchStatus: readiness.status };
  }

  return { filter: "in_progress", label: "Draft", exportReady, launchStatus: readiness.status };
};

export const filterProjectsByQueue = (
  projects: LocationProject[],
  filter: ProjectQueueFilter,
  facilities: NearbyFacility[],
  images: StorageImage[],
): LocationProject[] => {
  if (filter === "all") return projects;
  return projects.filter((project) => getProjectQueueStatus(project, facilities, images).filter === filter);
};

export const findNextIncompleteProject = (
  projects: LocationProject[],
  facilities: NearbyFacility[],
  images: StorageImage[],
  afterId?: string,
): LocationProject | undefined => {
  const incomplete = projects.filter((p) => !getProjectQueueStatus(p, facilities, images).exportReady);
  if (incomplete.length === 0) return undefined;

  if (afterId) {
    const index = incomplete.findIndex((p) => p.id === afterId);
    if (index >= 0 && index < incomplete.length - 1) return incomplete[index + 1];
  }

  return incomplete[0];
};

export const countProjectsByQueue = (
  projects: LocationProject[],
  facilities: NearbyFacility[],
  images: StorageImage[],
): Record<ProjectQueueFilter, number> => {
  const counts: Record<ProjectQueueFilter, number> = {
    all: projects.length,
    in_progress: 0,
    export_ready: 0,
    needs_review: 0,
    approved: 0,
  };

  projects.forEach((project) => {
    const status = getProjectQueueStatus(project, facilities, images);
    counts[status.filter] += 1;
  });

  return counts;
};
