export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const safeUrl = (value: string): string => escapeHtml(value.trim());

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "location";

export const cityState = (project: { locationIdentity: { city: string; state: string } }): string =>
  [project.locationIdentity.city, project.locationIdentity.state].filter(Boolean).join(", ");

export const formatTelHref = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  return digits.startsWith("1") ? `tel:+${digits}` : `tel:+1${digits}`;
};
