import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const masterPath = path.join(root, "public/templates/master_template.md");
const outPath = path.join(root, "src/lib/masterTemplateCss.ts");

const STORIQLY_LINK_DEFENSE = `
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
  }`;

const master = fs.readFileSync(masterPath, "utf8");
const styleMatch = master.match(/<style>([\s\S]*?)<\/style>/i);
if (!styleMatch) {
  throw new Error(`No <style> block found in ${masterPath}`);
}

const css = `${styleMatch[1].trim()}${STORIQLY_LINK_DEFENSE}`;
const ts = `/** Synced from public/templates/master_template.md (system-prompt-v2 / Loop 343 standard). Run: npm run sync:master-css */
export const MASTER_TEMPLATE_CSS = ${JSON.stringify(css)};`;

fs.writeFileSync(outPath, `${ts}\n`);
console.log(`Wrote ${outPath} from ${masterPath}`);
