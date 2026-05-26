/** S2 — pricing / promotional language patterns (case-insensitive). */
export const PROMO_PHRASES = [
  "web rate",
  "standard rate",
  "during promo",
  "promo period",
  "% off",
  "percent off",
  "first month free",
  "second month free",
  "1st month",
  "move-in special",
  "specials",
] as const;

export const PROMO_REGEXES = [
  /\$\s*\d+/i,
  /\d+\s*\/\s*month/i,
  /\d+\s+per\s+month/i,
  /(?:^|[^\w])discount(?!\s+available)/i,
] as const;

/** Allowed standalone amenity label (S2 note). */
export const MILITARY_DISCOUNT_LABEL = /^military\s+discount$/i;
