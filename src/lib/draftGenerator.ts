import {
  collapseWhitespace,
  formatKeywordPhrase,
  formatPlaceTitleCase,
  isValidFaqCandidate,
} from "./contentQuality";
import { buildFacilityWireframeHeadings, VALUE_PROPOSITION_OPENING } from "./facilityWireframe";
import { getStorageImageById } from "./imageLibrary";
import { mergeLocalReferences } from "./localContextUtils";
import { extractFaqsFromRawContent } from "./contentExtraction";
import { amenitiesForSection1, buildSection1IntroFallback, stripPromotionalLanguage, valueBulletsForSection2 } from "./myGarageGenerationSpec";
import { isEditorInstruction } from "./templateDraftUtils";
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

const selectedStorageTypes = (project: LocationProject, images: StorageImage[]): string[] =>
  project.selectedStorageImages
    .map((id) => getStorageImageById(images, id)?.category)
    .filter((category): category is string => Boolean(category));

const buildValueBullets = (project: LocationProject): string[] => {
  const unique = [...new Set(project.existingContent.features.filter(Boolean))];

  if (unique.length === 0) {
    return [
      formatValueBullet("Convenient Location", project),
      formatValueBullet("Secure Gated Access", project),
      formatValueBullet("Flexible Month-to-Month Rentals", project),
    ];
  }

  return valueBulletsForSection2(unique.map((feature) => formatValueBullet(feature, project)));
};

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const buildLocalDraftBody = (
  project: LocationProject,
  facilityName: string,
  place: string,
  localRefs: string[],
): string => {
  const { city, state } = project.locationIdentity;
  const address = project.existingContent.address?.trim();
  const paragraphs: string[] = [
    `${facilityName} is proud to serve the ${place} community. Whether you are downsizing, renovating, or simply need extra space, our team understands the storage needs that come with life in ${formatPlaceTitleCase(city, state)}.`,
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
    `From weekend projects and home cleanouts to business inventory and vehicle storage, ${facilityName} helps you keep ${place} living and working spaces clear without long-term commitments.`,
  );
  paragraphs.push(
    address
      ? `${facilityName} offers a straightforward rental experience with the features ${place} customers expect. Stop by ${address} to compare unit sizes, or reserve online when you are ready to move in.`
      : `${facilityName} offers a straightforward rental experience with the features ${place} customers expect. Contact the facility to compare unit sizes and check current availability.`,
  );

  let body = paragraphs.join("\n\n");
  if (countWords(body) < 150) {
    body = `${body}\n\nProudly serving ${place} and nearby communities, we make it simple to find dependable storage close to where you live and work.`;
  }

  return body;
};

const buildMapDraftBody = (project: LocationProject, facilityName: string, place: string): string => {
  const address = project.existingContent.address?.trim() || place;
  const officeHours =
    collapseWhitespace(project.existingContent.officeHours?.trim() || "") || "contact the facility for current office hours";
  const accessHours =
    collapseWhitespace(project.existingContent.accessHours?.trim() || "") || "contact the facility for gate and access hours";

  return `${facilityName} is located at ${address} in ${place}. Office hours: ${officeHours}. Access hours: ${accessHours}. Use the map for directions, then contact the facility or reserve online when you are ready to move in.`;
};

export const buildLocalSectionDraftBody = (project: LocationProject): string => {
  const place = cityState(project);
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const localRefs = mergeLocalReferences(project.localContext);
  return buildLocalDraftBody(project, facilityName, place, localRefs);
};

export const buildMapSectionDraftBody = (project: LocationProject): string => {
  const place = cityState(project);
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  return buildMapDraftBody(project, facilityName, place);
};

export const isStaleDraftSection = (section: DraftSection): boolean =>
  isEditorInstruction(section.body) || section.bullets.some((bullet) => isEditorInstruction(bullet));

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
    if (isStaleDraftSection(section)) {
      return replacement;
    }
    return { ...section, heading: replacement.heading, label: replacement.label };
  });
};

const adaptSourceFaq = (faq: { question: string; answer: string }, city: string, state: string): FaqItem | undefined => {
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
  return { question: normalizedQuestion, answer };
};

