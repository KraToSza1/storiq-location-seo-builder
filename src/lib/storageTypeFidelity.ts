import { debugLog, debugTable, debugWarn } from "./debugLog";
import { getStorageImageById } from "./imageLibrary";
import type { FaqItem, LocationProject, StorageImage } from "../types/storiq";

/** Step 3 image library categories → text patterns that imply that storage type in copy. */
export const STORAGE_TYPE_MENTION_RULES: { category: string; patterns: RegExp[] }[] = [
  {
    category: "Climate-Controlled Storage",
    patterns: [/\bclimate[-\s]?controlled\b/i, /\btemperature[-\s]?controlled\b/i],
  },
  { category: "Vehicle Storage", patterns: [/\bvehicle\s+storage\b/i, /\b(car|auto)\s+storage\b/i] },
  { category: "Boat Storage", patterns: [/\bboat\s+storage\b/i, /\bstore\s+(?:a\s+)?boat\b/i] },
  { category: "RV Storage", patterns: [/\brv\s+storage\b/i, /\brecreational\s+vehicle\b/i, /\bstore\s+(?:an?\s+)?rv\b/i] },
  { category: "Truck Storage", patterns: [/\btruck\s+storage\b/i] },
  { category: "Business Storage", patterns: [/\bbusiness\s+storage\b/i] },
  { category: "Drive-Up Storage", patterns: [/\bdrive[-\s]?up\s+storage\b/i] },
  { category: "Student Storage", patterns: [/\bstudent\s+storage\b/i] },
  { category: "Military Storage", patterns: [/\bmilitary\s+storage\b/i] },
  { category: "Retail Storage", patterns: [/\bretail\s+storage\b/i] },
  { category: "Indoor Storage", patterns: [/\bindoor\s+storage\b/i] },
  { category: "Container Storage", patterns: [/\bcontainer\s+storage\b/i] },
  { category: "Warehouse Storage", patterns: [/\bwarehouse\s+storage\b/i] },
];

const VEHICLE_STORAGE_CATEGORIES = new Set(["Vehicle Storage", "Boat Storage", "RV Storage", "Truck Storage"]);

const normalizeCategory = (value: string): string => value.trim().toLowerCase();

const selectedCategorySet = (selected: string[]): Set<string> =>
  new Set(selected.map((category) => normalizeCategory(category)));

export const selectedStorageCategories = (project: LocationProject, images: StorageImage[]): string[] =>
  project.selectedStorageImages
    .map((id) => getStorageImageById(images, id)?.category)
    .filter((category): category is string => Boolean(category));

export const facilityOffersClimateControlled = (project: LocationProject, images: StorageImage[]): boolean =>
  selectedStorageCategories(project, images).some((category) => /climate[-\s]?controlled/i.test(category));

export const facilityOffersVehicleStorage = (project: LocationProject, images: StorageImage[]): boolean =>
  selectedStorageCategories(project, images).some((category) => VEHICLE_STORAGE_CATEGORIES.has(category));

const isCategorySelected = (category: string, selected: Set<string>): boolean => selected.has(normalizeCategory(category));

/** True when text references a storage type that was not selected in Step 3. */
export const mentionsUnselectedStorageType = (text: string, selectedCategories: string[]): boolean => {
  if (!text.trim()) {
    return false;
  }
  const selected = selectedCategorySet(selectedCategories);
  return STORAGE_TYPE_MENTION_RULES.some(
    (rule) => !isCategorySelected(rule.category, selected) && rule.patterns.some((pattern) => pattern.test(text)),
  );
};

/** Loose vehicle/boat/RV mentions used in generic marketing copy (not full "X storage" phrases). */
export const mentionsVehicleUseCase = (text: string): boolean =>
  /\b(rv|boat|vehicle|trailer|parking)\b/i.test(text) && !/\bnon[-\s]?climate\b/i.test(text);

export const allowsVehicleUseCaseCopy = (selectedCategories: string[]): boolean =>
  selectedCategories.some((category) => VEHICLE_STORAGE_CATEGORIES.has(category));

