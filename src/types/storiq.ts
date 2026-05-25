export type ProjectStatus = "draft" | "ready_for_generation" | "generated" | "needs_review" | "approved";

export type AuditStatus = "pass" | "warning" | "fail";

export type StorageImageType = "storage_type" | "facility_location";

export interface LocationProject {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  locationIdentity: {
    city: string;
    state: string;
    zipCode: string;
    facilityName: string;
    storagelyPageUrl: string;
  };
  seo: {
    primaryKeyword: string;
    titleTag: string;
    metaDescription: string;
  };
  existingContent: {
    rawContent: string;
    address: string;
    phone: string;
    accessHours: string;
    officeHours: string;
    features: string[];
    storageTypes: string[];
  };
  googleMaps: {
    iframeCode: string;
    detectedSrc: string;
    isValid: boolean;
  };
  localContext: {
    landmarks: string[];
    neighborhoods: string[];
    lifestyleTieIns: string[];
    nearbyCityPreferences: string[];
    doNotInclude: string[];
  };
  selectedNearbyLocations: string[];
  selectedStorageImages: string[];
  selectedFacilityLocationImages: string[];
  generated: {
    aiPrompt: string;
    html: string;
    faqJsonLd: string;
    draftTitleTag: string;
    draftMetaDescription: string;
    draftSections: DraftSection[];
    draftFaqs: FaqItem[];
    lastDraftedAt: string;
  };
  audit: {
    score: number;
    checks: SEOAuditCheck[];
  };
}

export interface StorageImage {
  id: string;
  category: string;
  imageUrl: string;
  destinationUrl?: string;
  altText: string;
  type: StorageImageType;
}

export interface NearbyFacility {
  id: string;
  facilityName: string;
  city: string;
  state: string;
  address: string;
  zipCode: string;
  storagelyUrl: string;
  phone?: string;
  imageUrl?: string;
  notes?: string;
}

export interface SEOAuditCheck {
  id: string;
  label: string;
  status: AuditStatus;
  message: string;
  fixSuggestion?: string;
}

export interface AppSettings {
  brandName: string;
  defaultKeywordPattern: string;
  aiPromptSettings: string;
  /** Full origin where `/media-library/` files are hosted (StorIQ Vercel app). Required for Storagely paste. */
  mediaAssetBaseUrl: string;
}

export interface DraftSection {
  id: string;
  label: string;
  heading: string;
  body: string;
  bullets: string[];
}

export interface LaunchReadinessItem {
  id: string;
  label: string;
  status: AuditStatus;
  message: string;
  score: number;
  action: string;
}

export type LaunchReadinessStatus = "ready" | "needs_review" | "blocked";

export interface LaunchReadiness {
  score: number;
  status: LaunchReadinessStatus;
  overallLabel: string;
  items: LaunchReadinessItem[];
  blockedReasons: string[];
  warnings: string[];
}

export interface FacilityImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface ImageImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface BulkCsvRow {
  rowNumber: number;
  city: string;
  state: string;
  zipCode: string;
  facilityName: string;
  storagelyPageUrl: string;
  primaryKeyword: string;
  address: string;
  phone: string;
  rawContent: string;
  valid: boolean;
  errors: string[];
  /** From Client Deliverables Tracker (optional). */
  assignee?: string;
  indexationStatus?: string;
  workflowStatus?: string;
  notes?: string;
}

export interface ExportCheck {
  id: string;
  label: string;
  status: AuditStatus;
  message: string;
}

export interface ValidationIssue {
  id: string;
  label: string;
  message: string;
  severity: "required" | "warning";
}

export interface FaqItem {
  question: string;
  answer: string;
}
