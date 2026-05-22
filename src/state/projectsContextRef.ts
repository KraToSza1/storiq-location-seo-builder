import { createContext } from "react";
import type {
  AppSettings,
  FacilityImportResult,
  ImageImportResult,
  LocationProject,
  NearbyFacility,
  StorageImage,
} from "../types/storiq";

/** Stable context ref — kept in its own module so Vite HMR does not replace the provider instance. */
export interface ProjectsContextValue {
  projects: LocationProject[];
  settings: AppSettings;
  facilities: NearbyFacility[];
  images: StorageImage[];
  addProject: (project: LocationProject) => LocationProject;
  updateProject: (id: string, updater: (project: LocationProject) => LocationProject) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => LocationProject | undefined;
  importProjects: (json: string) => { imported: number; error?: string };
  updateSettings: (settings: AppSettings) => void;
  importFacilitiesCsv: (csv: string) => FacilityImportResult;
  saveFacility: (facility: NearbyFacility) => { error?: string };
  deleteFacility: (id: string) => void;
  resetFacilities: () => void;
  exportFacilitiesJson: () => string;
  importImagesCsv: (csv: string) => ImageImportResult;
  importImagesMarkdown: (markdown: string) => ImageImportResult;
  saveImage: (image: StorageImage) => void;
  deleteImage: (id: string) => void;
  resetImages: () => void;
  exportImagesJson: () => string;
}

export const ProjectsContext = createContext<ProjectsContextValue | undefined>(undefined);
