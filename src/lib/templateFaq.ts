import { debugWarn } from "./debugLog";
import { generateDraftFaqs } from "./draftGenerator";
import { defaultImages } from "./imageLibrary";
import { buildStorageImageAltText } from "./myGarageGenerationSpec";
import { filterFaqsByStep3, partitionFaqsByStep3 } from "./storageTypeFidelity";
import type { FaqItem, LocationProject, StorageImage } from "../types/storiq";

export const buildStorageImageAlt = (image: StorageImage, project: LocationProject): string =>
  buildStorageImageAltText(image.category, project.locationIdentity.city, project.locationIdentity.state);

export const buildFaqItems = (project: LocationProject, images: StorageImage[] = defaultImages): FaqItem[] => {
  const source =
    project.generated.draftFaqs.length > 0 ? project.generated.draftFaqs : generateDraftFaqs(project, images);
  const { kept, rejected } = partitionFaqsByStep3(source, project, images);
  if (rejected.length > 0) {
    debugWarn("buildFaqItems", "export blocked FAQs removed at render", { count: rejected.length, rejected });
  }
  return filterFaqsByStep3(kept, project, images).slice(0, 6);
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
