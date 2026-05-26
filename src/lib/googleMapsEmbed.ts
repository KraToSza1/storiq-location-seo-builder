import { parseGoogleMapsIframe } from "./validators";

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
export const buildGoogleMapsEmbedSrc = (query: string): string => {
  const q = encodeURIComponent(query.trim());
  return `https://maps.google.com/maps?q=${q}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
};

export const buildGoogleMapsIframeMarkup = (query: string, title?: string): string => {
  const src = buildGoogleMapsEmbedSrc(query);
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
  },
  iframeCode: string,
): string | undefined => {
  const parsed = parseGoogleMapsIframe(iframeCode);
  if (parsed.detectedSrc && isAllowedGoogleMapsSrc(parsed.detectedSrc)) {
    return parsed.detectedSrc;
  }

  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  return query ? buildGoogleMapsEmbedSrc(query) : undefined;
};

export const buildGoogleMapsFromProject = (project: {
  locationIdentity: { facilityName: string; city: string; state: string; zipCode: string };
  existingContent: { address: string };
}): { query: string; iframeCode: string; isValid: boolean; detectedSrc: string } => {
  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const { city, state, zipCode, facilityName } = project.locationIdentity;
  const query = buildMapsQuery(address, facilityName, city, state, zipCode);
  const iframeCode = query ? buildGoogleMapsIframeMarkup(query, `Map to ${facilityName || "facility"}`) : "";
  const parsed = parseGoogleMapsIframe(iframeCode);

  return {
    query,
    iframeCode,
    isValid: parsed.isValid,
    detectedSrc: parsed.detectedSrc,
  };
};
