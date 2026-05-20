import type { AppSettings, LocationProject } from "../types/storiq";

export const defaultSettings: AppSettings = {
  brandName: "My Garage Self Storage",
  defaultKeywordPattern: "self storage units in {City}, {State}",
  aiPromptSettings:
    "Write clear, locally specific copy for a Storagely HTML location page. Keep claims factual and avoid unverifiable distance claims.",
};

const blankGenerated = {
  aiPrompt: "",
  html: "",
  faqJsonLd: "",
  draftTitleTag: "",
  draftMetaDescription: "",
  draftSections: [],
  draftFaqs: [],
  lastDraftedAt: "",
};

const blankAudit = {
  score: 0,
  checks: [],
};

export const createId = (): string => {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `storiq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const buildPrimaryKeyword = (
  city: string,
  state: string,
  pattern = defaultSettings.defaultKeywordPattern,
): string => {
  if (!city.trim() || !state.trim()) {
    return "";
  }

  return pattern.replace("{City}", city.trim()).replace("{State}", state.trim());
};

export const createLocationProject = (): LocationProject => {
  const now = new Date().toISOString();

  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    locationIdentity: {
      city: "",
      state: "",
      zipCode: "",
      facilityName: "",
      storagelyPageUrl: "",
    },
    seo: {
      primaryKeyword: "",
      titleTag: "",
      metaDescription: "",
    },
    existingContent: {
      rawContent: "",
      address: "",
      phone: "",
      accessHours: "",
      officeHours: "",
      features: [],
      storageTypes: [],
      uniqueSellingPoints: [],
    },
    googleMaps: {
      iframeCode: "",
      detectedSrc: "",
      isValid: false,
    },
    localContext: {
      landmarks: [],
      neighborhoods: [],
      lifestyleTieIns: [],
      nearbyCityPreferences: [],
      doNotInclude: [],
    },
    selectedNearbyLocations: [],
    selectedStorageImages: [],
    selectedFacilityLocationImages: [],
    generated: blankGenerated,
    audit: blankAudit,
  };
};

export const cloneProject = (project: LocationProject): LocationProject => {
  const now = new Date().toISOString();

  return {
    ...project,
    id: createId(),
    createdAt: now,
    updatedAt: now,
    status: "draft",
    locationIdentity: {
      ...project.locationIdentity,
      facilityName: `${project.locationIdentity.facilityName || "Untitled Location"} Copy`,
    },
  };
};

export const mergeWithProjectDefaults = (value: Partial<LocationProject>): LocationProject => {
  const base = createLocationProject();

  return {
    ...base,
    ...value,
    locationIdentity: { ...base.locationIdentity, ...value.locationIdentity },
    seo: { ...base.seo, ...value.seo },
    existingContent: { ...base.existingContent, ...value.existingContent },
    googleMaps: { ...base.googleMaps, ...value.googleMaps },
    localContext: { ...base.localContext, ...value.localContext },
    selectedNearbyLocations: value.selectedNearbyLocations ?? base.selectedNearbyLocations,
    selectedStorageImages: value.selectedStorageImages ?? base.selectedStorageImages,
    selectedFacilityLocationImages: value.selectedFacilityLocationImages ?? base.selectedFacilityLocationImages,
    generated: { ...base.generated, ...value.generated },
    audit: { ...base.audit, ...value.audit },
  };
};
