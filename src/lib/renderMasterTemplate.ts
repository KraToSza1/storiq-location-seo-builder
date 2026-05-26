import { DEFAULT_PUBLISH_ASSET_BASE, toAbsoluteMediaUrl } from "./assetUrls";
import { defaultFacilities } from "./facilityLibrary";
import { defaultImages, getStorageImageById } from "./imageLibrary";
import { buildLocalSectionDraftBody, buildMapSectionDraftBody, generateDraftTitleTag } from "./draftGenerator";
import { resolveCanonicalStoragelyUrl } from "./facilityRegistry";
import { buildFacilityWireframeHeadings, ensureValuePropositionOpening, VALUE_PROPOSITION_OPENING } from "./facilityWireframe";
import {
  amenitiesForSection1,
  buildSection1IntroFallback,
  buildStorageGridStyle,
  formatFacilityNameWithMark,
  formatGenerationBlocked,
  sanitizeGoogleMapsIframe,
  valueBulletsForSection2,
} from "./myGarageGenerationSpec";
import { MASTER_TEMPLATE_CSS } from "./masterTemplateCss";
import { getProjectValidation } from "./validators";
import { exportDraftBody, isEditorInstruction } from "./templateDraftUtils";
import { resolveStorageDestinationUrl } from "./storageDestinationUrls";
import { formatValueBullet } from "./valuePropositionCopy";
import { renderSelfStorageJsonLd } from "./templateJsonLd";
import { buildFaqItems, buildStorageImageAlt, renderFaqJsonLd } from "./templateFaq";
import { nearbyCardDescription, nearbyCardImageAlt, nearbyFacilityHeading } from "./contentQuality";
import { cityState, escapeHtml, externalLinkAttrs, formatPhoneDisplay, formatTelHref, safeUrl } from "./templateUtils";
import type { DraftSection, LocationProject, NearbyFacility, StorageImage } from "../types/storiq";

