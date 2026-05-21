import { defaultImages, getStorageImageById } from "./imageLibrary";
import { cityState } from "./templateUtils";
import type { FaqItem, LocationProject, StorageImage } from "../types/storiq";

export const buildStorageImageAlt = (image: StorageImage, project: LocationProject): string => {
  const place = cityState(project);
  const base = image.altText.trim() || image.category;

  if (!place) {
    return base;
  }

  return base.toLowerCase().includes(place.toLowerCase()) ? base : `${base} in ${place}`;
};

export const buildFaqItems = (project: LocationProject, images: StorageImage[] = defaultImages): FaqItem[] => {
  if (project.generated.draftFaqs.length > 0) {
    return project.generated.draftFaqs;
  }

  const { facilityName } = project.locationIdentity;
  const place = cityState(project) || "this area";
  const keyword = project.seo.primaryKeyword || `self storage units in ${place}`;
  const types = project.selectedStorageImages
    .map((id) => getStorageImageById(images, id)?.category)
    .filter(Boolean)
    .join(", ");

  return [
    {
      question: `Do you offer ${keyword}?`,
      answer: `${facilityName || "This facility"} helps customers find convenient storage options near ${place}, including unit types and features listed on this page.`,
    },
    {
      question: `What storage types are available at ${facilityName || "this location"}?`,
      answer: types
        ? `Available storage options highlighted for this page include ${types}. Confirm current availability with the facility before publishing final copy.`
        : "Storage type availability should be confirmed before publishing the final page.",
    },
    {
      question: "What are the office and access hours?",
      answer: `Office hours: ${project.existingContent.officeHours || "add confirmed office hours"}. Access hours: ${project.existingContent.accessHours || "add confirmed access hours"}.`,
    },
    {
      question: `Where is ${facilityName || "the facility"} located?`,
      answer: `${facilityName || "The facility"} is located at ${project.existingContent.address || "add confirmed facility address"}.`,
    },
  ];
};

export const renderFaqJsonLd = (project: LocationProject, images: StorageImage[] = defaultImages): string => {
  const faqItems = buildFaqItems(project, images);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return JSON.stringify(jsonLd, null, 2);
};
