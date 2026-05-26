import { generateDraftFaqs } from "./draftGenerator";
import { defaultImages } from "./imageLibrary";
import { buildStorageImageAltText } from "./myGarageGenerationSpec";
import type { FaqItem, LocationProject, StorageImage } from "../types/storiq";

export const buildStorageImageAlt = (image: StorageImage, project: LocationProject): string =>
  buildStorageImageAltText(image.category, project.locationIdentity.city, project.locationIdentity.state);

export const buildFaqItems = (project: LocationProject, images: StorageImage[] = defaultImages): FaqItem[] => {
  if (project.generated.draftFaqs.length > 0) {
    return project.generated.draftFaqs;
  }

  return generateDraftFaqs(project, images);
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
