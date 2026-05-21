import JSZip from "jszip";
import { buildExportFilename, exportChecksPass, runExportChecks } from "./exportChecks";
import type { LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

export const getExportReadyProjects = (
  projects: LocationProject[],
  facilities: NearbyFacility[],
  images: StorageImage[],
): LocationProject[] =>
  projects.filter((project) => {
    const checks = runExportChecks(project, project.generated.html, images, facilities);
    return exportChecksPass(checks);
  });

export const downloadExportReadyZip = async (
  projects: LocationProject[],
  facilities: NearbyFacility[],
  images: StorageImage[],
): Promise<{ count: number; skipped: number }> => {
  const ready = getExportReadyProjects(projects, facilities, images);
  const zip = new JSZip();

  ready.forEach((project) => {
    zip.file(buildExportFilename(project), project.generated.html);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `storiq-export-ready-${new Date().toISOString().slice(0, 10)}.zip`;
  link.click();
  URL.revokeObjectURL(url);

  return { count: ready.length, skipped: projects.length - ready.length };
};
