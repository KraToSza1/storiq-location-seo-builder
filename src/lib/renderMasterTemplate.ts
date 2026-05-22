import { defaultFacilities } from "./facilityLibrary";
import { defaultImages, getStorageImageById, isLinkableStorageType } from "./imageLibrary";
import { generateDraftTitleTag } from "./draftGenerator";
import { getFacilityLocationHeroImage } from "./projectEnhancements";
import { injectMetaDescription, resolveMetaDescription } from "./htmlExport";
import { MASTER_TEMPLATE_CSS } from "./masterTemplateCss";
import { buildFaqItems, buildStorageImageAlt, renderFaqJsonLd } from "./templateFaq";
import { cityState, escapeHtml, formatTelHref, safeUrl, slugify } from "./templateUtils";
import type { DraftSection, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const listMarkup = (items: string[], fallback: string): string => {
  const values = items.length > 0 ? items : [fallback];
  return values.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
};

const findDraftSection = (project: LocationProject, id: string): DraftSection | undefined =>
  project.generated.draftSections.find((section) => section.id === id);

const selectedFacilities = (project: LocationProject, facilities: NearbyFacility[]): NearbyFacility[] =>
  project.selectedNearbyLocations
    .map((id) => facilities.find((facility) => facility.id === id))
    .filter((facility): facility is NearbyFacility => Boolean(facility));

const selectedStorageImages = (project: LocationProject, images: StorageImage[]): StorageImage[] =>
  project.selectedStorageImages
    .map((id) => getStorageImageById(images, id))
    .filter((image): image is StorageImage => Boolean(image));

const renderValueList = (project: LocationProject): string => {
  const valueDraft = findDraftSection(project, "value");
  const bullets = valueDraft?.bullets?.length ? valueDraft.bullets : project.existingContent.features;

  return bullets
    .map((bullet) => {
      const colonIndex = bullet.indexOf(":");
      if (colonIndex > 0) {
        return `<li><strong>${escapeHtml(bullet.slice(0, colonIndex + 1))}</strong> ${escapeHtml(bullet.slice(colonIndex + 1).trim())}</li>`;
      }
      return `<li><strong>${escapeHtml(bullet)}:</strong> A practical benefit for customers comparing storage options in ${escapeHtml(cityState(project) || "the local area")}.</li>`;
    })
    .join("\n");
};

const storageCardDescription = (image: StorageImage, project: LocationProject, images: StorageImage[]): string => {
  const storageDraft = findDraftSection(project, "storage");
  const selected = selectedStorageImages(project, images);
  const index = selected.findIndex((item) => item.id === image.id);
  if (storageDraft?.bullets?.[index]) {
    return storageDraft.bullets[index];
  }
  return `${image.category} at ${project.locationIdentity.facilityName || "this facility"} supports local storage needs in ${cityState(project) || "the area"}. Confirm availability before publishing.`;
};

const renderStorageCard = (image: StorageImage, project: LocationProject, images: StorageImage[]): string => {
  const alt = buildStorageImageAlt(image, project);
  const description = storageCardDescription(image, project, images);
  const heading =
    image.destinationUrl && isLinkableStorageType(image.category)
      ? `<h3><a href="${safeUrl(image.destinationUrl)}" class="storage-card__heading-link">${escapeHtml(image.category)}</a></h3>`
      : `<h3>${escapeHtml(image.category)}</h3>`;

  return `
      <div class="storage-card">
        <img
          class="storage-card__image"
          src="${safeUrl(image.imageUrl)}"
          alt="${escapeHtml(alt)}"
          width="400"
          height="320"
          loading="lazy"
          decoding="async">
        ${heading}
        <p>${escapeHtml(description)}</p>
      </div>`;
};

const renderNearbyLocationCssVars = (facilities: NearbyFacility[]): string => {
  const lines = facilities
    .filter((facility) => facility.imageUrl?.trim())
    .map((facility) => {
      const key = slugify(facility.city || facility.facilityName);
      return `    --img-loc-${key}: url('${facility.imageUrl!.replace(/'/g, "%27")}');`;
    });

  if (lines.length === 0) {
    return "";
  }

  return `:root {\n${lines.join("\n")}\n  }\n\n`;
};

const renderNearbyCard = (facility: NearbyFacility, project: LocationProject): string => {
  const imageKey = slugify(facility.city || facility.facilityName);
  const imageClass = facility.imageUrl ? `location-card__image--${imageKey}` : "";
  const place = cityState(project);
  const linkLabel = `View ${facility.city} Storage`;

  return `
      <article class="location-card">
        <div class="location-card__image ${imageClass}" role="img" aria-label="Self storage units in ${escapeHtml(facility.city)}, ${escapeHtml(facility.state)} near ${escapeHtml(place)}"></div>
        <div class="location-card__content">
          <h3>${escapeHtml(facility.city)}, ${escapeHtml(facility.state)}</h3>
          <p>${escapeHtml(
            facility.notes?.trim() ||
              `Convenient self storage in ${facility.city}, ${facility.state}, with flexible month-to-month rentals and easy access for residents and businesses near ${place}.`,
          )}</p>
          <a href="${safeUrl(facility.storagelyUrl)}" class="location-card__link">${escapeHtml(linkLabel)}</a>
        </div>
      </article>`;
};

const renderLocalParagraphs = (project: LocationProject): string => {
  const localDraft = findDraftSection(project, "local");
  const place = cityState(project) || "the local area";
  const { localContext } = project;
  const paragraphs: string[] = [];

  if (localDraft?.body?.trim()) {
    localDraft.body
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => paragraphs.push(`<p>${escapeHtml(part)}</p>`));
  }

  if (paragraphs.length === 0) {
    paragraphs.push(
      `<p>${escapeHtml(
        `${project.locationIdentity.facilityName || "This facility"} serves customers across ${place}. Add verified local landmarks and neighborhoods in Step 5 before publishing final copy.`,
      )}</p>`,
    );
  }

  if (localContext.landmarks.length > 0 && paragraphs.length < 3) {
    paragraphs.push(
      `<p>Located near ${localContext.landmarks
        .slice(0, 3)
        .map((item) => `<strong>${escapeHtml(item)}</strong>`)
        .join(", ")}, this facility supports customers across ${escapeHtml(place)}.</p>`,
    );
  }

  if (localContext.lifestyleTieIns.length > 0 && paragraphs.length < 3) {
    paragraphs.push(`<p>${escapeHtml(localContext.lifestyleTieIns[0])}</p>`);
  }

  if (paragraphs.length < 2) {
    paragraphs.push(
      `<p>Proudly serving ${escapeHtml(place)} and surrounding communities. Verify that all local references are within 10 miles / 16 km before publishing.</p>`,
    );
  }

  return paragraphs.slice(0, 3).join("\n    ");
};