const buildFacilityFeatureFaqs = (project: LocationProject, images: StorageImage[], placeLabel: string): FaqItem[] => {
  const types = selectedStorageTypes(project, images);
  const typesText = types.length > 0 ? types.join(", ") : "multiple unit sizes and storage layouts";
  const features = sentenceList(project.existingContent.features.slice(0, 4), "gated access, flexible rentals, and secure storage");
  const localRefs = mergeLocalReferences(project.localContext);
  const localRefsText = localRefs.length > 0 ? sentenceList(localRefs, placeLabel) : placeLabel;
  const address = project.existingContent.address || "the address listed on this page";
  const officeHours = project.existingContent.officeHours || "available by phone — contact us for current office hours";
  const accessHours = project.existingContent.accessHours || "available by phone — contact us for gate and access hours";
  const featureText = project.existingContent.features.join(" ").toLowerCase();
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
      answer: `Office hours are ${officeHours} and access hours are ${accessHours}.`,
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

  if (featureText.includes("climate")) {
    pool.unshift({
      question: `Does this location offer climate-controlled storage in ${placeLabel}?`,
      answer: `Yes — climate-controlled options may be available at this property. Confirm unit availability with our team before move-in.`,
    });
  }
  if (featureText.includes("rv") || featureText.includes("boat") || types.some((t) => /rv|boat/i.test(t))) {
    pool.unshift({
      question: `Can I store an RV or boat in ${placeLabel}?`,
      answer: `Vehicle storage options may be available in ${placeLabel}. Contact us to confirm outdoor, covered, or enclosed vehicle storage based on your needs.`,
    });
  }

  return pool;
};

export const generateDraftFaqs = (project: LocationProject, images: StorageImage[]): FaqItem[] => {
  const { city, state } = project.locationIdentity;
  const sourceFaqs = extractFaqsFromRawContent(project.existingContent.rawContent)
    .map((faq) => adaptSourceFaq(faq, city, state))
    .filter((faq): faq is FaqItem => Boolean(faq));
  const featureFaqs = buildFacilityFeatureFaqs(project, images, formatPlaceTitleCase(city, state));
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

  return merged.slice(0, 6);
};

export const sanitizeDraftFaqs = (project: LocationProject, faqs: FaqItem[], images: StorageImage[]): FaqItem[] => {
  const cleaned = faqs.filter((faq) => isValidFaqCandidate(faq.question, faq.answer));
  if (cleaned.length >= 6) {
    return cleaned.slice(0, 6);
  }
  const fresh = generateDraftFaqs(project, images);
  const merged: FaqItem[] = [...cleaned];
  fresh.forEach((faq) => {
    if (merged.length >= 6) return;
    if (!merged.some((item) => item.question.toLowerCase() === faq.question.toLowerCase())) {
      merged.push(faq);
    }
  });
  return merged.slice(0, 6);
};

export const generateDraftSections = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): DraftSection[] => {
  const { city, state } = project.locationIdentity;
  const place = cityState(project);
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const headings = buildFacilityWireframeHeadings(city, state, place);
  const featureText = sentenceList(project.existingContent.features, "confirmed facility features");
  const valueBullets = buildValueBullets(project);
  const storageTypes = selectedStorageTypes(project, images);
  const localRefs = mergeLocalReferences(project.localContext);
  const nearby = selectedFacilities(project, facilities);
  const nearbyText = sentenceList(
    nearby.map((facility) => `${facility.facilityName} in ${facility.city}`),
    "three nearby My Garage locations",
  );

  const storageDescriptions = storageTypes.map(
    (type) => `${type} at ${facilityName} can help customers in ${place} store belongings with a layout suited to that storage category.`,
  );
  const typesText = storageTypes.length > 0 ? sentenceList(storageTypes, "flexible storage options") : "flexible storage options";
  const featureSummary = sentenceList(project.existingContent.features.slice(0, 4), "practical storage amenities");
  const section1Intro = buildSection1IntroFallback(
    facilityName,
    place,
    project.existingContent.address,
    featureSummary,
  );

  return [
    {
      id: "intro",
      label: "Section 1",
      heading: headings.features,
      body: `${section1Intro} Customers across ${place} choose us for ${featureText} and flexible storage options for household, business, and vehicle needs.`,
      bullets: amenitiesForSection1(project.existingContent.features),
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
          ? `${facilityName} in ${place} offers ${typesText} to match different storage needs. Compare unit sizes, features, and access options to find the layout that works best for your belongings.`
          : `${facilityName} serves ${place} with flexible storage options for household, business, and vehicle storage.`,
      bullets: storageDescriptions.length > 0 ? storageDescriptions : storageTypes,
    },
    {
      id: "local",
      label: "Section 4",
      heading: headings.local,
      body: buildLocalDraftBody(project, facilityName, place, localRefs),
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
      bullets: nearby.map((facility) => `${facility.facilityName} — ${facility.city}, ${facility.state}`),
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
      body: buildMapDraftBody(project, facilityName, place),
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
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const feature = project.existingContent.features[0] || "convenient storage features";
  const description = `${facilityName} offers ${project.seo.primaryKeyword || `self storage in ${place}`} with ${feature}. View hours, storage types, and nearby My Garage locations in ${place}.`;
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
