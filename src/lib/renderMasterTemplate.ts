import { DEFAULT_PUBLISH_ASSET_BASE, toAbsoluteMediaUrl } from "./assetUrls";
import { defaultFacilities } from "./facilityLibrary";
import { defaultImages, getStorageImageById, isLinkableStorageType } from "./imageLibrary";
import { generateDraftTitleTag } from "./draftGenerator";
import { injectMetaDescription, resolveMetaDescription } from "./htmlExport";
import { MASTER_TEMPLATE_CSS } from "./masterTemplateCss";
import { exportDraftBody, isEditorInstruction } from "./templateDraftUtils";
import { buildFaqItems, buildStorageImageAlt, renderFaqJsonLd } from "./templateFaq";
import { cityState, escapeHtml, externalLinkAttrs, formatTelHref, safeUrl, slugify } from "./templateUtils";
import type { DraftSection, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const publishMediaUrl = (url: string | undefined | null, publishAssetBaseUrl: string): string =>
  toAbsoluteMediaUrl(url, publishAssetBaseUrl);

const nearbyLocationClass = (facility: NearbyFacility): string =>
  slugify(`${facility.city}-${facility.facilityName || facility.id}`);

const renderNearbyLocationCss = (facilities: NearbyFacility[], publishAssetBaseUrl: string): string => {
  const withImages = facilities.filter((facility) => facility.imageUrl?.trim());
  if (withImages.length === 0) {
    return "";
  }

  const varLines = withImages.map((facility) => {
    const key = nearbyLocationClass(facility);
    const url = publishMediaUrl(facility.imageUrl, publishAssetBaseUrl).replace(/'/g, "%27");
    return `    --img-loc-${key}: url('${url}');`;
  });

  const classLines = withImages.map((facility) => {
    const key = nearbyLocationClass(facility);
    return `  .location-card__image--${key} { background-image: var(--img-loc-${key}); }`;
  });

  return `:root {\n${varLines.join("\n")}\n  }\n\n${classLines.join("\n")}\n\n`;
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

const listMarkup = (items: string[], fallback: string): string => {
  const values = items.length > 0 ? items : [fallback];
  return values.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
};

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
  if (storageDraft?.bullets?.[index] && !isEditorInstruction(storageDraft.bullets[index])) {
    return storageDraft.bullets[index];
  }
  return `${image.category} at ${project.locationIdentity.facilityName || "this facility"} supports local storage needs in ${cityState(project) || "the area"}.`;
};

const renderStorageCard = (
  image: StorageImage,
  project: LocationProject,
  images: StorageImage[],
  publishAssetBaseUrl: string,
): string => {
  const alt = buildStorageImageAlt(image, project);
  const description = storageCardDescription(image, project, images);
  const heading =
    image.destinationUrl && isLinkableStorageType(image.category)
      ? `<h3><a href="${safeUrl(image.destinationUrl)}" class="storage-card__heading-link"${externalLinkAttrs(image.destinationUrl)}>${escapeHtml(image.category)}</a></h3>`
      : `<h3>${escapeHtml(image.category)}</h3>`;
  const imageSrc = publishMediaUrl(image.imageUrl, publishAssetBaseUrl);
  const imageMarkup = imageSrc
    ? `<img
          class="storage-card__image"
          src="${safeUrl(imageSrc)}"
          alt="${escapeHtml(alt)}"
          width="400"
          height="320"
          loading="lazy"
          decoding="async">`
    : `<div class="storage-card__image storage-card__image--empty" role="img" aria-label="${escapeHtml(alt)}"></div>`;

  return `
      <div class="storage-card">
        ${imageMarkup}
        ${heading}
        <p>${escapeHtml(description)}</p>
      </div>`;
};

const renderNearbyCard = (facility: NearbyFacility, project: LocationProject): string => {
  const place = cityState(project);
  const linkLabel = `View ${facility.city} Storage`;
  const imageKey = nearbyLocationClass(facility);
  const imageClass = facility.imageUrl?.trim() ? `location-card__image--${imageKey}` : "";
  const imageAlt = `Self storage units in ${facility.city}, ${facility.state} near ${place}`;

  return `
      <article class="location-card">
        <div class="location-card__image ${imageClass}" role="img" aria-label="${escapeHtml(imageAlt)}"></div>
        <div class="location-card__content">
          <h3>${escapeHtml(facility.city)}, ${escapeHtml(facility.state)}</h3>
          <p>${escapeHtml(
            facility.notes?.trim() ||
              `Convenient self storage in ${facility.city}, ${facility.state}, with flexible month-to-month rentals and easy access for residents and businesses near ${place}.`,
          )}</p>
          <a href="${safeUrl(facility.storagelyUrl)}" class="location-card__link"${externalLinkAttrs(facility.storagelyUrl)}>${escapeHtml(linkLabel)}</a>
        </div>
      </article>`;
};

const renderLocalParagraphs = (project: LocationProject): string => {
  const localDraft = findDraftSection(project, "local");
  const place = cityState(project) || "the local area";
  const { localContext } = project;
  const paragraphs: string[] = [];

  if (localDraft?.body?.trim() && !isEditorInstruction(localDraft.body)) {
    localDraft.body
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((part) => paragraphs.push(`<p>${escapeHtml(part)}</p>`));
  }

  if (paragraphs.length === 0) {
    paragraphs.push(
      `<p>${escapeHtml(
        `${project.locationIdentity.facilityName || "My Garage Self Storage"} is proud to serve the ${place} community. Whether you live nearby or run a local business, our facility offers self storage solutions tailored to the area.`,
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

const renderMapDirections = (project: LocationProject, place: string): string => {
  const mapDraft = findDraftSection(project, "map-cta");
  const fallback = `Located in ${place}, our self storage facility offers convenient access for residents and businesses across the area. Find verified hours, storage types, and facility details for ${place}.`;

  const body = exportDraftBody(mapDraft?.body, fallback);
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("\n        ");
};

const extractMapIframe = (iframeCode: string): string => {
  const trimmed = iframeCode.trim();
  if (!trimmed) {
    return `<p style="padding:2rem;text-align:center;color:#555;">Add a Google Maps embed in Step 7 before exporting.</p>`;
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
  publishAssetBaseUrl: string = DEFAULT_PUBLISH_ASSET_BASE,
): string => {
  const place = cityState(project);
  const { city, state } = project.locationIdentity;
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const featuresDraft = findDraftSection(project, "intro");
  const valueDraft = findDraftSection(project, "value");
  const nearbyDraft = findDraftSection(project, "nearby");
  const faqItems = buildFaqItems(project, images);
  const faqJsonLd = renderFaqJsonLd(project, images);
  const nearby = selectedFacilities(project, facilities);
  const nearbyCss = renderNearbyLocationCss(nearby, publishAssetBaseUrl);
  const storageCards = selectedStorageImages(project, images)
    .map((image) => renderStorageCard(image, project, images, publishAssetBaseUrl))
    .join("\n");
  const nearbyCards = nearby.map((facility) => renderNearbyCard(facility, project)).join("\n");
  const phone = project.existingContent.phone.trim();
  const telHref = formatTelHref(phone);

  const introBody = exportDraftBody(
    featuresDraft?.body,
    `Our ${city || "local"} self storage facility offers everything you need to store with confidence. From practical amenities to flexible access, every feature is designed to make your storage experience secure, convenient, and hassle-free.`,
  );

  const valueBody = exportDraftBody(
    valueDraft?.body,
    `At My Garage Self Storage®, we make it easy to find dependable self storage near ${place}. Our flexible rental options, gated access, and modern storage features help you store your belongings without long-term commitments or unnecessary hassle.`,
  );

  const nearbyIntro = exportDraftBody(
    nearbyDraft?.body,
    `Looking for self storage outside of ${city}? My Garage Self Storage® has multiple convenient locations across the region. Explore our nearby facilities below to find the right fit for your community.`,
  );

  const documentHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(renderPageTitle(project))}</title>

<!-- Performance: preconnect to Google Fonts to speed up font loading. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

<!-- STORIQ FACILITY TEMPLATE — CSS (see public/templates/final-master-template.md) -->
<style>
${nearbyCss}${MASTER_TEMPLATE_CSS}
</style>
</head>
<body>

<!-- STORIQ FACILITY TEMPLATE — HTML (${escapeHtml(city)}, ${escapeHtml(state)}) -->
<main id="facility-template" class="facility-template">

  <!-- SECTION 1: Facility Features & Amenities -->
  <section class="facility-section facility-section--white">
    <h2>Features &amp; Amenities in ${escapeHtml(city)}, ${escapeHtml(state)}</h2>
    <p>${escapeHtml(introBody)}</p>
    <ul class="facility-list">
      ${listMarkup(project.existingContent.features, "Add confirmed Features &amp; Amenities before publishing.")}
    </ul>
  </section>

  <!-- SECTION 2: Value Proposition -->
  <section class="facility-section facility-section--light">
    <h2>Why Choose Our Self Storage Units in ${escapeHtml(city)}, ${escapeHtml(state)}?</h2>
    <p>${escapeHtml(valueBody)}</p>
    <ul class="facility-list facility-list--single facility-features">
      ${renderValueList(project)}
    </ul>
  </section>

  <!-- SECTION 3: Types of Storage -->
  <section class="facility-section facility-section--white">
    <h2>Types of Self Storage Units Available in ${escapeHtml(city)}, ${escapeHtml(state)}</h2>
    <div class="storage-grid">
      ${storageCards || "<p>Select storage type images in Step 3 before exporting.</p>"}
    </div>
  </section>

  <!-- SECTION 4: Local Content -->
  <section class="facility-section facility-section--light">
    <h2>Serving ${escapeHtml(place)} and Surrounding Areas</h2>
    ${renderLocalParagraphs(project)}
  </section>

  <!-- SECTION 5: Nearby Locations -->
  <section class="facility-section facility-section--white">
    <h2>Other Nearby Locations at My Garage</h2>
    <p>${escapeHtml(nearbyIntro)}</p>
    <div class="locations-grid">
      ${nearbyCards || "<p>Select 3–6 nearby facilities in Step 5 before exporting.</p>"}
    </div>
  </section>

  <!-- SECTION 6: FAQs -->
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

  <!-- SECTION 7: Map + Location + CTA -->
  <section class="facility-section facility-section--brand">
    <div class="map-section">
      <div class="map-section__map">
        ${extractMapIframe(project.googleMaps.iframeCode)}
      </div>
      <div class="map-section__info">
        <h2>Convenient Self Storage in ${escapeHtml(city)}, ${escapeHtml(state)}</h2>
        <p><strong>${escapeHtml(facilityName)}®</strong><br>
        ${escapeHtml(project.existingContent.address || "Address required")}</p>
        ${renderMapDirections(project, place)}
        ${project.existingContent.accessHours ? `<p><strong>Access Hours:</strong> ${escapeHtml(project.existingContent.accessHours)}</p>` : ""}
        ${project.existingContent.officeHours ? `<p><strong>Office Hours:</strong> ${escapeHtml(project.existingContent.officeHours)}</p>` : ""}
        ${phone ? `<a href="${escapeHtml(telHref)}" class="cta-button">Call ${escapeHtml(phone)}</a>` : project.locationIdentity.storagelyPageUrl?.trim() ? `<a href="${safeUrl(project.locationIdentity.storagelyPageUrl)}" class="cta-button"${externalLinkAttrs(project.locationIdentity.storagelyPageUrl)}>View Units</a>` : ""}
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
