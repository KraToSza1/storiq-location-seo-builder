import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  generateDraftFaqs,
  generateDraftMetaDescription,
  generateDraftSections,
  generateDraftTitleTag,
  sanitizeDraftFaqs,
  sanitizeDraftSections,
} from "../lib/draftGenerator";
import {
  defaultFacilities,
  mergeFacilities,
  migrateFacilityLibrary,
  normalizeFacility,
  parseFacilitiesCsv,
  upsertFacility,
} from "../lib/facilityLibrary";
import { starterImages } from "../lib/defaultImages";
import {
  defaultImages,
  mergeImages,
  migrateImageLibrary,
  migrateSelectedStorageImageIds,
  normalizeImage,
  parseImagesCsv,
  parseImagesMarkdown,
  upsertImage,
} from "../lib/imageLibrary";
import { sampleFacilities } from "../lib/sampleFacilities";
import { buildAiPrompt } from "../lib/promptBuilder";
import { resolvePublishAssetBaseUrl } from "../lib/assetUrls";
import { cloneProject, defaultSettings, mergeWithProjectDefaults } from "../lib/projectDefaults";
import { runSEOAudit } from "../lib/seoAudit";
import { renderFaqJsonLd, renderStoragelyHtml } from "../lib/templateRenderer";
import { debugLog, debugWarn } from "../lib/debugLog";
import { isGenerationBlockedOutput } from "../lib/myGarageGenerationSpec";
import { getProjectValidation } from "../lib/validators";
import type { AppSettings, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";
import { ProjectsContext, type ProjectsContextValue } from "./projectsContextRef";

const PROJECTS_KEY = "storiq-location-projects-v1";
const SETTINGS_KEY = "storiq-settings-v1";
const FACILITIES_KEY = "storiq-master-facilities-v1";
const IMAGES_KEY = "storiq-master-images-v1";

const LEGACY_STORAGE_KEYS: Record<string, string[]> = {
  [PROJECTS_KEY]: ["storeiq-location-projects-v1", "StorIQ-location-projects-v1"],
  [SETTINGS_KEY]: ["storeiq-settings-v1", "StorIQ-settings-v1"],
  [FACILITIES_KEY]: ["storeiq-master-facilities-v1", "StorIQ-master-facilities-v1"],
  [IMAGES_KEY]: ["storeiq-master-images-v1", "StorIQ-master-images-v1"],
};

const readLegacyStorage = (key: string): string | null => {
  for (const legacyKey of LEGACY_STORAGE_KEYS[key] ?? []) {
    const value = localStorage.getItem(legacyKey);
    if (value) return value;
  }
  return null;
};

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    let stored = localStorage.getItem(key);
    if (!stored) {
      const legacy = readLegacyStorage(key);
      if (legacy) {
        stored = legacy;
        localStorage.setItem(key, legacy);
      }
    }
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

const deriveStatus = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): LocationProject["status"] => {
  if (project.status === "approved" || project.status === "needs_review") {
    return project.status;
  }

  const validation = getProjectValidation(project, facilities, images);
  if (validation.hardFails.length > 0) {
    return "draft";
  }

  return project.generated.html ? "generated" : "ready_for_generation";
};

