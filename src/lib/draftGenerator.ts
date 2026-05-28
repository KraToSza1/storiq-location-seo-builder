import {
  branchLabelFromFacilityName,
  formatKeywordPhrase,
  formatPlaceTitleCase,
  isValidFaqCandidate,
} from "./contentQuality";
import { buildFacilityWireframeHeadings, VALUE_PROPOSITION_OPENING } from "./facilityWireframe";
import { mergeLocalReferences } from "./localContextUtils";
import { extractFaqsFromRawContent } from "./contentExtraction";
import { amenitiesForSection1, buildSection1IntroFallback, stripPromotionalLanguage, valueBulletsForSection2 } from "./myGarageGenerationSpec";
import { debugLog, debugTable, debugWarn } from "./debugLog";
import { isEditorInstruction } from "./templateDraftUtils";
import {
  buildMapDirectionsCopy,
  faqMatchesFacilityCapabilities,
  facilityOffersClimateControlled,
  facilityOffersVehicleStorage,
  shortFacilityLabel,
} from "./facilityCopy";
import {
  buildStorageUseCasePhrase,
  filterFaqsByStep3,
  filterFeaturesBySelectedStorageTypes,
  logStep3StorageContext,
  partitionFaqsByStep3,
  selectedStorageCategories,
} from "./storageTypeFidelity";
import { buildOfficeAndAccessHoursAnswer } from "./hoursCopy";
import { formatValueBullet } from "./valuePropositionCopy";
import type { DraftContentBaseline, DraftSection, FaqItem, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const cityState = (project: LocationProject): string =>
  [project.locationIdentity.city, project.locationIdentity.state].filter(Boolean).join(", ") || "the local area";

const sentenceList = (items: string[], fallback: string): string => {
  const values = items.filter(Boolean);
  if (values.length === 0) return fallback;
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
};

const selectedFacilities = (project: LocationProject, facilities: NearbyFacility[]): NearbyFacility[] =>
  project.selectedNearbyLocations
    .map((id) => facilities.find((facility) => facility.id === id))
    .filter((facility): facility is NearbyFacility => Boolean(facility));

const buildValueBullets = (project: LocationProject, images: StorageImage[]): string[] => {
  const selected = selectedStorageCategories(project, images);
  const unique = [...new Set(filterFeaturesBySelectedStorageTypes(project.existingContent.features.filter(Boolean), selected))];

  if (unique.length === 0) {
    return [
      formatValueBullet("Convenient Location", project, images),
      formatValueBullet("Secure Gated Access", project, images),
      formatValueBullet("Flexible Month-to-Month Rentals", project, images),
    ];
  }

  return valueBulletsForSection2(unique.map((feature) => formatValueBullet(feature, project, images)));
};

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const buildLocalDraftBody = (
  project: LocationProject,
  place: string,
  localRefs: string[],
  images: StorageImage[],
): string => {
  const useCases = buildStorageUseCasePhrase(selectedStorageCategories(project, images));
  const { city, state } = project.locationIdentity;
  const address = project.existingContent.address?.trim();
  const paragraphs: string[] = [
    `We are proud to serve the ${place} community. Whether you are downsizing, renovating, or simply need extra space, our team understands the storage needs that come with life in ${formatPlaceTitleCase(city, state)}.`,
  ];

  if (localRefs.length > 0) {
    paragraphs.push(
      `Convenient for customers near ${sentenceList(localRefs.slice(0, 3), place)}, our facility makes it easy to store belongings close to home or work. Many ${place} residents rely on us for seasonal gear, moving supplies, and overflow from garages and closets throughout the year.`,
    );
    if (localRefs.length > 3) {
      paragraphs.push(
        `We also welcome customers from ${sentenceList(localRefs.slice(3, 6), "surrounding areas")}, giving more neighbors access to secure, flexible storage when they need it.`,
      );
    }
  } else {
    paragraphs.push(
      `Convenient for customers across ${place} and surrounding communities, we help local families and businesses stay organized with flexible month-to-month rentals and practical amenities designed for everyday storage needs.`,
    );
  }

  paragraphs.push(
    `From weekend projects and home cleanouts to ${useCases} storage needs, we help you keep ${place} living and working spaces clear without long-term commitments.`,
  );
  paragraphs.push(
    address
      ? `This location offers a straightforward rental experience with the features ${place} customers expect. Stop by ${address} to compare unit sizes, or reserve online when you are ready to move in.`
      : `This location offers a straightforward rental experience with the features ${place} customers expect. Contact us to compare unit sizes and check current availability.`,
  );

  let body = paragraphs.join("\n\n");
  if (countWords(body) < 150) {
    body = `${body}\n\nProudly serving ${place} and nearby communities, we make it simple to find dependable storage close to where you live and work.`;
  }

  return body;
};

const buildMapDraftBody = (project: LocationProject): string => buildMapDirectionsCopy(project);

export const buildLocalSectionDraftBody = (project: LocationProject, images: StorageImage[]): string => {
  const place = cityState(project);
  const localRefs = mergeLocalReferences(project.localContext);
  return buildLocalDraftBody(project, place, localRefs, images);
};

export const buildMapSectionDraftBody = (project: LocationProject): string => buildMapDraftBody(project);

export const isStaleDraftSection = (section: DraftSection): boolean =>
  isEditorInstruction(section.body) || section.bullets.some((bullet) => isEditorInstruction(bullet));

const isLegacyDraftSection = (section: DraftSection): boolean => {
  if (section.id === "map-cta" && /office hours|access hours/i.test(section.body)) {
    return true;
  }
  if (["intro", "local", "storage", "value"].includes(section.id) && /My Garage Self Storage\s*\|/i.test(section.body)) {
    return true;
  }
  return false;
};

/** Replace saved prompt/instruction text with generated wireframe copy. Keeps real user edits. */
export const sanitizeDraftSections = (
  project: LocationProject,
  sections: DraftSection[],
  facilities: NearbyFacility[],
  images: StorageImage[],
): DraftSection[] => {
  const fresh = generateDraftSections(project, facilities, images);
  if (sections.length === 0 || sections.length !== fresh.length) {
    return fresh;
  }

  return sections.map((section) => {
    const replacement = fresh.find((item) => item.id === section.id);
    if (!replacement) {
      return section;
    }
    if (isStaleDraftSection(section) || isLegacyDraftSection(section)) {
      debugLog("sanitizeDraftSections", `replaced stale section: ${section.id}`);
      return replacement;
    }
    return { ...section, heading: replacement.heading, label: replacement.label };
  });
};

const adaptSourceFaq = (
  faq: { question: string; answer: string },
  city: string,
  state: string,
  project: LocationProject,
  images: StorageImage[],
): FaqItem | undefined => {
  const question = stripPromotionalLanguage(faq.question.trim());
  const answer = stripPromotionalLanguage(faq.answer.trim());
  if (!isValidFaqCandidate(question, answer)) {
    return undefined;
  }
  const place = formatPlaceTitleCase(city, state);
  const qLower = question.toLowerCase();
  const normalizedQuestion = qLower.includes(place.toLowerCase())
    ? question
    : `${question.replace(/\s*\?*$/, "")} in ${place}?`;
  const item = { question: normalizedQuestion, answer };
  if (!faqMatchesFacilityCapabilities(item, project, images)) {
    return undefined;
  }
  return item;
};

const buildFacilityFeatureFaqs = (project: LocationProject, images: StorageImage[], placeLabel: string): FaqItem[] => {
  const types = selectedStorageCategories(project, images);
  const typesText = types.length > 0 ? types.join(", ") : "multiple unit sizes and storage layouts";
  const gatedFeatures = filterFeaturesBySelectedStorageTypes(project.existingContent.features, types);
  const features = sentenceList(gatedFeatures.slice(0, 4), "gated access, flexible rentals, and secure storage");
  const localRefs = mergeLocalReferences(project.localContext);
  const localRefsText = localRefs.length > 0 ? sentenceList(localRefs, placeLabel) : placeLabel;
  const address = project.existingContent.address || "the address listed on this page";
  const officeHours = project.existingContent.officeHours.trim();
  const accessHours = project.existingContent.accessHours.trim();
  const hoursAnswer =
    officeHours || accessHours
      ? buildOfficeAndAccessHoursAnswer(
          officeHours || "available by phone — contact us for current office hours",
          accessHours || "available by phone — contact us for gate and access hours",
        )
      : "Contact our team for current office and gate access hours.";
  const hasClimate = facilityOffersClimateControlled(project, images);
  const hasVehicle = facilityOffersVehicleStorage(project, images);
  debugLog("buildFacilityFeatureFaqs", "template FAQ flags", {
    selectedTypes: types,
    addClimateFaq: hasClimate,
    addVehicleFaq: hasVehicle,
  });
  const pool: FaqItem[] = [
    {
      question: `What unit sizes and storage types are available in ${placeLabel}?`,
      answer: `This property offers ${typesText} for customers in ${placeLabel}. Contact our team to confirm which unit sizes are available for your storage needs.`,
    },
    {
      question: `What security and access features are available in ${placeLabel}?`,
      answer: `Renters benefit from ${features}. Ask our on-site team how gate access and property security work at this location.`,
    },
    {
      question: `What are the office and access hours in ${placeLabel}?`,
      answer: hoursAnswer,
    },
    {
      question: `Where is this facility located in ${placeLabel}?`,
      answer: `Find us at ${address}${localRefs.length > 0 ? `, convenient for customers near ${localRefsText}` : ""}.`,
    },
    {
      question: `Can I complete my rental online in ${placeLabel}?`,
      answer: `Many customers in ${placeLabel} can start the process online. Contact our team to confirm the current rental workflow for this property.`,
    },
    {
      question: `Why do customers choose storage at this ${placeLabel} location?`,
      answer: `This property combines ${features} with flexible rental options. Compare unit types and amenities to find the right fit.`,
    },
  ];

  if (hasClimate) {
    pool.unshift({
      question: `Does this location offer climate-controlled storage in ${placeLabel}?`,
      answer: `Yes — climate-controlled storage is available at this property. Contact our team to confirm unit sizes and availability before move-in.`,
    });
  }
  if (hasVehicle) {
    pool.unshift({
      question: `Can I store an RV, boat, or vehicle in ${placeLabel}?`,
      answer: `Yes — vehicle storage options are available at this location. Contact us to confirm outdoor, covered, or enclosed parking based on your needs.`,
    });
  }

  return pool.filter((faq) => faqMatchesFacilityCapabilities(faq, project, images));
};

export const generateDraftFaqs = (project: LocationProject, images: StorageImage[]): FaqItem[] => {
  const { city, state } = project.locationIdentity;
  logStep3StorageContext("generateDraftFaqs", project, images, { phase: "start" });

  const rawFaqs = extractFaqsFromRawContent(project.existingContent.rawContent);
  debugLog("generateDraftFaqs", "raw scraped FAQs", { count: rawFaqs.length, questions: rawFaqs.map((f) => f.question) });

  const sourceFaqs = rawFaqs
    .map((faq) => {
      const adapted = adaptSourceFaq(faq, city, state, project, images);
      if (!adapted) {
        const rejected = partitionFaqsByStep3(
          [{ question: faq.question, answer: faq.answer }],
          project,
          images,
        ).rejected;
        if (rejected.length > 0) {
          debugWarn("generateDraftFaqs", "scraped FAQ rejected", rejected[0]);
        } else {
          debugWarn("generateDraftFaqs", "scraped FAQ rejected (invalid candidate)", { question: faq.question });
        }
      }
      return adapted;
    })
    .filter((faq): faq is FaqItem => Boolean(faq));

  const featureFaqs = buildFacilityFeatureFaqs(project, images, formatPlaceTitleCase(city, state));
  debugLog("generateDraftFaqs", "template FAQs built", {
    count: featureFaqs.length,
    questions: featureFaqs.map((f) => f.question),
  });

  const merged: FaqItem[] = [];

  sourceFaqs.forEach((faq) => {
    if (merged.length >= 6) return;
    if (!merged.some((item) => item.question.toLowerCase() === faq.question.toLowerCase())) {
      merged.push(faq);
    }
  });

  featureFaqs.forEach((faq) => {
    if (merged.length >= 6) return;
    if (!merged.some((item) => item.question.toLowerCase() === faq.question.toLowerCase())) {
      merged.push(faq);
    }
  });

  const { kept, rejected } = partitionFaqsByStep3(merged, project, images);
  if (rejected.length > 0) {
    debugWarn("generateDraftFaqs", "merged FAQs blocked by Step 3 gate", { count: rejected.length });
    debugTable("generateDraftFaqs:rejected", rejected);
  }

  const final = filterFaqsByStep3(kept, project, images).slice(0, 6);
  debugLog("generateDraftFaqs", "done", {
    fromSource: sourceFaqs.length,
    fromTemplates: featureFaqs.length,
    mergedBeforeGate: merged.length,
    rejectedByGate: rejected.length,
    finalCount: final.length,
    questions: final.map((f) => f.question),
  });

  return final;
};

export const sanitizeDraftFaqs = (project: LocationProject, faqs: FaqItem[], images: StorageImage[]): FaqItem[] => {
  logStep3StorageContext("sanitizeDraftFaqs", project, images, { incomingCount: faqs.length });

  const invalid = faqs.filter((faq) => !isValidFaqCandidate(faq.question, faq.answer));
  if (invalid.length > 0) {
    debugWarn("sanitizeDraftFaqs", "invalid FAQ candidates removed", invalid.map((f) => f.question));
  }

  const valid = faqs.filter((faq) => isValidFaqCandidate(faq.question, faq.answer));
  const { kept, rejected } = partitionFaqsByStep3(valid, project, images);

  if (rejected.length > 0) {
    debugWarn("sanitizeDraftFaqs", "saved FAQs failed Step 3 gate — will merge fresh", { count: rejected.length });
    debugTable("sanitizeDraftFaqs:rejected", rejected);
  }

  if (rejected.length === 0 && kept.length >= 6) {
    debugLog("sanitizeDraftFaqs", "kept saved FAQs (all pass Step 3)", { count: kept.length });
    return kept.slice(0, 6);
  }

  const fresh = generateDraftFaqs(project, images);
  const merged: FaqItem[] = [...kept];
  fresh.forEach((faq) => {
    if (merged.length >= 6) return;
    if (!merged.some((item) => item.question.toLowerCase() === faq.question.toLowerCase())) {
      merged.push(faq);
    }
  });

  const gated = filterFaqsByStep3(merged, project, images).slice(0, 6);
  debugLog("sanitizeDraftFaqs", "done", {
    keptFromSaved: kept.length,
    freshGenerated: fresh.length,
    finalCount: gated.length,
    questions: gated.map((f) => f.question),
  });
  return gated;
};

export const generateDraftSections = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): DraftSection[] => {
  const { city, state } = project.locationIdentity;
  const place = cityState(project);
  const headings = buildFacilityWireframeHeadings(city, state, place);
  const selectedTypes = selectedStorageCategories(project, images);
  const gatedFeatures = filterFeaturesBySelectedStorageTypes(project.existingContent.features, selectedTypes);
  const featureText = sentenceList(gatedFeatures, "confirmed facility features");
  const valueBullets = buildValueBullets(project, images);
  const storageTypes = selectedTypes;
  const useCasePhrase = buildStorageUseCasePhrase(selectedTypes);
  const localRefs = mergeLocalReferences(project.localContext);
  const nearby = selectedFacilities(project, facilities);
  const nearbyText = sentenceList(
    nearby.map((facility) => {
      const branch = branchLabelFromFacilityName(facility.facilityName);
      return branch ? `${branch} in ${facility.city}` : `${facility.city}, ${facility.state}`;
    }),
    "three nearby My Garage locations",
  );

  const storageDescriptions = storageTypes.map(
    (type) => `${type} at this location helps customers in ${place} store belongings with a layout suited to that storage category.`,
  );
  const typesText = storageTypes.length > 0 ? sentenceList(storageTypes, "flexible storage options") : "flexible storage options";
  const featureSummary = sentenceList(gatedFeatures.slice(0, 4), "practical storage amenities");
  const section1Intro = buildSection1IntroFallback(
    project.locationIdentity.facilityName,
    place,
    project.existingContent.address,
    featureSummary,
  );

  return [
    {
      id: "intro",
      label: "Section 1",
      heading: headings.features,
      body: `${section1Intro} Customers across ${place} choose us for ${featureText} and flexible storage options for ${useCasePhrase} needs.`,
      bullets: amenitiesForSection1(gatedFeatures),
    },
    {
      id: "value",
      label: "Section 2",
      heading: headings.value,
      body: `${VALUE_PROPOSITION_OPENING} we make it easy to find dependable self storage near ${place}. Our flexible rental options, gated access, and modern storage features help you store your belongings without long-term commitments or unnecessary hassle.`,
      bullets: valueBullets,
    },
    {
      id: "storage",
      label: "Section 3",
      heading: headings.storage,
      body:
        storageTypes.length > 0
          ? `This location offers ${typesText} to match different storage needs in ${place}. Compare unit sizes, features, and access options to find the layout that works best for your belongings.`
          : `This location serves ${place} with flexible storage options for ${useCasePhrase} needs.`,
      bullets: storageDescriptions.length > 0 ? storageDescriptions : storageTypes,
    },
    {
      id: "local",
      label: "Section 4",
      heading: headings.local,
      body: buildLocalDraftBody(project, place, localRefs, images),
      bullets: localRefs.slice(0, 6),
    },
    {
      id: "nearby",
      label: "Section 5",
      heading: headings.nearby,
      body:
        nearby.length > 0
          ? `Looking for self storage outside of ${city}? My Garage Self Storage® has multiple convenient locations across the region, including options near ${nearbyText}. Explore our nearby facilities below to find the right fit for your community.`
          : `Looking for self storage outside of ${city}? My Garage Self Storage® has multiple convenient locations across the region.`,
      bullets: nearby.map((facility) => {
        const branch = branchLabelFromFacilityName(facility.facilityName);
        return branch ? `${branch} — ${facility.city}, ${facility.state}` : `${facility.city}, ${facility.state}`;
      }),
    },
    {
      id: "faqs",
      label: "Section 6",
      heading: headings.faq,
      body: `Answers to common questions about ${formatKeywordPhrase(city, state, "faq")}, including unit types, amenities, hours, and directions for customers in ${place}.`,
      bullets: generateDraftFaqs(project, images).map((faq) => faq.question),
    },
    {
      id: "map-cta",
      label: "Section 7",
      heading: headings.map,
      body: buildMapDraftBody(project),
      bullets: [project.existingContent.address, project.existingContent.phone, project.locationIdentity.storagelyPageUrl].filter(
        Boolean,
      ),
    },
  ];
};