/** Household / business / vehicle phrase for sections that describe customer needs. */
export const buildStorageUseCasePhrase = (selectedCategories: string[]): string => {
  const parts = ["household"];
  if (selectedCategories.some((category) => /business/i.test(category))) {
    parts.push("business");
  }
  if (allowsVehicleUseCaseCopy(selectedCategories)) {
    parts.push("vehicle");
  }
  if (parts.length === 1) {
    return "household and business";
  }
  if (parts.length === 2) {
    return `${parts[0]} and ${parts[1]}`;
  }
  return `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
};

const impliedStorageCategory = (text: string): string | undefined => {
  if (/\bnon[-\s]?climate\b/i.test(text)) {
    return undefined;
  }
  const match = STORAGE_TYPE_MENTION_RULES.find((rule) => rule.patterns.some((pattern) => pattern.test(text)));
  return match?.category;
};

/** Drop amenities/features that imply storage types not selected in Step 3. */
export const filterFeaturesBySelectedStorageTypes = (features: string[], selectedCategories: string[]): string[] => {
  const selected = selectedCategorySet(selectedCategories);
  return features.filter((feature) => {
    const category = impliedStorageCategory(feature);
    if (!category) {
      return true;
    }
    return isCategorySelected(category, selected);
  });
};

export const explainStorageTypeCopyRejection = (text: string, selectedCategories: string[]): string[] => {
  const reasons: string[] = [];
  if (!text.trim()) {
    return reasons;
  }
  const selected = selectedCategorySet(selectedCategories);
  STORAGE_TYPE_MENTION_RULES.forEach((rule) => {
    if (isCategorySelected(rule.category, selected)) {
      return;
    }
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      reasons.push(`mentions ${rule.category} (not selected in Step 3)`);
    }
  });
  if (mentionsVehicleUseCase(text) && !allowsVehicleUseCaseCopy(selectedCategories)) {
    reasons.push("mentions RV/boat/vehicle/parking (no Vehicle, Boat, RV, or Truck card in Step 3)");
  }
  return reasons;
};

export const copyMatchesSelectedStorageTypes = (text: string, project: LocationProject, images: StorageImage[]): boolean =>
  explainStorageTypeCopyRejection(text, selectedStorageCategories(project, images)).length === 0;

/** Log Step 3 selection vs extracted webpage types (extracted types must not drive copy). */
export const logStep3StorageContext = (
  scope: string,
  project: LocationProject,
  images: StorageImage[],
  extra?: Record<string, unknown>,
): void => {
  const selectedIds = project.selectedStorageImages;
  const selectedCategories = selectedStorageCategories(project, images);
  const rows = selectedIds.map((id) => {
    const image = getStorageImageById(images, id);
    return {
      imageId: id,
      category: image?.category ?? "(missing from library)",
    };
  });
  debugLog(scope, "Step 3 storage context", {
    selectedCount: selectedIds.length,
    selectedCategories,
    extractedFromWebpage: project.existingContent.storageTypes,
    offersClimate: facilityOffersClimateControlled(project, images),
    offersVehicle: facilityOffersVehicleStorage(project, images),
    ...extra,
  });
  if (rows.length > 0) {
    debugTable(`${scope}:selectedCards`, rows);
  }
  const extracted = project.existingContent.storageTypes.filter(Boolean);
  if (extracted.length > 0) {
    const notSelected = extracted.filter(
      (label) => !selectedCategories.some((c) => normalizeCategory(c) === normalizeCategory(label)),
    );
    if (notSelected.length > 0) {
      debugWarn(scope, "webpage extracted storage types NOT in Step 3 — copy must ignore these", {
        ignored: notSelected,
        step3Only: selectedCategories,
      });
    }
  }
};

export const explainFaqStep3Rejection = (faq: FaqItem, project: LocationProject, images: StorageImage[]): string[] => {
  const reasons = explainStorageTypeCopyRejection(`${faq.question} ${faq.answer}`, selectedStorageCategories(project, images));
  if (faqMentionsClimate(faq.question, faq.answer) && !facilityOffersClimateControlled(project, images)) {
    reasons.push("climate-controlled FAQ but no Climate-Controlled card in Step 3");
  }
  if (faqMentionsVehicleTopic(faq.question, faq.answer) && !facilityOffersVehicleStorage(project, images)) {
    reasons.push("RV/boat/vehicle FAQ but no Vehicle/Boat/RV/Truck card in Step 3");
  }
  return reasons;
};

const CLIMATE_PATTERN = /\bclimate[-\s]?controlled\b/i;

export const faqMentionsClimate = (question: string, answer: string): boolean =>
  CLIMATE_PATTERN.test(question) || CLIMATE_PATTERN.test(answer);

/** RV/boat/vehicle topic in FAQ wording (broader than category label patterns). */
export const faqMentionsVehicleTopic = (question: string, answer: string): boolean => {
  const combined = `${question} ${answer}`;
  return (
    /\b(rv|recreational\s+vehicle)\b/i.test(combined) ||
    /\bboat\b/i.test(combined) ||
    /\bvehicle\s+storage\b/i.test(combined) ||
    /\bstore\s+an?\s+(rv|boat|vehicle)\b/i.test(combined) ||
    mentionsVehicleUseCase(combined)
  );
};

export const partitionFaqsByStep3 = (
  faqs: FaqItem[],
  project: LocationProject,
  images: StorageImage[],
): { kept: FaqItem[]; rejected: Array<{ question: string; reasons: string[] }> } => {
  const kept: FaqItem[] = [];
  const rejected: Array<{ question: string; reasons: string[] }> = [];
  faqs.forEach((faq) => {
    const reasons = explainFaqStep3Rejection(faq, project, images);
    if (reasons.length > 0) {
      rejected.push({ question: faq.question, reasons });
    } else {
      kept.push(faq);
    }
  });
  return { kept, rejected };
};

export const filterFaqsByStep3 = (faqs: FaqItem[], project: LocationProject, images: StorageImage[]): FaqItem[] =>
  partitionFaqsByStep3(faqs, project, images).kept;
