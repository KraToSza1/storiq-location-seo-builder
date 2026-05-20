import { defaultFacilities } from "./facilityLibrary";
import { defaultImages, getStorageImageById, isLinkableStorageType } from "./imageLibrary";
import type { DraftSection, FaqItem, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const safeUrl = (value: string): string => escapeHtml(value.trim());

const cityState = (project: LocationProject): string =>
  [project.locationIdentity.city, project.locationIdentity.state].filter(Boolean).join(", ");

const listMarkup = (items: string[], fallback: string): string => {
  const values = items.length > 0 ? items : [fallback];
  return values.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
};

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

const selectedFacilities = (project: LocationProject, facilities: NearbyFacility[]): NearbyFacility[] =>
  project.selectedNearbyLocations
    .map((id) => facilities.find((facility) => facility.id === id))
    .filter((facility): facility is NearbyFacility => Boolean(facility));

const selectedStorageImages = (project: LocationProject, images: StorageImage[]): StorageImage[] =>
  project.selectedStorageImages
    .map((id) => getStorageImageById(images, id))
    .filter((image): image is StorageImage => Boolean(image));

const renderStorageCard = (image: StorageImage, project: LocationProject): string => {
  const heading =
    image.destinationUrl && isLinkableStorageType(image.category)
      ? `<h3><a href="${safeUrl(image.destinationUrl)}">${escapeHtml(image.category)}</a></h3>`
      : `<h3>${escapeHtml(image.category)}</h3>`;
  const alt = buildStorageImageAlt(image, project);

  return `
    <article class="facility-template__card">
      <img src="${safeUrl(image.imageUrl)}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async" width="640" height="420" />
      ${heading}
      <p>${escapeHtml(image.category)} options can support local storage needs when availability is confirmed for this facility.</p>
    </article>`;
};

const renderNearbyCard = (facility: NearbyFacility): string => `
  <article class="facility-template__nearby-card">
    ${
      facility.imageUrl
        ? `<img src="${safeUrl(facility.imageUrl)}" alt="${escapeHtml(`${facility.facilityName} in ${facility.city}, ${facility.state}`)}" loading="lazy" decoding="async" width="480" height="320" />`
        : ""
    }
    <h3><a href="${safeUrl(facility.storagelyUrl)}">${escapeHtml(facility.facilityName)}</a></h3>
    <p>${escapeHtml(facility.address)}</p>
    <a class="facility-template__text-link" href="${safeUrl(facility.storagelyUrl)}">View ${escapeHtml(facility.city)} storage</a>
  </article>`;

const renderMap = (project: LocationProject): string =>
  project.googleMaps.iframeCode.trim() ||
  `<div class="facility-template__map-placeholder">Google Maps iframe required before export.</div>`;

const findDraftSection = (project: LocationProject, id: string): DraftSection | undefined =>
  project.generated.draftSections.find((section) => section.id === id);

const renderScopedCss = (): string => `<style>
#facility-template.facility-template {
  --facility-blue: #1d4ed8;
  --facility-blue-dark: #1e3a8a;
  --facility-gray: #475569;
  --facility-border: #dbe3ef;
  --facility-surface: #ffffff;
  color: #172033;
  font-family: Arial, Helvetica, sans-serif;
  line-height: 1.6;
  max-width: 1180px;
  margin: 0 auto;
  padding: 24px 18px 48px;
}
#facility-template .facility-template__section {
  border-top: 1px solid var(--facility-border);
  padding: 34px 0;
}
#facility-template h1,
#facility-template h2,
#facility-template h3 {
  color: #0f172a;
  line-height: 1.2;
  margin: 0 0 14px;
}
#facility-template h1 {
  font-size: clamp(30px, 4vw, 48px);
}
#facility-template h2 {
  font-size: clamp(24px, 3vw, 34px);
}
#facility-template h3 {
  font-size: 20px;
}
#facility-template p {
  color: var(--facility-gray);
  margin: 0 0 14px;
}
#facility-template ul {
  margin: 0;
  padding-left: 20px;
}
#facility-template a {
  color: var(--facility-blue);
  font-weight: 700;
}
#facility-template .facility-template__hero {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 28px;
}
#facility-template .facility-template__grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
}
#facility-template .facility-template__card,
#facility-template .facility-template__nearby-card {
  background: var(--facility-surface);
  border: 1px solid var(--facility-border);
  border-radius: 8px;
  overflow: hidden;
  padding: 18px;
}
#facility-template .facility-template__card img,
#facility-template .facility-template__nearby-card img {
  aspect-ratio: 16 / 10;
  border-radius: 6px;
  display: block;
  height: auto;
  margin: 0 0 14px;
  object-fit: cover;
  width: 100%;
}
#facility-template .facility-template__two-column {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
}
#facility-template .facility-template__cta {
  align-items: center;
  background: var(--facility-blue-dark);
  border-radius: 8px;
  color: #ffffff;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: space-between;
  padding: 22px;
}
#facility-template .facility-template__cta p,
#facility-template .facility-template__cta h2,
#facility-template .facility-template__cta h3 {
  color: #ffffff;
}
#facility-template .facility-template__button {
  background: #ffffff;
  border-radius: 6px;
  color: var(--facility-blue-dark);
  display: inline-block;
  padding: 12px 18px;
  text-decoration: none;
}
#facility-template .facility-template__map iframe {
  border: 0;
  border-radius: 8px;
  min-height: 340px;
  width: 100%;
}
#facility-template .facility-template__map-placeholder {
  background: #f8fafc;
  border: 1px dashed var(--facility-border);
  border-radius: 8px;
  color: var(--facility-gray);
  padding: 30px;
}
#facility-template details {
  border: 1px solid var(--facility-border);
  border-radius: 8px;
  margin-bottom: 12px;
  padding: 14px 16px;
}
#facility-template summary {
  cursor: pointer;
}
#facility-template summary h3 {
  display: inline;
}
@media (max-width: 760px) {
  #facility-template.facility-template {
    padding: 18px 12px 36px;
  }
  #facility-template .facility-template__two-column {
    grid-template-columns: 1fr;
  }
}
</style>`;

export const renderStoragelyHtml = (
  project: LocationProject,
  facilities: NearbyFacility[] = defaultFacilities,
  images: StorageImage[] = defaultImages,
): string => {
  const { locationIdentity, existingContent, localContext } = project;
  const place = cityState(project);
  const facilityName = locationIdentity.facilityName || "My Garage Self Storage";
  const faqItems = buildFaqItems(project, images);
  const faqJsonLd = renderFaqJsonLd(project, images);
  const featuresDraft = findDraftSection(project, "features");
  const valueDraft = findDraftSection(project, "value");
  const storageDraft = findDraftSection(project, "storage");
  const localDraft = findDraftSection(project, "local");
  const storageCards = selectedStorageImages(project, images).map((image) => renderStorageCard(image, project)).join("\n");
  const nearbyCards = selectedFacilities(project, facilities).map(renderNearbyCard).join("\n");
  const valueProps =
    existingContent.uniqueSellingPoints.length > 0
      ? existingContent.uniqueSellingPoints
      : ["Convenient local storage options", "Helpful facility team", "Clean, practical storage features"];

  return `${renderScopedCss()}
<main id="facility-template" class="facility-template">
  <header class="facility-template__hero">
    <h1>${escapeHtml(project.seo.primaryKeyword || `Self Storage Units in ${place}`)}</h1>
    <p>${escapeHtml(facilityName)} provides convenient storage options for customers in ${escapeHtml(place || "the local area")}.</p>
  </header>

  <section class="facility-template__section" aria-labelledby="features-amenities">
    <h2 id="features-amenities">Features &amp; Amenities</h2>
    <div class="facility-template__two-column">
      <div>
        <p>${escapeHtml(featuresDraft?.body || "Use this section to highlight verified facility amenities and practical reasons customers choose this location.")}</p>
        <ul>
          ${listMarkup(existingContent.features, "Add confirmed facility features before publishing.")}
        </ul>
      </div>
      <div>
        <h3>Facility Details</h3>
        <p><strong>Address:</strong> ${escapeHtml(existingContent.address || "Address required")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(existingContent.phone || "Phone required")}</p>
        <p><strong>Office Hours:</strong> ${escapeHtml(existingContent.officeHours || "Office hours required")}</p>
        <p><strong>Access Hours:</strong> ${escapeHtml(existingContent.accessHours || "Access hours required")}</p>
      </div>
    </div>
  </section>

  <section class="facility-template__section" aria-labelledby="value-proposition">
    <h2 id="value-proposition">Why Choose ${escapeHtml(facilityName)}?</h2>
    <p>${escapeHtml(valueDraft?.body || `${facilityName} is built to support local storage needs with a straightforward rental experience and helpful facility information.`)}</p>
    <ul>
      ${listMarkup(valueProps, "Add verified value propositions before publishing.")}
    </ul>
  </section>

  <section class="facility-template__section" aria-labelledby="types-storage">
    <h2 id="types-storage">Types of Storage</h2>
    <p>${escapeHtml(storageDraft?.body || "Select the storage types that apply to this location and confirm availability before publishing.")}</p>
    <div class="facility-template__grid">
      ${storageCards || "<p>Select storage type cards before exporting final HTML.</p>"}
    </div>
  </section>

  <section class="facility-template__section" aria-labelledby="local-content">
    <h2 id="local-content">Serving ${escapeHtml(place || "Your City, State")} and Surrounding Areas</h2>
    <p>${escapeHtml(localDraft?.body || "Local landmarks and lifestyle references in this section require manual verification that they are within 10 miles / 16 km of the facility before publication.")}</p>
    <div class="facility-template__grid">
      <div>
        <h3>Nearby Landmarks</h3>
        <ul>${listMarkup(localContext.landmarks, "Manual landmark research required.")}</ul>
      </div>
      <div>
        <h3>Neighborhoods</h3>
        <ul>${listMarkup(localContext.neighborhoods, "Add nearby neighborhoods where relevant.")}</ul>
      </div>
      <div>
        <h3>Local Lifestyle Tie-Ins</h3>
        <ul>${listMarkup(localContext.lifestyleTieIns, "Add verified local lifestyle tie-ins.")}</ul>
      </div>
    </div>
  </section>

  <section class="facility-template__section" aria-labelledby="nearby-locations">
    <h2 id="nearby-locations">Other Nearby Locations at My Garage</h2>
    <div class="facility-template__grid">
      ${nearbyCards || "<p>Select exactly 3 nearby locations before exporting final HTML.</p>"}
    </div>
  </section>

  <section class="facility-template__section" aria-labelledby="faqs">
    <h2 id="faqs">FAQs</h2>
    ${faqItems
      .map(
        (item) => `<details>
      <summary><h3>${escapeHtml(item.question)}</h3></summary>
      <p>${escapeHtml(item.answer)}</p>
    </details>`,
      )
      .join("\n")}
  </section>

  <section class="facility-template__section" aria-labelledby="map-location-cta">
    <h2 id="map-location-cta">Map + Location + CTA</h2>
    <div class="facility-template__two-column">
      <div class="facility-template__map">
        ${renderMap(project)}
      </div>
      <div>
        <h3>${escapeHtml(facilityName)}</h3>
        <p>${escapeHtml(existingContent.address || "Address required")}</p>
        <p>${escapeHtml(existingContent.phone || "Phone required")}</p>
        <div class="facility-template__cta">
          <div>
            <h3>Find Storage in ${escapeHtml(place || "Your Area")}</h3>
            <p>Review current unit availability and facility details before publishing.</p>
          </div>
          <a class="facility-template__button" href="${safeUrl(locationIdentity.storagelyPageUrl || "#")}">View Units</a>
        </div>
      </div>
    </div>
  </section>

  <script type="application/ld+json">
${faqJsonLd}
  </script>
</main>`;
};