const publishMediaUrl = (url: string | undefined | null, publishAssetBaseUrl: string): string =>
  toAbsoluteMediaUrl(url, publishAssetBaseUrl);

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
  const sourceBullets = valueDraft?.bullets?.length ? valueDraft.bullets : project.existingContent.features;
  const bullets = valueBulletsForSection2(sourceBullets);

  return bullets
    .map((bullet) => {
      const formatted = formatValueBullet(bullet, project);
      const colonIndex = formatted.indexOf(":");
      if (colonIndex > 0) {
        return `<li><strong>${escapeHtml(formatted.slice(0, colonIndex + 1))}</strong> ${escapeHtml(formatted.slice(colonIndex + 1).trim())}</li>`;
      }
      return `<li>${escapeHtml(formatted)}</li>`;
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
  const destinationUrl = resolveStorageDestinationUrl(image);
  const heading = destinationUrl
    ? `<h3><a href="${safeUrl(destinationUrl)}" class="storage-card__heading-link"${externalLinkAttrs(destinationUrl)}>${escapeHtml(image.category)}</a></h3>`
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

const renderNearbyCard = (
  facility: NearbyFacility,
  project: LocationProject,
  publishAssetBaseUrl: string,
): string => {
  const place = cityState(project);
  const heading = nearbyFacilityHeading(facility, project.locationIdentity.city);
  const linkLabel = heading.includes("—") ? `View ${heading.split("—")[1]?.trim() ?? facility.city} Storage` : `View ${facility.city} Storage`;
  const imageAlt = nearbyCardImageAlt(facility, {
    city: project.locationIdentity.city,
    state: project.locationIdentity.state,
    facilityName: project.locationIdentity.facilityName,
  });
  const storagelyUrl = resolveCanonicalStoragelyUrl(facility);
  const imageSrc = publishMediaUrl(facility.imageUrl, publishAssetBaseUrl);
  const imageMarkup = `<img
        class="location-card__image"
        src="${safeUrl(imageSrc)}"
        alt="${escapeHtml(imageAlt)}"
        width="480"
        height="300"
        loading="lazy"
        decoding="async">`;

  return `
      <article class="location-card">
        ${imageMarkup}
        <div class="location-card__content">
          <h3>${escapeHtml(heading)}</h3>
          <p>${escapeHtml(nearbyCardDescription(facility, place))}</p>
          <a href="${safeUrl(storagelyUrl)}" class="location-card__link"${externalLinkAttrs(storagelyUrl)}>${escapeHtml(linkLabel)}</a>
        </div>
      </article>`;
};

const renderLocalParagraphs = (project: LocationProject): string => {
  const localDraft = findDraftSection(project, "local");
  const localBody = exportDraftBody(localDraft?.body, buildLocalSectionDraftBody(project));

  return localBody
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("\n    ");
};

const renderMapDirections = (project: LocationProject): string => {
  const mapDraft = findDraftSection(project, "map-cta");
  const body = exportDraftBody(mapDraft?.body, buildMapSectionDraftBody(project));
  return body
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<p>${escapeHtml(part)}</p>`)
    .join("\n        ");
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
  const validation = getProjectValidation(project, facilities, images);
  if (validation.hardFails.length > 0) {
    return formatGenerationBlocked(validation.hardFails);
  }

  const place = cityState(project);
  const { city, state } = project.locationIdentity;
  const facilityName = project.locationIdentity.facilityName || "My Garage Self Storage";
  const facilityNameMarked = formatFacilityNameWithMark(facilityName);
  const section1Amenities = amenitiesForSection1(project.existingContent.features);
  const storageCardCount = selectedStorageImages(project, images).length;
  const storageGridStyle = buildStorageGridStyle(storageCardCount);
  const featureSummary =
    section1Amenities.length > 0
      ? section1Amenities.slice(0, 4).join(", ").toLowerCase()
      : "practical amenities and flexible access";
  const featuresDraft = findDraftSection(project, "intro");
  const valueDraft = findDraftSection(project, "value");
  const nearbyDraft = findDraftSection(project, "nearby");
  const faqItems = buildFaqItems(project, images);
  const faqJsonLd = renderFaqJsonLd(project, images);
  const selfStorageJsonLd = renderSelfStorageJsonLd(project, facilities, images, publishAssetBaseUrl);
  const nearby = selectedFacilities(project, facilities);
  const storageCards = selectedStorageImages(project, images)
    .map((image) => renderStorageCard(image, project, images, publishAssetBaseUrl))
    .join("\n");
  if (storageCardCount === 1) {
    return formatGenerationBlocked([
      {
        id: "storage-cards",
        label: "Section 3 storage cards",
        message: "Only one storage type card resolved — Section 3 must not ship as a single card. Add library images for all offered types.",
        severity: "required",
      },
    ]);
  }

  const nearbyMissingImages = nearby.filter((facility) => !facility.imageUrl?.trim());
  if (nearbyMissingImages.length > 0) {
    return formatGenerationBlocked([
      {
        id: "nearby-images",
        label: "Section 5 nearby images",
        message: `Missing Image Library URL for: ${nearbyMissingImages.map((f) => f.facilityName).join(", ")}. Section 5 requires semantic <img> tags per master_template.md.`,
        severity: "required",
      },
    ]);
  }

  const nearbyCards = nearby.map((facility) => renderNearbyCard(facility, project, publishAssetBaseUrl)).join("\n");
  const phone = formatPhoneDisplay(project.existingContent.phone.trim());
  const telHref = formatTelHref(project.existingContent.phone.trim());

  const headings = buildFacilityWireframeHeadings(city, state, place);

  const introBody = exportDraftBody(
    featuresDraft?.body,
    buildSection1IntroFallback(facilityName, place, project.existingContent.address, featureSummary),
  );

  const valueBody = ensureValuePropositionOpening(
    exportDraftBody(
      valueDraft?.body,
      `${VALUE_PROPOSITION_OPENING} we make it easy to find dependable self storage near ${place}. Our flexible rental options, gated access, and modern storage features help you store your belongings without long-term commitments or unnecessary hassle.`,
    ),
    `${VALUE_PROPOSITION_OPENING} we make it easy to find dependable self storage near ${place}. Our flexible rental options, gated access, and modern storage features help you store your belongings without long-term commitments or unnecessary hassle.`,
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

<!-- STORIQ FACILITY TEMPLATE — CSS (see public/templates/master_template.md) -->
<style>
${MASTER_TEMPLATE_CSS}
</style>
</head>
<body>

<!-- STORIQ FACILITY TEMPLATE — HTML (${escapeHtml(city)}, ${escapeHtml(state)}) -->
<main id="facility-template" class="facility-template">

  <!-- SECTION 1: Facility Features & Amenities -->
  <section class="facility-section facility-section--white">
    <h2>${escapeHtml(headings.features)}</h2>
    <p>${escapeHtml(introBody)}</p>
    <ul class="facility-list">
      ${listMarkup(section1Amenities, "Add confirmed Features &amp; Amenities before publishing.")}
    </ul>
  </section>

  <!-- SECTION 2: Value Proposition -->
  <section class="facility-section facility-section--light">
    <h2>${escapeHtml(headings.value)}</h2>
    <p>${escapeHtml(valueBody)}</p>
    <ul class="facility-list facility-list--single facility-features">
      ${renderValueList(project)}
    </ul>
  </section>

  <!-- SECTION 3: Types of Storage -->
  <section class="facility-section facility-section--white">
    <h2>${escapeHtml(headings.storage)}</h2>
    <div class="storage-grid"${storageGridStyle}>
      ${storageCards || "<p>Select storage type images in Step 3 before exporting.</p>"}
    </div>
  </section>

  <!-- SECTION 4: Local Content -->
  <section class="facility-section facility-section--light">
    <h2>${escapeHtml(headings.local)}</h2>
    ${renderLocalParagraphs(project)}
  </section>

  <!-- SECTION 5: Nearby Locations -->
  <section class="facility-section facility-section--white">
    <h2>${escapeHtml(headings.nearby)}</h2>
    <p>${escapeHtml(nearbyIntro)}</p>
    <div class="locations-grid">
      ${nearbyCards || "<p>Select 1–3 nearby facilities in Step 5 before exporting.</p>"}
    </div>
  </section>

  <!-- SECTION 6: FAQs -->
  <section class="facility-section facility-section--light">
    <h2>${escapeHtml(headings.faq)}</h2>
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
        ${sanitizeGoogleMapsIframe(project.googleMaps.iframeCode, city, state)}
      </div>
      <div class="map-section__info">
        <h2>${escapeHtml(headings.map)}</h2>
        <p><strong>${escapeHtml(facilityNameMarked)}</strong><br>
        ${escapeHtml(project.existingContent.address || "Address required")}</p>
        ${renderMapDirections(project)}
        ${project.existingContent.accessHours ? `<p><strong>Access Hours:</strong> ${escapeHtml(project.existingContent.accessHours)}</p>` : ""}
        ${project.existingContent.officeHours ? `<p><strong>Office Hours:</strong> ${escapeHtml(project.existingContent.officeHours)}</p>` : ""}
        ${phone ? `<a href="${escapeHtml(telHref)}" class="cta-button">Call ${escapeHtml(phone)}</a>` : project.locationIdentity.storagelyPageUrl?.trim() ? `<a href="${safeUrl(project.locationIdentity.storagelyPageUrl)}" class="cta-button"${externalLinkAttrs(project.locationIdentity.storagelyPageUrl)}>View Units</a>` : ""}
      </div>
    </div>
  </section>

  <script type="application/ld+json">
  ${faqJsonLd}
  </script>

  <script type="application/ld+json">
  ${selfStorageJsonLd}
  </script>

</main>

</body>
</html>`;

  return documentHtml;
};
