import { getStorageImageById } from "./imageLibrary";
import type { DraftSection, FaqItem, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

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

  while (unique.length < 5 && project.existingContent.features.length > 0) {
    const next = project.existingContent.features.find((f) => !unique.includes(f));
    if (!next) break;
    unique.push(next);
  }

  if (unique.length < 5) {
    unique.push("Convenient access for local residents and businesses");
    unique.push("Helpful on-site team for move-in questions");
    unique.push("Practical unit options for household and vehicle storage");
  }

  return unique.slice(0, 8);
};

export const generateDraftFaqs = (project: LocationProject, images: StorageImage[]): FaqItem[] => {
  const place = cityState(project);
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const keyword = project.seo.primaryKeyword || `self storage units in ${place}`;
  const types = selectedStorageTypes(project, images);
  const typesText = types.length > 0 ? types.join(", ") : "various storage options";
  const hasVerifiedLandmarks = false;

  return [
    {
      question: `Do you offer ${keyword}?`,
      answer: `${facilityName} serves customers in ${place} with storage solutions designed for local households, businesses, and vehicle owners. Contact the facility for current unit availability.`,
    },
    {
      question: `What storage types are available at ${facilityName}?`,
      answer: `This location highlights ${typesText}. Availability may vary — confirm specific unit sizes and features with the facility team before renting.`,
    },
    {
      question: "What are the office and access hours?",
      answer: `Office hours: ${project.existingContent.officeHours || "contact the facility for current office hours"}. Access hours: ${project.existingContent.accessHours || "contact the facility for gate and access hours"}.`,
    },
    {
      question: `Where is ${facilityName} located?`,
      answer: `${facilityName} is located at ${project.existingContent.address || "add the confirmed street address before publishing"}.`,
    },
    {
      question: `Why choose ${facilityName} for storage in ${place}?`,
      answer: `${facilityName} combines ${sentenceList(project.existingContent.features.slice(0, 3), "practical facility features")} to support customers who need dependable storage near ${place}.`,
    },
    {
      question: hasVerifiedLandmarks
        ? `What areas near ${place} does this facility serve?`
        : `What should I know about storage near ${place}?`,
      answer: hasVerifiedLandmarks
        ? `The facility serves customers near ${sentenceList(project.localContext.landmarks, place)} and surrounding neighborhoods.`
        : `This page can reference local neighborhoods and landmarks only after manual distance verification. Do not publish unverified proximity claims.`,
    },
  ];
};

export const generateDraftSections = (
  project: LocationProject,
  facilities: NearbyFacility[],
  images: StorageImage[],
): DraftSection[] => {
  const place = cityState(project);
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const keyword = project.seo.primaryKeyword || `self storage in ${place}`;
  const featureText = sentenceList(project.existingContent.features, "confirmed facility features");
  const valueBullets = buildValueBullets(project);
  const storageTypes = selectedStorageTypes(project, images);
  const landmarks = sentenceList(project.localContext.landmarks, "nearby areas you plan to reference");
  const neighborhoods = sentenceList(project.localContext.neighborhoods, "nearby neighborhoods");
  const nearby = selectedFacilities(project, facilities);
  const nearbyText = sentenceList(
    nearby.map((facility) => `${facility.facilityName} in ${facility.city}`),
    "three nearby My Garage locations",
  );

  const storageDescriptions = storageTypes.map(
    (type) => `${type} at ${facilityName} can help customers in ${place} store belongings with a layout suited to that storage category.`,
  );

  return [
    {
      id: "intro",
      label: "Section 1",
      heading: "Introduction",
      body: `Looking for ${keyword}? ${facilityName} offers a straightforward storage experience in ${place}, with ${featureText} that help local customers find the right unit for their needs.`,
      bullets: project.existingContent.features.slice(0, 5),
    },
    {
      id: "value",
      label: "Section 2",
      heading: `Why Choose ${facilityName}?`,
      body: `When comparing storage options in ${place}, ${facilityName} stands out for customers who want clear information, practical amenities, and a team that understands local storage needs.`,
      bullets: valueBullets,
    },
    {
      id: "storage",
      label: "Section 3",
      heading: "Types of Storage",
      body: `Choose storage types for this location. Card copy appears under each image; link headings only when a destination URL exists in Master Data.`,
      bullets: storageDescriptions.length > 0 ? storageDescriptions : storageTypes,
    },
    {
      id: "local",
      label: "Section 4",
      heading: `Serving ${place} and Surrounding Areas`,
      body: `Build local relevance around ${landmarks} and ${neighborhoods}. Do not state that landmarks are within 10 miles unless you have manually verified distance — this tool does not auto-verify proximity.`,
      bullets: [...project.localContext.landmarks, ...project.localContext.neighborhoods].slice(0, 6),
    },
    {
      id: "nearby",
      label: "Section 5",
      heading: "Other Nearby Locations at My Garage",
      body: `Help customers compare other My Garage options: ${nearbyText}. These cards must not link back to the current facility.`,
      bullets: nearby.map((facility) => `${facility.facilityName} — ${facility.city}, ${facility.state}`),
    },
    {
      id: "faqs",
      label: "Section 6",
      heading: "FAQs",
      body: "FAQ answers must match the FAQPage JSON-LD exactly. Regenerate both together after edits.",
      bullets: generateDraftFaqs(project, images).map((faq) => faq.question),
    },
    {
      id: "map-cta",
      label: "Section 7",
      heading: "Map + Location + CTA",
      body: `Close with verified address, phone, map embed, and a CTA to the Storagely page for ${facilityName}.`,
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
