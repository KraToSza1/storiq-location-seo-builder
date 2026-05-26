export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const safeUrl = (value: string): string => escapeHtml(value.trim());

const MY_GARAGE_HOST = /^(?:www\.)?mygarageselfstorage\.com$/i;

/** Internal My Garage links stay in the same tab; external links are unchanged (no forced new tab). */
export const externalLinkAttrs = (url: string): string => {
  try {
    const host = new URL(url.trim()).hostname;
    if (MY_GARAGE_HOST.test(host)) {
      return "";
    }
  } catch {
    /* relative or invalid — no target */
  }
  return "";
};

export const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "location";

export const cityState = (project: { locationIdentity: { city: string; state: string } }): string =>
  [project.locationIdentity.city, project.locationIdentity.state].filter(Boolean).join(", ");

export const parsePhoneDigits = (phone: string): string => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
};

export const formatPhoneDisplay = (phone: string): string => {
  const digits = parsePhoneDigits(phone);
  if (digits.length !== 10) {
    return phone.trim();
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
};

export const formatTelHref = (phone: string): string => {
  const digits = parsePhoneDigits(phone);
  if (digits.length !== 10) {
    return "#";
  }
  return `tel:+1${digits}`;
};
