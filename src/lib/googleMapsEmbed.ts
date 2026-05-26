import { parseGoogleMapsIframe } from "./validators";

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

/** Classic Google Maps embed (no API key) — suitable for MVP paste-into-Storagely workflow. */
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
    return applyMapDisplayType(parsed.detectedSrc, mapType);
  }

  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  return query ? buildGoogleMapsEmbedSrc(query, mapType) : undefined;
};

export const buildGoogleMapsFromProject = (project: {
  locationIdentity: { facilityName: string; city: string; state: string; zipCode: string };
  existingContent: { address: string };
  googleMaps?: { mapType?: MapDisplayType };
}): { query: string; iframeCode: string; isValid: boolean; detectedSrc: string } => {
  const mapType = resolveMapDisplayType(project.googleMaps?.mapType);
  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  const iframeCode = query ? buildGoogleMapsIframeMarkup(query, `Map to ${facilityName || "facility"}`, mapType) : "";
  const parsed = parseGoogleMapsIframe(iframeCode);

  return {
    query,
    iframeCode,
    isValid: parsed.isValid,
    detectedSrc: parsed.detectedSrc,
  };
};
