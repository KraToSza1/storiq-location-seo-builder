/** Static CSS from client master `public/templates/final-master-template.md` (Copperas Cove). Nearby image vars/classes are injected at export time. */
export const MASTER_TEMPLATE_CSS = `  /* Load Montserrat via @import so it works even if Storagely strips <link> tags from <head> */
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

  :root {
    /* ---- Brand tokens ---- */
    --primary-color: #0F2165;
    --primary-color-dark: #0a1647;
    --text-color: #2a2a2a;
    --text-muted: #555;
    --bg-light: #f7f7f7;
    --bg-white: #ffffff;
    --border-color: #e2e2e2;
    --font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-heading: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --border-radius: 12px;
    --shadow-card: 0 2px 12px rgba(0, 0, 0, 0.06);
    --transition: 0.25s ease;
  }

  /* ---- Base ---- */
  .facility-template {
    color: var(--text-color);
    line-height: 1.6;
    max-width: 1200px;
    margin: 0 auto;
  }

  .facility-template * {
    box-sizing: border-box;
  }

  /* High-specificity font-family override (Storagely defense) */
  .facility-template,
  .facility-template p,
  .facility-template li,
  .facility-template a,
  .facility-template strong,
  .facility-template span,
  .facility-template summary,
  .facility-template h2,
  .facility-template h3,
  .facility-template h4 {
    font-family: var(--font-family);
  }

  .facility-template p {
    color: var(--text-muted);
    margin: 0 0 16px;
  }

  .facility-template p:last-child {
    margin-bottom: 0;
  }

  /* ---- Section wrappers ---- */
  .facility-section {
    padding: 32px;
    margin-bottom: 24px;
    border-radius: var(--border-radius);
  }

  .facility-section--white { background: var(--bg-white); }
  .facility-section--light { background: var(--bg-light); }
  .facility-section--brand {
    background: var(--primary-color);
    color: #fff;
    text-align: center;
  }

  /* High-specificity color override for brand section (Storagely defense) */
  #facility-template .facility-section.facility-section--brand,
  #facility-template .facility-section.facility-section--brand h2,
  #facility-template .facility-section.facility-section--brand h3,
  #facility-template .facility-section.facility-section--brand h4,
  #facility-template .facility-section.facility-section--brand p,
  #facility-template .facility-section.facility-section--brand li,
  #facility-template .facility-section.facility-section--brand strong,
  #facility-template .facility-section.facility-section--brand span {
    color: #fff !important;
  }

  /* ---- Headings ---- */
  .facility-template h2,
  .facility-template h3,
  .facility-template h4 {
    color: var(--text-color);
    margin: 0 0 16px;
    line-height: 1.3;
  }

  .facility-template h2 { font-size: clamp(1.6rem, 3vw, 2.1rem); }
  .facility-template h3 { font-size: clamp(1.3rem, 2.5vw, 1.6rem); }
  .facility-template h4 { font-size: 1.1rem; }

  /* ---- Lists ---- */
  .facility-list {
    columns: 2;
    column-gap: 32px;
    padding-left: 20px;
    margin: 0;
  }

  .facility-list li {
    margin-bottom: 10px;
    color: var(--text-muted);
    break-inside: avoid;
  }

  .facility-list--single {
    columns: 1;
  }

  .facility-features li strong {
    color: var(--text-color);
  }

  /* ---- Storage type grid ---- */
  /* 6 cards: 3 columns desktop, 2 columns tablet, 1 column mobile */
  .storage-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    margin-top: 24px;
  }

  .storage-card {
    background: var(--bg-white);
    padding: 20px;
    border-radius: var(--border-radius);
    text-align: center;
    box-shadow: var(--shadow-card);
    transition: transform var(--transition), box-shadow var(--transition);
  }

  .storage-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  }

  /* Linked storage card heading */
  #facility-template .storage-card__heading-link,
  #facility-template .storage-card__heading-link:visited {
    color: inherit !important;
    text-decoration: none !important;
    transition: color var(--transition);
  }

  #facility-template .storage-card__heading-link:hover,
  #facility-template .storage-card__heading-link:focus {
    color: var(--primary-color) !important;
    text-decoration: none !important;
  }

  #facility-template .storage-card__image {
    width: 100% !important;
    aspect-ratio: 5 / 4 !important;
    height: auto !important;
    max-height: none !important;
    margin-bottom: 16px;
    border-radius: calc(var(--border-radius) - 4px);
    object-fit: cover !important;
    object-position: center;
    display: block;
    background-color: #e8e8e8;
  }

  #facility-template .storage-card__image--empty {
    min-height: 200px;
  }

  #facility-template .facility-section .storage-card h3 {
    margin-bottom: 10px;
    font-size: 24px !important;
  }

  #facility-template .facility-section .storage-card p {
    font-size: 16px !important;
  }

  /* ---- Nearby Locations cards ---- */
  .locations-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin-top: 24px;
  }

  .location-card {
    background: var(--bg-white);
    padding: 16px;
    border-radius: var(--border-radius);
    box-shadow: var(--shadow-card);
    transition: transform var(--transition), box-shadow var(--transition);
    display: flex;
    flex-direction: column;
  }

  .location-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  }

  .location-card__image {
    width: 100%;
    aspect-ratio: 16 / 10;
    margin-bottom: 14px;
    border-radius: calc(var(--border-radius) - 4px);
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    background-color: #e8e8e8;
  }

  .location-card__content {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  #facility-template .facility-section .location-card__content h3 {
    margin: 0 0 8px;
    font-size: 24px !important;
  }

  #facility-template .facility-section .location-card__content p {
    font-size: 16px !important;
    margin-bottom: 14px;
    flex-grow: 1;
  }

  /* Smaller variant of the CTA button for location cards */
  #facility-template .location-card__link {
    display: inline-block;
    align-self: flex-start;
    padding: 8px 16px;
    background: var(--primary-color);
    color: #fff !important;
    font-weight: 600;
    font-size: 0.88rem;
    border-radius: 6px;
    text-decoration: none;
    transition: background var(--transition), transform var(--transition);
  }

  #facility-template .location-card__link:hover,
  #facility-template .location-card__link:focus,
  #facility-template .location-card__link:visited {
    background: var(--primary-color-dark);
    color: #fff !important;
    transform: translateY(-1px);
    text-decoration: none;
  }

  /* ---- FAQ ---- */
  .faq-item {
    background: var(--bg-white);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 18px 22px;
    margin-bottom: 12px;
    transition: border-color var(--transition);
  }

  .faq-item[open] {
    border-color: var(--primary-color);
  }

  .faq-item summary {
    font-weight: 600;
    color: var(--text-color);
    cursor: pointer;
    list-style: none;
    position: relative;
    padding-right: 32px;
    transition: color var(--transition);
  }

  /* Reset h3 styling inside summary so FAQ layout stays clean */
  #facility-template .facility-section .faq-item summary h3 {
    display: inline !important;
    margin: 0 !important;
    padding: 0 !important;
    font-size: inherit !important;
    font-weight: inherit !important;
    color: inherit !important;
    line-height: inherit !important;
  }

  /* Hide default markers (Safari + others) */
  .faq-item summary::-webkit-details-marker { display: none; }
  .faq-item summary::marker { content: ''; }

  /* Custom plus/minus icon */
  .faq-item summary::after {
    content: '+';
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1.5rem;
    font-weight: 300;
    color: var(--primary-color);
    transition: transform var(--transition);
    line-height: 1;
  }

  .faq-item[open] summary::after {
    content: '−';
  }

  .faq-item summary:hover {
    color: var(--primary-color);
  }

  .faq-item p {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border-color);
  }

  /* ---- Map + Location Section (2-column) ---- */
  .map-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    align-items: stretch;
    text-align: left;
  }

  .facility-section--brand .map-section {
    text-align: left;
  }

  .map-section__map {
    width: 100%;
    min-height: 400px;
    border-radius: var(--border-radius);
    overflow: hidden;
    background-color: #e8e8e8;
  }

  .map-section__map iframe {
    width: 100%;
    height: 100%;
    min-height: 400px;
    border: 0;
    display: block;
  }

  .map-section__info {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  #facility-template .map-section__info h2 {
    margin-top: 0;
    margin-bottom: 16px;
  }

  #facility-template .map-section__info p {
    font-size: 16px;
    margin-bottom: 14px;
  }

  .map-section__info strong {
    color: var(--text-color);
  }

  #facility-template .map-section__info .cta-button {
    align-self: flex-start;
    width: auto;
  }

  /* ---- CTA ---- */
  .facility-template .cta-button {
    display: inline-block;
    margin-top: 16px;
    padding: 14px 32px;
    background: var(--bg-white);
    color: var(--primary-color);
    font-weight: 600;
    border-radius: 8px;
    text-decoration: none;
    font-size: 1rem;
    transition: background var(--transition), transform var(--transition);
  }

  .facility-template .cta-button:hover,
  .facility-template .cta-button:focus,
  .facility-template .cta-button:visited {
    background: #f2f2f2;
    color: var(--primary-color);
    transform: translateY(-2px);
    text-decoration: none;
  }

  /* Storagely defense: keep exported CTAs and card links clickable above CMS overlays */
  #facility-template a.cta-button,
  #facility-template a.location-card__link,
  #facility-template a.storage-card__heading-link {
    pointer-events: auto !important;
    cursor: pointer !important;
    position: relative;
    z-index: 2;
    text-decoration: none !important;
  }

  #facility-template .facility-section.facility-section--brand a.cta-button,
  #facility-template .facility-section.facility-section--brand a.cta-button:visited {
    color: var(--primary-color) !important;
    background: var(--bg-white) !important;
  }

  #facility-template .facility-section.facility-section--brand a.cta-button:hover,
  #facility-template .facility-section.facility-section--brand a.cta-button:focus {
    color: var(--primary-color) !important;
    background: #f2f2f2 !important;
  }

  #facility-template .map-section__info {
    position: relative;
    z-index: 1;
  }

  /* ---- Responsive ---- */
  @media (max-width: 1024px) {
    .storage-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 768px) {
    .facility-section { padding: 22px; }
    .facility-list { columns: 1; }

    .locations-grid { grid-template-columns: repeat(2, 1fr); }

    .map-section { grid-template-columns: 1fr; gap: 24px; }
    .map-section__map { min-height: 300px; }
    .map-section__map iframe { min-height: 300px; }
  }

  @media (max-width: 560px) {
    .storage-grid { grid-template-columns: 1fr; }
    .facility-section { padding: 18px; }
    .locations-grid { grid-template-columns: 1fr; }
  }`;
