const phoneRegex = /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;

const addressWords = [
  "street",
  "st",
  "road",
  "rd",
  "avenue",
  "ave",
  "boulevard",
  "blvd",
  "drive",
  "dr",
  "lane",
  "ln",
  "highway",
  "hwy",
  "loop",
  "frontage",
  "parkway",
  "pkwy",
];

const storageKeywords = [
  "Vehicle Storage",
  "Boat Storage",
  "RV Storage",
  "Truck Storage",
  "Business Storage",
  "Climate-Controlled Storage",
  "Non Climate-Controlled Storage",
  "Student Storage",
  "Military Storage",
  "Retail Storage",
  "Indoor Storage",
];

const featureKeywords = [
  "Drive-Up Access",
  "Gated Access",
  "Security Cameras",
  "Online Rentals",
  "Month-to-Month Rentals",
  "Wide Drive Aisles",
  "Indoor Units",
  "Vehicle Parking",
  "Moving Supplies",
  "Autopay",
  "Fenced Property",
  "Keypad Entry",
  "Well-Lit Facility",
];

export interface ExtractedContent {
  phone?: string;
  address?: string;
  accessHours?: string;
  officeHours?: string;
  features: string[];
  storageTypes: string[];
  uniqueSellingPoints: string[];
}

export const listFromText = (value: string): string[] =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

export const listToText = (items: string[]): string => items.join("\n");

const unique = (items: string[]): string[] => Array.from(new Set(items.filter(Boolean)));

const includesLoose = (text: string, phrase: string): boolean => {
  const normalizedText = text.toLowerCase().replace(/[-\s]+/g, " ");
  const normalizedPhrase = phrase.toLowerCase().replace(/[-\s]+/g, " ");
  return normalizedText.includes(normalizedPhrase.replace(" storage", "")) || normalizedText.includes(normalizedPhrase);
};

const findAddressLine = (lines: string[]): string | undefined =>
  lines.find((line) => {
    const lower = line.toLowerCase();
    return /^\d{2,}/.test(line.trim()) && addressWords.some((word) => lower.includes(` ${word}`) || lower.endsWith(word));
  });

const findHoursLines = (lines: string[], type: "access" | "office"): string | undefined => {
  const keyword = type === "access" ? /access|gate/i : /office|manager|leasing/i;
  const timeLike = /\d{1,2}\s*:?\d{0,2}\s*(am|pm)|24\s*hours|mon|tue|wed|thu|fri|sat|sun/i;
  const matched = lines.filter((line) => keyword.test(line) && timeLike.test(line));

  if (matched.length > 0) {
    return matched.slice(0, 3).join(" | ");
  }

  return lines.find((line) => /hours/i.test(line) && timeLike.test(line));
};

export const extractContentClues = (rawContent: string): ExtractedContent => {
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const phone = rawContent.match(phoneRegex)?.[0];
  const address = findAddressLine(lines);
  const accessHours = findHoursLines(lines, "access");
  const officeHours = findHoursLines(lines, "office");
  const storageTypes = storageKeywords.filter((keyword) => includesLoose(rawContent, keyword));
  const features = featureKeywords.filter((keyword) => includesLoose(rawContent, keyword));
  const uniqueSellingPoints = lines
    .filter((line) => /convenient|secure|easy|near|locat|affordable|clean|friendly|online/i.test(line))
    .slice(0, 5);

  return {
    phone,
    address,
    accessHours,
    officeHours,
    features: unique(features),
    storageTypes: unique(storageTypes),
    uniqueSellingPoints: unique(uniqueSellingPoints),
  };
};