export const generateDraftTitleTag = (project: LocationProject): string => {
  const place = cityState(project);
  return `Self Storage in ${place} | My Garage Self Storage`.slice(0, 68);
};

export const generateDraftMetaDescription = (project: LocationProject): string => {
  const place = cityState(project);
  const shortLabel = shortFacilityLabel(project.locationIdentity.facilityName, project.locationIdentity.city);
  const feature = project.existingContent.features[0] || "convenient storage features";
  const description = `My Garage Self Storage® at ${shortLabel} offers ${project.seo.primaryKeyword || `self storage in ${place}`} with ${feature}. View hours, storage types, and nearby locations in ${place}.`;
  return description.slice(0, 156);
};

export const regenerateDraftSection = (
  project: LocationProject,
  sectionId: string,
  facilities: NearbyFacility[],
  images: StorageImage[],
): DraftSection | undefined => {
  const sections = generateDraftSections(project, facilities, images);
  return sections.find((section) => section.id === sectionId);
};

export const cloneDraftSections = (sections: DraftSection[]): DraftSection[] =>
  sections.map((section) => ({ ...section, bullets: [...section.bullets] }));

export const cloneDraftFaqs = (faqs: FaqItem[]): FaqItem[] => faqs.map((faq) => ({ ...faq }));

