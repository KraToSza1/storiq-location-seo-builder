import { parseGoogleMapsIframe } from "./validators";

export const buildMapsQuery = (address: string, facilityName?: string): string => {
  const parts = [facilityName?.trim(), address.trim()].filter(Boolean);
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

export const buildGoogleMapsFromProject = (project: {
  locationIdentity: { facilityName: string; city: string; state: string; zipCode: string };
  existingContent: { address: string };
}): { query: string; iframeCode: string; isValid: boolean; detectedSrc: string } => {
  const address =
    project.existingContent.address.trim() ||
    [project.locationIdentity.city, project.locationIdentity.state, project.locationIdentity.zipCode].filter(Boolean).join(", ");

  const query = buildMapsQuery(address, project.locationIdentity.facilityName);
  const iframeCode = query ? buildGoogleMapsIframeMarkup(query, `Map to ${project.locationIdentity.facilityName || "facility"}`) : "";
  const parsed = parseGoogleMapsIframe(iframeCode);

  return {
    query,
    iframeCode,
    isValid: parsed.isValid,
    detectedSrc: parsed.detectedSrc,
  };
};