const extractMapIframe = (iframeCode: string): string => {
  const trimmed = iframeCode.trim();
  if (!trimmed) {
    return `<p style="padding:2rem;text-align:center;color:#555;">Add a Google Maps embed in Step 3 before exporting.</p>`;
  }
  const match = trimmed.match(/<iframe\b[\s\S]*?<\/iframe>/i);
  return match?.[0] ?? trimmed;
};

const renderPageTitle = (project: LocationProject): string => {
  if (project.seo.titleTag.trim()) {
    return project.seo.titleTag.trim();
  }
  return generateDraftTitleTag(project);
};

export const renderStoragelyHtml = (
  project: LocationProject,
  facilities: NearbyFacility[] = defaultFacilities,
  images: StorageImage[] = defaultImages,
): string => {
  const place = cityState(project);
  const { city, state } = project.locationIdentity;
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const keyword = project.seo.primaryKeyword || `self storage units in ${place}`;
  const featuresDraft = findDraftSection(project, "intro");
  const valueDraft = findDraftSection(project, "value");
  const storageDraft = findDraftSection(project, "storage");
  const nearbyDraft = findDraftSection(project, "nearby");
  const faqItems = buildFaqItems(project, images);
  const faqJsonLd = renderFaqJsonLd(project, images);
  const nearby = selectedFacilities(project, facilities);
  const storageCards = selectedStorageImages(project, images)
    .map((image) => renderStorageCard(image, project, images))
    .join("\n");
  const nearbyCards = nearby.map((facility) => renderNearbyCard(facility, project)).join("\n");
  const nearbyCss = renderNearbyLocationCssVars(nearby);
  const phone = project.existingContent.phone.trim();
  const telHref = formatTelHref(phone);
  const heroImageUrl = getFacilityLocationHeroImage(project, images);
  const heroMarkup = heroImageUrl
    ? `<figure class="facility-hero"><img src="${safeUrl(heroImageUrl)}" alt="${escapeHtml(facilityName)} in ${escapeHtml(city)}, ${escapeHtml(state)}" width="1200" height="480" loading="lazy" decoding="async"></figure>`
    : "";

  const documentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(renderPageTitle(project))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<style>
${nearbyCss}${MASTER_TEMPLATE_CSS}
</style>
</head>
<body>

<main id="facility-template" class="facility-template">

  ${heroMarkup}
  <section class="facility-section facility-section--white">
    <h2>Features &amp; Amenities in ${escapeHtml(city)}, ${escapeHtml(state)}</h2>
    <p>${escapeHtml(
      featuresDraft?.body ||
        `Our ${city} self storage facility offers practical amenities designed to make your storage experience secure, convenient, and hassle-free.`,
    )}</p>
    <ul class="facility-list">
      ${listMarkup(project.existingContent.features, "Add confirmed Features &amp; Amenities before publishing.")}
    </ul>
  </section>

  <section class="facility-section facility-section--light">
    <h2>Why Choose Our Self Storage Units in ${escapeHtml(city)}, ${escapeHtml(state)}?</h2>
    <p>${escapeHtml(
      valueDraft?.body ||
        `At ${facilityName}, we make it easy to find dependable self storage near ${place} with flexible rentals, helpful facility information, and practical storage features.`,
    )}</p>
    <ul class="facility-list facility-list--single facility-features">
      ${renderValueList(project)}
    </ul>
  </section>

  <section class="facility-section facility-section--white">
    <h2>Types of Self Storage Units Available in ${escapeHtml(city)}, ${escapeHtml(state)}</h2>
    <p>${escapeHtml(
      storageDraft?.body || "Select the storage types that apply to this location and confirm availability before publishing.",
    )}</p>
    <div class="storage-grid">
      ${storageCards || "<p>Select storage type images in Step 4 before exporting.</p>"}
    </div>
  </section>

  <section class="facility-section facility-section--light">
    <h2>Serving ${escapeHtml(place)} and Surrounding Areas</h2>
    ${renderLocalParagraphs(project)}
  </section>

  <section class="facility-section facility-section--white">
    <h2>Other Nearby Locations at My Garage</h2>
    <p>${escapeHtml(
      nearbyDraft?.body ||
        `Looking for self storage outside of ${city}? My Garage Self Storage has multiple convenient locations across the region.`,
    )}</p>
    <div class="locations-grid">
      ${nearbyCards || "<p>Select 3–6 nearby facilities in Step 5 before exporting.</p>"}
    </div>
  </section>

  <section class="facility-section facility-section--light">
    <h2>FAQs about Self Storage in ${escapeHtml(city)}, ${escapeHtml(state)}</h2>
    ${faqItems
      .map(
        (item) => `
    <details class="faq-item">
      <summary><h3>${escapeHtml(item.question)}</h3></summary>
      <p>${escapeHtml(item.answer)}</p>
    </details>`,
      )
      .join("\n")}
  </section>

  <section class="facility-section facility-section--brand">
    <div class="map-section">
      <div class="map-section__map">
        ${extractMapIframe(project.googleMaps.iframeCode)}
      </div>
      <div class="map-section__info">
        <h2>Convenient Self Storage in ${escapeHtml(city)}, ${escapeHtml(state)}</h2>
        <p><strong>${escapeHtml(facilityName)}</strong><br>
        ${escapeHtml(project.existingContent.address || "Address required")}</p>
        <p>Find ${escapeHtml(keyword)} with verified hours, storage types, and facility details for ${escapeHtml(place)}.</p>
        ${project.existingContent.accessHours ? `<p><strong>Access Hours:</strong> ${escapeHtml(project.existingContent.accessHours)}</p>` : ""}
        ${project.existingContent.officeHours ? `<p><strong>Office Hours:</strong> ${escapeHtml(project.existingContent.officeHours)}</p>` : ""}
        ${phone ? `<a href="${escapeHtml(telHref)}" class="cta-button">Call ${escapeHtml(phone)}</a>` : `<a href="${safeUrl(project.locationIdentity.storagelyPageUrl || "#")}" class="cta-button">View Units</a>`}
      </div>
    </div>
  </section>

  <script type="application/ld+json">
  ${faqJsonLd}
  </script>

</main>

</body>
</html>`;

  return injectMetaDescription(documentHtml, resolveMetaDescription(project));
};