export const buildDraftBaseline = (generated: LocationProject["generated"]): DraftContentBaseline => ({
  draftTitleTag: generated.draftTitleTag,
  draftMetaDescription: generated.draftMetaDescription,
  draftSections: cloneDraftSections(generated.draftSections),
  draftFaqs: cloneDraftFaqs(generated.draftFaqs),
});

export const refreshAllDraftContent = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): Pick<LocationProject["generated"], "draftTitleTag" | "draftMetaDescription" | "draftSections" | "draftFaqs" | "lastDraftedAt" | "draftBaseline"> => {
  debugLog("refreshAllDraftContent", "start", { projectId: project.id, facility: project.locationIdentity.facilityName });
  logStep3StorageContext("refreshAllDraftContent", project, images);
  const draftTitleTag = generateDraftTitleTag(project);
  const draftMetaDescription = generateDraftMetaDescription(project);
  const draftSections = generateDraftSections(project, facilities, images);
  const draftFaqs = generateDraftFaqs(project, images);
  const lastDraftedAt = new Date().toISOString();
  const draftBaseline: DraftContentBaseline = {
    draftTitleTag,
    draftMetaDescription,
    draftSections: cloneDraftSections(draftSections),
    draftFaqs: cloneDraftFaqs(draftFaqs),
  };

  debugLog("refreshAllDraftContent", "done", {
    sections: draftSections.length,
    faqs: draftFaqs.length,
    localRefs: mergeLocalReferences(project.localContext),
  });

  return { draftTitleTag, draftMetaDescription, draftSections, draftFaqs, lastDraftedAt, draftBaseline };
};