export const prepareProject = (
  project: LocationProject,
  facilities: NearbyFacility[] = defaultFacilities,
  images: StorageImage[] = defaultImages,
  settings: AppSettings = defaultSettings,
): LocationProject => {
  debugLog("prepareProject", "start", {
    projectId: project.id,
    facility: project.locationIdentity.facilityName,
    city: project.locationIdentity.city,
    state: project.locationIdentity.state,
  });

  const publishAssetBaseUrl = resolvePublishAssetBaseUrl(settings);
  const incomingGenerated = project.generated;
  const validation = getProjectValidation(project, facilities, images);
  if (validation.hardFails.length > 0) {
    debugWarn("prepareProject", "wizard validation hard fails", validation.hardFails);
  }
  const draftTitleTag = incomingGenerated.draftTitleTag.trim() || generateDraftTitleTag(project);
  const draftMetaDescription =
    incomingGenerated.draftMetaDescription.trim() || generateDraftMetaDescription(project);
  const draftSections = sanitizeDraftSections(
    project,
    incomingGenerated.draftSections.length > 0
      ? incomingGenerated.draftSections
      : generateDraftSections(project, facilities, images),
    facilities,
    images,
  );
  const draftFaqs = sanitizeDraftFaqs(
    project,
    incomingGenerated.draftFaqs.length > 0 ? incomingGenerated.draftFaqs : generateDraftFaqs(project, images),
    images,
  );
  const lastDraftedAt = incomingGenerated.lastDraftedAt.trim() || new Date().toISOString();
  const selectedStorageImages = migrateSelectedStorageImageIds(project.selectedStorageImages);
  const withDraft = {
    ...project,
    selectedStorageImages,
    generated: {
      ...incomingGenerated,
      draftTitleTag,
      draftMetaDescription,
      draftSections,
      draftFaqs,
      lastDraftedAt,
    },
  };
  const html = renderStoragelyHtml(withDraft, facilities, images, publishAssetBaseUrl);
  const faqJsonLd = renderFaqJsonLd(withDraft, images);
  const aiPrompt = buildAiPrompt(
    {
      ...withDraft,
      generated: {
        ...withDraft.generated,
        html,
        faqJsonLd,
      },
    },
    facilities,
    images,
  );
  const withGenerated = {
    ...withDraft,
    generated: {
      ...withDraft.generated,
      aiPrompt,
      html,
      faqJsonLd,
    },
  };
  const audit = runSEOAudit(withGenerated, html, facilities, images);
  const blocked = isGenerationBlockedOutput(html);

  debugLog("prepareProject", "done", {
    projectId: project.id,
    htmlLength: html.length,
    generationBlocked: blocked,
    draftSectionCount: draftSections.length,
    draftFaqCount: draftFaqs.length,
    selectedStorageImages: selectedStorageImages.length,
    selectedNearby: project.selectedNearbyLocations.length,
    status: deriveStatus(withGenerated, facilities, images),
    auditScore: audit.score,
    auditFails: audit.checks.filter((c) => c.status === "fail").length,
  });

  if (blocked) {
    debugWarn("prepareProject", "HTML is generation-blocked — check wizard required fields", html.slice(0, 400));
  }

  return {
    ...withGenerated,
    status: deriveStatus(withGenerated, facilities, images),
    audit,
  };
};

const usesLegacyRemoteImage = (url?: string): boolean => Boolean(url && /unsplash\.com|:\/\/example\.com/i.test(url));

const syncFacilitiesWithLocalImages = (stored: NearbyFacility[]): NearbyFacility[] => {
  const starterById = new Map(sampleFacilities.map((f) => [f.id, f]));
  const withStarters = stored.some((f) => usesLegacyRemoteImage(f.imageUrl))
    ? stored.map((facility) => {
        const starter = starterById.get(facility.id);
        if (starter?.imageUrl) {
          return { ...facility, imageUrl: starter.imageUrl };
        }
        return facility;
      })
    : stored;

  return migrateFacilityLibrary(withStarters);
};

const syncImagesWithLocalLibrary = (stored: StorageImage[]): StorageImage[] => {
  let synced = migrateImageLibrary(stored);

  if (!synced.some((image) => usesLegacyRemoteImage(image.imageUrl))) {
    return synced;
  }
  const starterById = new Map(starterImages.map((image) => [image.id, image]));
  synced = synced.map((image) => {
    const starter = starterById.get(image.id);
    return starter ? { ...image, imageUrl: starter.imageUrl, altText: image.altText || starter.altText } : image;
  });
  const knownIds = new Set(synced.map((image) => image.id));
  const missing = starterImages.filter((image) => !knownIds.has(image.id));
  return migrateImageLibrary([...synced, ...missing]);
};

const loadFacilities = (): NearbyFacility[] => {
  const stored = readJson<(Partial<NearbyFacility> & { url?: string })[]>(FACILITIES_KEY, defaultFacilities);
  const normalized = stored.map(normalizeFacility).filter((facility): facility is NearbyFacility => Boolean(facility));
  const list = normalized.length > 0 ? normalized : defaultFacilities;
  return syncFacilitiesWithLocalImages(list);
};

const loadImages = (): StorageImage[] => {
  const stored = readJson<Partial<StorageImage>[]>(IMAGES_KEY, defaultImages);
  const normalized = stored.map(normalizeImage).filter((image): image is StorageImage => Boolean(image));
  const list = normalized.length > 0 ? normalized : defaultImages;
  return syncImagesWithLocalLibrary(list);
};

