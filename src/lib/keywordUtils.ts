/** Primary SEO keywords are always stored and shown in lowercase. */
export const normalizePrimaryKeyword = (value: string): string => value.trim().toLowerCase();