export const refreshDraftSection = (
  project: LocationProject,
  sectionId: string,
  facilities: NearbyFacility[],
  images: StorageImage[],
): DraftSection[] => {
  const freshSections = generateDraftSections(project, facilities, images);
  const section = freshSections.find((item) => item.id === sectionId);
  if (!section) {
    return project.generated.draftSections.length > 0 ? cloneDraftSections(project.generated.draftSections) : freshSections;
  }

  if (project.generated.draftSections.length === 0) {
    return freshSections;
  }

  return project.generated.draftSections.map((item) => (item.id === sectionId ? { ...section, bullets: [...section.bullets] } : item));
};

export const restoreDraftSectionFromBaseline = (
  project: LocationProject,
  sectionId: string,
): DraftSection[] | undefined => {
  const baselineSection = project.generated.draftBaseline?.draftSections.find((section) => section.id === sectionId);
  if (!baselineSection || project.generated.draftSections.length === 0) {
    return undefined;
  }

  return project.generated.draftSections.map((section) =>
    section.id === sectionId ? { ...baselineSection, bullets: [...baselineSection.bullets] } : section,
  );
};

export const restoreAllDraftsFromBaseline = (
  project: LocationProject,
): Pick<LocationProject["generated"], "draftTitleTag" | "draftMetaDescription" | "draftSections" | "draftFaqs" | "lastDraftedAt"> | undefined => {
  const baseline = project.generated.draftBaseline;
  if (!baseline) {
    return undefined;
  }

  return {
    draftTitleTag: baseline.draftTitleTag,
    draftMetaDescription: baseline.draftMetaDescription,
    draftSections: cloneDraftSections(baseline.draftSections),
    draftFaqs: cloneDraftFaqs(baseline.draftFaqs),
    lastDraftedAt: new Date().toISOString(),
  };
};
