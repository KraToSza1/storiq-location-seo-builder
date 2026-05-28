import { parseGoogleMapsIframe } from "./validators";
import type { LocationProject } from "../types/storiq";

export type MapDisplayType = "roadmap" | "satellite" | "hybrid";

export const DEFAULT_MAP_DISPLAY_TYPE: MapDisplayType = "satellite";

export const resolveMapDisplayType = (mapType?: MapDisplayType): MapDisplayType => mapType ?? DEFAULT_MAP_DISPLAY_TYPE;

const legacyMapTypeParam: Record<MapDisplayType, string> = {
  roadmap: "m",
  satellite: "k",
  hybrid: "h",
};

/** Synthetic / hand-built pb= URLs (invalid place id). */
export const isMalformedSyntheticEmbed = (src: string): boolean =>
  /!1s0x0%3A0x0/i.test(src) || /!1s0x0:0x0/i.test(src);

/** Google Maps Share → Embed URL with a real place reference (pb= is immutable). */
export const isOfficialGoogleMapsEmbedSrc = (src: string): boolean => {
  if (!/google\.com\/maps\/embed\?pb=/i.test(src)) {
    return false;
  }
  if (isMalformedSyntheticEmbed(src)) {
    return false;
  }
  const hasCoords = /!3d-?\d/i.test(src) && /!2d-?\d/i.test(src);
  const hasPlaceRef = /!1s0x[0-9a-f]+%3A0x[0-9a-f]+/i.test(src) || /!2s[^!%]+/i.test(src);
  return hasCoords && hasPlaceRef;
};

/** @deprecated Use isOfficialGoogleMapsEmbedSrc */
export const isExportQualityMapEmbedSrc = (src: string): boolean => isOfficialGoogleMapsEmbedSrc(src);

export const isLegacyMapEmbedSrc = (src: string): boolean => /maps\.google\.com\/maps\?q=/i.test(src);

export const buildMapsQuery = (
  address: string,
  facilityName?: string,
  city?: string,
  state?: string,
  zipCode?: string,
): string => {
  const place = [city?.trim(), state?.trim(), zipCode?.trim()].filter(Boolean).join(", ");
  const addressWithPlace =
    place && address.trim() && !address.toLowerCase().includes(city?.trim().toLowerCase() ?? "")
      ? `${address.trim()}, ${place}`
      : address.trim() || place;
  const parts = [facilityName?.trim(), addressWithPlace].filter(Boolean);
  return parts.join(", ");
};

/** Preview-only fallback — not valid for export. */
export const buildGoogleMapsEmbedSrc = (query: string, mapType: MapDisplayType = DEFAULT_MAP_DISPLAY_TYPE): string => {
  const q = encodeURIComponent(query.trim());
  const t = legacyMapTypeParam[mapType];
  return `https://maps.google.com/maps?q=${q}&t=${t}&z=15&ie=UTF8&iwloc=&output=embed`;
};

/** Apply map style only to legacy maps?q= preview URLs — never modify official pb= embeds. */
export const applyMapDisplayType = (src: string, mapType: MapDisplayType): string => {
  if (!src.trim() || isOfficialGoogleMapsEmbedSrc(src) || isMalformedSyntheticEmbed(src)) {
    return src;
  }

  const normalized = src.startsWith("//") ? `https:${src}` : src;

  if (/maps\.google\.com\/maps\?/i.test(normalized) || /[?&]q=/i.test(normalized)) {
    try {
      const url = new URL(normalized.startsWith("http") ? normalized : `https://${normalized}`);
      url.searchParams.set("t", legacyMapTypeParam[mapType]);
      return url.toString();
    } catch {
      return src;
    }
  }

  return src;
};

/** Update src= inside iframe markup for legacy preview only. */
export const applyMapDisplayTypeToIframeCode = (iframeCode: string, mapType: MapDisplayType): string => {
  const match = iframeCode.match(/\ssrc=(["'])([^"']+)\1/i);
  if (!match) return iframeCode;
  const quote = match[1];
  const newSrc = applyMapDisplayType(match[2], mapType);
  if (newSrc === match[2]) {
    return iframeCode;
  }
  return iframeCode.replace(match[0], ` src=${quote}${newSrc}${quote}`);
};

export const isAllowedGoogleMapsSrc = (src: string): boolean => {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return host === "maps.google.com" || host === "www.google.com" || host === "google.com" || host.endsWith(".google.com");
  } catch {
    return false;
  }
};

/** Live preview: official pasted embed, or legacy q= preview when no official embed exists. */
export const getMapPreviewSrc = (
  project: {
    locationIdentity: { facilityName: string; city: string; state: string; zipCode: string };
    existingContent: { address: string };
    googleMaps?: { mapType?: MapDisplayType };
  },
  iframeCode: string,
): string | undefined => {
  const mapType = resolveMapDisplayType(project.googleMaps?.mapType);
  const parsed = parseGoogleMapsIframe(iframeCode);
  if (parsed.detectedSrc && isAllowedGoogleMapsSrc(parsed.detectedSrc)) {
    if (isOfficialGoogleMapsEmbedSrc(parsed.detectedSrc)) {
      return parsed.detectedSrc;
    }
    if (isLegacyMapEmbedSrc(parsed.detectedSrc)) {
      return applyMapDisplayType(parsed.detectedSrc, mapType);
    }
    return undefined;
  }

  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  return query ? buildGoogleMapsEmbedSrc(query, mapType) : undefined;
};

/** No-op — official embeds must come from Google Maps Share → Embed only. */
export const upgradeLegacyMapEmbedIfPossible = (project: LocationProject): LocationProject => project;

export const buildGoogleMapsFromProject = (
  project: Pick<LocationProject, "locationIdentity" | "existingContent" | "googleMaps">,
): { query: string; iframeCode: string; isValid: boolean; detectedSrc: string } => {
  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  const iframeCode = project.googleMaps?.iframeCode?.trim() ?? "";
  const parsed = parseGoogleMapsIframe(iframeCode);

  return {
    query,
    iframeCode,
    isValid: parsed.isValid && Boolean(parsed.detectedSrc),
    detectedSrc: parsed.detectedSrc,
  };
};
