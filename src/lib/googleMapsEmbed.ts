import { resolveProjectCoordinates } from "./facilityProximity";
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

/** Apply roadmap / satellite / hybrid to a Google Maps iframe src URL. */
export const applyMapDisplayType = (src: string, mapType: MapDisplayType): string => {
  if (!src.trim()) return src;

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

  if (!/google\.com\/maps\/embed/i.test(normalized)) {
    return src;
  }

  let out = normalized;
  if (mapType === "satellite" || mapType === "hybrid") {
    out = out.replace(/!5e0\b/g, "!5e1");
    if (!/!5e1\b/.test(out)) {
      out = out.replace(/(!3m2!1sen!2s)/i, "!5e1$1");
    }
    if (mapType === "satellite") {
      out = out.replace(/!2m3!1f0!2f0!3f0/g, "!2m3!1f1!2f2!3f1");
    } else {
      out = out.replace(/!2m3!1f0!2f0!3f0/g, "!2m3!1f1!2f1!3f1");
    }
  } else {
    out = out.replace(/!5e1\b/g, "!5e0");
    out = out.replace(/!2m3!1f1!2f[12]!3f1/g, "!2m3!1f0!2f0!3f0");
  }

  return out;
};

/** Update the src= inside stored iframe markup when map type changes. */
export const applyMapDisplayTypeToIframeCode = (iframeCode: string, mapType: MapDisplayType): string => {
  const match = iframeCode.match(/\ssrc=(["'])([^"']+)\1/i);
  if (!match) return iframeCode;
  const quote = match[1];
  const newSrc = applyMapDisplayType(match[2], mapType);
  return iframeCode.replace(match[0], ` src=${quote}${newSrc}${quote}`);
};

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

export const isLegacyMapEmbedSrc = (src: string): boolean => /maps\.google\.com\/maps\?q=/i.test(src);

export const isExportQualityMapEmbedSrc = (src: string): boolean =>
  /google\.com\/maps\/embed/i.test(src) && /!3d/i.test(src) && /!2d/i.test(src);

/** maps/embed with !2d/!3d from known facility coordinates (passes export gate; prefer official Share → Embed when possible). */
export const buildCoordinateMapEmbedSrc = (
  latitude: number,
  longitude: number,
  mapType: MapDisplayType = DEFAULT_MAP_DISPLAY_TYPE,
): string => {
  const zoomScale = 4500;
  const fiveE = mapType === "roadmap" ? "!5e0" : "!5e1";
  const fParams =
    mapType === "satellite" ? "!2m3!1f1!2f2!3f1" : mapType === "hybrid" ? "!2m3!1f1!2f1!3f1" : "!2m3!1f0!2f0!3f0";
  const ts = Date.now();
  return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d${zoomScale}!2d${longitude}!3d${latitude}${fParams}!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z${encodeURIComponent(`${latitude},${longitude}`)}${fiveE}!3m2!1sen!2sus!4v${ts}!5m2!1sen!2sus`;
};

export const buildCoordinateMapIframeMarkup = (
  latitude: number,
  longitude: number,
  title?: string,
  mapType: MapDisplayType = DEFAULT_MAP_DISPLAY_TYPE,
): string => {
  const src = buildCoordinateMapEmbedSrc(latitude, longitude, mapType);
  const safeTitle = (title || "Map to facility").replace(/"/g, "&quot;");
  return `<iframe src="${src}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${safeTitle}"></iframe>`;
};

/** Classic Google Maps embed (no API key) — preview only; fails export gate (no !3d/!2d). */
export const buildGoogleMapsEmbedSrc = (query: string, mapType: MapDisplayType = DEFAULT_MAP_DISPLAY_TYPE): string => {
  const q = encodeURIComponent(query.trim());
  const t = legacyMapTypeParam[mapType];
  return `https://maps.google.com/maps?q=${q}&t=${t}&z=15&ie=UTF8&iwloc=&output=embed`;
};

export const buildGoogleMapsIframeMarkup = (
  query: string,
  title?: string,
  mapType: MapDisplayType = DEFAULT_MAP_DISPLAY_TYPE,
): string => {
  const src = buildGoogleMapsEmbedSrc(query, mapType);
  const safeTitle = (title || "Map to facility").replace(/"/g, "&quot;");
  return `<iframe src="${src}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="${safeTitle}"></iframe>`;
};

export const isAllowedGoogleMapsSrc = (src: string): boolean => {
  try {
    const host = new URL(src).hostname.toLowerCase();
    return host === "maps.google.com" || host === "www.google.com" || host === "google.com" || host.endsWith(".google.com");
  } catch {
    return false;
  }
};

/** Src URL for live preview: saved iframe first, otherwise address-based embed. */
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
    if (isLegacyMapEmbedSrc(parsed.detectedSrc)) {
      const coords = resolveProjectCoordinates(project as LocationProject);
      if (coords) {
        return applyMapDisplayType(buildCoordinateMapEmbedSrc(coords.lat, coords.lng, mapType), mapType);
      }
    }
    return applyMapDisplayType(parsed.detectedSrc, mapType);
  }

  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  return query ? buildGoogleMapsEmbedSrc(query, mapType) : undefined;
};

export const buildGoogleMapsIframeForProject = (
  project: Pick<LocationProject, "locationIdentity" | "existingContent" | "googleMaps">,
  title?: string,
): string => {
  const mapType = resolveMapDisplayType(project.googleMaps?.mapType);
  const mapTitle = title ?? `Map to ${project.locationIdentity.facilityName || "facility"}`;
  const coords = resolveProjectCoordinates(project as LocationProject);
  if (coords) {
    return buildCoordinateMapIframeMarkup(coords.lat, coords.lng, mapTitle, mapType);
  }

  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");
  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  return query ? buildGoogleMapsIframeMarkup(query, mapTitle, mapType) : "";
};

/** Replace auto-generated maps?q= embeds with coordinate pb= embed when we know the facility location. */
export const upgradeLegacyMapEmbedIfPossible = (project: LocationProject): LocationProject => {
  const parsed = parseGoogleMapsIframe(project.googleMaps.iframeCode);
  if (!parsed.detectedSrc || !isLegacyMapEmbedSrc(parsed.detectedSrc)) {
    return project;
  }
  const coords = resolveProjectCoordinates(project);
  if (!coords) {
    return project;
  }

  const mapType = resolveMapDisplayType(project.googleMaps.mapType);
  const iframeCode = buildCoordinateMapIframeMarkup(
    coords.lat,
    coords.lng,
    `Map to ${project.locationIdentity.facilityName || "facility"}`,
    mapType,
  );
  const next = parseGoogleMapsIframe(iframeCode);
  return {
    ...project,
    googleMaps: {
      iframeCode,
      detectedSrc: next.detectedSrc,
      isValid: next.isValid,
      mapType,
    },
  };
};

export const buildGoogleMapsFromProject = (
  project: Pick<LocationProject, "locationIdentity" | "existingContent" | "googleMaps">,
): { query: string; iframeCode: string; isValid: boolean; detectedSrc: string } => {
  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  const iframeCode = buildGoogleMapsIframeForProject(project, `Map to ${facilityName || "facility"}`);
  const parsed = parseGoogleMapsIframe(iframeCode);

  return {
    query,
    iframeCode,
    isValid: parsed.isValid,
    detectedSrc: parsed.detectedSrc,
  };
};
