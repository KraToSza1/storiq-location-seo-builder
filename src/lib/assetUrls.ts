import type { AppSettings } from "../types/storiq";

/** Where StorIQ hosts `public/media-library/` in production (Vercel). */
export const DEFAULT_PUBLISH_ASSET_BASE = "https://storiq-location-seo-builder.vercel.app";

export const resolvePublishAssetBaseUrl = (settings?: Pick<AppSettings, "mediaAssetBaseUrl">): string => {
  const fromSettings = settings?.mediaAssetBaseUrl?.trim();
  if (fromSettings) {
    return fromSettings.replace(/\/$/, "");
  }

  const fromEnv = import.meta.env.VITE_PUBLISH_ASSET_BASE?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin && !/^https?:\/\/localhost(:\d+)?$/i.test(origin)) {
      return origin.replace(/\/$/, "");
    }
  }

  return DEFAULT_PUBLISH_ASSET_BASE;
};

/** Turn `/media-library/...` into a full URL Storagely can load when pasted on mygarageselfstorage.com. */
export const toAbsoluteMediaUrl = (
  url: string | undefined | null,
  baseUrl: string = DEFAULT_PUBLISH_ASSET_BASE,
): string => {
  const trimmed = (url ?? "").trim();
  if (!trimmed) {
    return "";
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = (baseUrl || DEFAULT_PUBLISH_ASSET_BASE).replace(/\/$/, "");
  if (trimmed.startsWith("/")) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
};

/** Rewrite relative media paths in exported HTML for paste into Storagely. */
export const rewriteExportHtml = (html: string, baseUrl?: string): string => {
  const base = (baseUrl || DEFAULT_PUBLISH_ASSET_BASE).replace(/\/$/, "");
  return html
    .replace(/src=(["'])\/media-library\//gi, `src=$1${base}/media-library/`)
    .replace(/url\((["'])\/media-library\//gi, `url($1${base}/media-library/`);
};