const loadProjects = (facilities: NearbyFacility[], images: StorageImage[], settings: AppSettings): LocationProject[] => {
  const stored = readJson<Partial<LocationProject>[]>(PROJECTS_KEY, []);
  return stored.map((project) => {
    try {
      return prepareProject(mergeWithProjectDefaults(project), facilities, images, settings);
    } catch (error) {
      console.error("[StorIQ] Failed to prepare project during load:", project.id, error);
      return mergeWithProjectDefaults(project);
    }
  });
};

const loadSettings = (): AppSettings => {
  const stored = readJson<Partial<AppSettings>>(SETTINGS_KEY, {});
  return {
    ...defaultSettings,
    ...stored,
    mediaAssetBaseUrl: stored.mediaAssetBaseUrl?.trim() || defaultSettings.mediaAssetBaseUrl,
  };
};

export function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [facilities, setFacilities] = useState<NearbyFacility[]>(loadFacilities);
  const [images, setImages] = useState<StorageImage[]>(loadImages);
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [projects, setProjects] = useState<LocationProject[]>(() => {
    try {
      const initialSettings = loadSettings();
      return loadProjects(loadFacilities(), loadImages(), initialSettings);
    } catch (error) {
      console.error("[StorIQ] Failed to hydrate projects from localStorage:", error);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(FACILITIES_KEY, JSON.stringify(facilities));
  }, [facilities]);

  useEffect(() => {
    localStorage.setItem(IMAGES_KEY, JSON.stringify(images));
  }, [images]);

  const refreshProjects = useCallback(
    (nextFacilities: NearbyFacility[], nextImages: StorageImage[]) => {
      setProjects((current) => current.map((project) => prepareProject(project, nextFacilities, nextImages, settings)));
    },
    [settings],
  );

  const addProject = useCallback(
    (project: LocationProject) => {
      const prepared = prepareProject(
        {
          ...project,
          updatedAt: new Date().toISOString(),
        },
        facilities,
        images,
        settings,
      );
      setProjects((current) => [prepared, ...current]);
      return prepared;
    },
    [facilities, images, settings],
  );

  const updateProject = useCallback(
    (id: string, updater: (project: LocationProject) => LocationProject) => {
      setProjects((current) =>
        current.map((project) => {
          if (project.id !== id) {
            return project;
          }

          return prepareProject(
            {
              ...updater(project),
              updatedAt: new Date().toISOString(),
            },
            facilities,
            images,
            settings,
          );
        }),
      );
    },
    [facilities, images, settings],
  );

  const deleteProject = useCallback((id: string) => {
    setProjects((current) => current.filter((project) => project.id !== id));
  }, []);

  const duplicateProject = useCallback(
    (id: string) => {
      const found = projects.find((project) => project.id === id);
      if (!found) {
        return undefined;
      }

      const duplicate = prepareProject(cloneProject(found), facilities, images, settings);
      setProjects((current) => [duplicate, ...current]);
      return duplicate;
    },
    [facilities, images, projects, settings],
  );

  const importProjects = useCallback(
    (json: string) => {
      try {
        const parsed = JSON.parse(json) as Partial<LocationProject> | Partial<LocationProject>[];
        const incoming = Array.isArray(parsed) ? parsed : [parsed];
        const prepared = incoming.map((project) =>
          prepareProject(mergeWithProjectDefaults(project), facilities, images, settings),
        );
        setProjects((current) => [...prepared, ...current]);
        return { imported: prepared.length };
      } catch (error) {
        return {
          imported: 0,
          error: error instanceof Error ? error.message : "Unable to parse JSON backup.",
        };
      }
    },
    [facilities, images, settings],
  );

  const updateSettings = useCallback((nextSettings: AppSettings) => {
    setSettings(nextSettings);
  }, []);

  const importFacilitiesCsv = useCallback(
    (csv: string) => {
      const parsed = parseFacilitiesCsv(csv);
      if (parsed.facilities.length > 0) {
        setFacilities((current) => {
          const merged = mergeFacilities(current, parsed.facilities);
          refreshProjects(merged, images);
          return merged;
        });
      }

      return parsed.result;
    },
    [images, refreshProjects],
  );

  const saveFacility = useCallback(
    (facility: NearbyFacility) => {
      let error: string | undefined;
      setFacilities((current) => {
        const result = upsertFacility(current, facility);
        error = result.error;
        if (!result.error) {
          refreshProjects(result.facilities, images);
        }
        return result.facilities;
      });
      return { error };
    },
    [images, refreshProjects],
  );

  const deleteFacility = useCallback(
    (id: string) => {
      setFacilities((current) => {
        const nextFacilities = current.filter((facility) => facility.id !== id);
        setProjects((projectsCurrent) =>
          projectsCurrent.map((project) =>
            prepareProject(
              {
                ...project,
                selectedNearbyLocations: project.selectedNearbyLocations.filter((facilityId) => facilityId !== id),
              },
              nextFacilities,
              images,
              settings,
            ),
          ),
        );
        return nextFacilities;
      });
    },
    [images, settings],
  );

  const resetFacilities = useCallback(() => {
    setFacilities(defaultFacilities);
    refreshProjects(defaultFacilities, images);
  }, [images, refreshProjects]);

  const exportFacilitiesJson = useCallback(() => JSON.stringify(facilities, null, 2), [facilities]);

  const importImagesCsv = useCallback(
    (csv: string) => {
      const parsed = parseImagesCsv(csv);
      if (parsed.images.length > 0) {
        setImages((current) => {
          const merged = mergeImages(current, parsed.images);
          refreshProjects(facilities, merged);
          return merged;
        });
      }
      return parsed.result;
    },
    [facilities, refreshProjects],
  );

  const importImagesMarkdown = useCallback(
    (markdown: string) => {
      const parsed = parseImagesMarkdown(markdown);
      if (parsed.images.length > 0) {
        setImages((current) => {
          const merged = mergeImages(current, parsed.images);
          refreshProjects(facilities, merged);
          return merged;
        });
      }
      return parsed.result;
    },
    [facilities, refreshProjects],
  );

  const saveImage = useCallback(
    (image: StorageImage) => {
      setImages((current) => {
        const next = upsertImage(current, image);
        refreshProjects(facilities, next);
        return next;
      });
    },
    [facilities, refreshProjects],
  );

  const deleteImage = useCallback(
    (id: string) => {
      setImages((current) => {
        const next = current.filter((image) => image.id !== id);
        setProjects((projectsCurrent) =>
          projectsCurrent.map((project) =>
            prepareProject(
              {
                ...project,
                selectedStorageImages: project.selectedStorageImages.filter((imageId) => imageId !== id),
                selectedFacilityLocationImages: project.selectedFacilityLocationImages.filter((imageId) => imageId !== id),
              },
              facilities,
              next,
              settings,
            ),
          ),
        );
        return next;
      });
    },
    [facilities, settings],
  );

  const resetImages = useCallback(() => {
    setImages(defaultImages);
    refreshProjects(facilities, defaultImages);
  }, [facilities, refreshProjects]);

  const exportImagesJson = useCallback(() => JSON.stringify(images, null, 2), [images]);

  const value = useMemo(
    () => ({
      projects,
      settings,
      facilities,
      images,
      addProject,
      updateProject,
      deleteProject,
      duplicateProject,
      importProjects,
      updateSettings,
      importFacilitiesCsv,
      saveFacility,
      deleteFacility,
      resetFacilities,
      exportFacilitiesJson,
      importImagesCsv,
      importImagesMarkdown,
      saveImage,
      deleteImage,
      resetImages,
      exportImagesJson,
    }),
    [
      addProject,
      deleteFacility,
      deleteImage,
      deleteProject,
      duplicateProject,
      exportFacilitiesJson,
      exportImagesJson,
      facilities,
      images,
      importFacilitiesCsv,
      importImagesCsv,
      importImagesMarkdown,
      importProjects,
      projects,
      resetFacilities,
      resetImages,
      saveFacility,
      saveImage,
      settings,
      updateProject,
      updateSettings,
    ],
  );

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export const useProjects = (): ProjectsContextValue => {
  const context = useContext(ProjectsContext);
  if (!context) {
    throw new Error("useProjects must be used inside ProjectsProvider");
  }

  return context;
};
