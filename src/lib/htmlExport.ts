import type { LocationProject } from "../types/storiq";
import { generateDraftMetaDescription } from "./draftGenerator";

/** Full document from renderStoragelyHtml. */
export const extractMainFragment = (html: string): string => {
  const match = html.match(/<main\s+id=["']facility-template["'][\s\S]*?<\/main>/i);
  return match?.[0] ?? html;
};

/** Main + scoped styles for Storagely editors that accept a fragment without full HTML shell. */
export const extractStoragelyPasteBody = (html: string): string => {
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
  const styles = styleMatch?.[1]?.trim() ?? "";
  const main = extractMainFragment(html);
  if (!styles) return main;
  return `<style>\n${styles}\n</style>\n\n${main}`;
};

export const resolveMetaDescription = (project: LocationProject): string => {
  if (project.seo.metaDescription.trim()) {
    return project.seo.metaDescription.trim();
  }
  return generateDraftMetaDescription(project);
};

export const injectMetaDescription = (html: string, description: string): string => {
  if (!description.trim()) return html;
  if (/<meta\s+name=["']description["']/i.test(html)) {
    return html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${description.replace(/"/g, "&quot;")}">`,
    );
  }
  return html.replace(/<meta\s+charset=["'][^"']*["']\s*>/i, (tag) => `${tag}\n<meta name="description" content="${description.replace(/"/g, "&quot;")}">`);
};
