import { stripPromotionalLanguage } from "./myGarageGenerationSpec";

const phoneRegex = /\+\d[\d\s().-]{6,}\d|(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/;

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
  "Drive-Up Storage",
  "Student Storage",
  "Military Storage",
  "Retail Storage",
  "Indoor Storage",
  "Container Storage",
  "Warehouse Storage",
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

const FACILITY_FEATURES_HEADERS = [
  /^facility\s*features?$/i,
  /^features?\s*(?:&|and)\s*amenities?$/i,
  /^amenities?$/i,
  /^facility\s*amenities?$/i,
];

const UNIT_RENTAL_GRID_HEADERS = [/^unit\s*rental\s*grid$/i, /^unit\s*sizes?$/i, /^rental\s*grid$/i, /^storage\s*units?$/i];

const SECTION_STOP_HEADERS =
  /^(facility\s*features?|features?\s*(?:&|and)\s*amenities?|amenities?|unit\s*rental\s*grid|unit\s*sizes?|rental\s*grid|storage\s*types?|office\s*hours?|access\s*hours?|hours|address|phone|map|faq|nearby|why\s*choose|value\s*proposition|types?\s*of\s*storage|local\s*content|serving)/i;

export interface ExtractedContent {
  phone?: string;
  address?: string;
  accessHours?: string;
  officeHours?: string;
  features: string[];
  storageTypes: string[];
}

export const listFromText = (value: string): string[] =>
  value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);

export const listToText = (items: string[]): string => items.join("\n");

const unique = (items: string[]): string[] => Array.from(new Set(items.filter(Boolean)));

const normalizeLineItem = (line: string): string => line.replace(/^[-*•]\s*|^\d+\.\s*/, "").trim();

const matchesHeader = (line: string, patterns: RegExp[]): boolean => {
  const cleaned = line.replace(/^#+\s*/, "").replace(/:$/, "").trim();
  return patterns.some((pattern) => pattern.test(cleaned));
};

const isSectionStop = (line: string): boolean => {
  const cleaned = line.replace(/^#+\s*/, "").replace(/:$/, "").trim();
  return SECTION_STOP_HEADERS.test(cleaned);
};

const extractSectionItems = (rawContent: string, headerPatterns: RegExp[]): string[] => {
  const lines = rawContent.split(/\r?\n/).map((line) => line.trim());
  const items: string[] = [];
  let capturing = false;

  lines.forEach((line) => {
    if (!line) return;

    if (matchesHeader(line, headerPatterns)) {
      capturing = true;
      return;
    }

    if (capturing && isSectionStop(line) && !matchesHeader(line, headerPatterns)) {
      capturing = false;
      return;
    }

    if (!capturing) return;

    const item = normalizeLineItem(line);
    if (item.length > 1 && item.length < 200) {
      items.push(item);
    }
  });

  return unique(items);
};

/** Pull Features & Amenities from Facility Features and Unit Rental Grid sections in pasted page content. */
export const extractFeaturesAndAmenities = (rawContent: string): string[] => {
  const fromFacilityFeatures = extractSectionItems(rawContent, FACILITY_FEATURES_HEADERS);
  const fromUnitRentalGrid = extractSectionItems(rawContent, UNIT_RENTAL_GRID_HEADERS);
  const fromKeywords = featureKeywords.filter((keyword) => includesLoose(rawContent, keyword));

  return unique([...fromFacilityFeatures, ...fromUnitRentalGrid, ...fromKeywords]);
};

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

const normalizePhone = (raw?: string): string | undefined => {
  if (!raw) return undefined;
  return raw.replace(/\s+/g, " ").trim();
};

const storagelyUrlRegex =
  /https?:\/\/(?:www\.)?mygarageselfstorage\.com\/(?:self-storage|storage-units?)\/[^\s"'<>]+/gi;

export const extractStoragelyUrlsFromContent = (rawContent: string): string[] => {
  const matches = rawContent.match(storagelyUrlRegex) ?? [];
  return Array.from(new Set(matches.map((url) => url.replace(/[),.;]+$/, "").trim())));
};

export interface ExtractedFaq {
  question: string;
  answer: string;
}

/** Pull FAQ pairs from raw page content when a FAQ section is present. */
export const extractFaqsFromRawContent = (rawContent: string): ExtractedFaq[] => {
  const lines = rawContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const faqs: ExtractedFaq[] = [];
  let index = 0;

  while (index < lines.length && faqs.length < 6) {
    const line = lines[index];
    const questionMatch = line.match(/^(?:q|question)\s*[:.]?\s*(.+)$/i);
    const isQuestion = questionMatch || (line.endsWith("?") && line.length < 220);

    if (!isQuestion) {
      index += 1;
      continue;
    }

    const question = (questionMatch?.[1] ?? line).trim();
    const answerParts: string[] = [];
    index += 1;

    while (index < lines.length) {
      const next = lines[index];
      if (next.endsWith("?") && next.length < 220) break;
      if (/^(?:q|question)\s*[:.]/i.test(next)) break;
      if (/^faq\b/i.test(next)) break;

      const answerMatch = next.match(/^(?:a|answer)\s*[:.]?\s*(.+)$/i);
      answerParts.push(answerMatch?.[1] ?? next);
      index += 1;
      if (answerParts.join(" ").length > 40) break;
    }

    const answer = stripPromotionalLanguage(answerParts.join(" ").trim());
    if (question && answer) {
      faqs.push({ question, answer });
    }
  }

  return faqs;
};

export const extractContentClues = (rawContent: string): ExtractedContent => {
  const sanitized = stripPromotionalLanguage(rawContent);
  const lines = sanitized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const phone = normalizePhone(sanitized.match(phoneRegex)?.[0]);
  const address = findAddressLine(lines);
  const accessHours = findHoursLines(lines, "access");
  const officeHours = findHoursLines(lines, "office");
  const storageTypes = storageKeywords.filter((keyword) => includesLoose(sanitized, keyword));
  const features = extractFeaturesAndAmenities(sanitized).map((item) => stripPromotionalLanguage(item)).filter(Boolean);

  return {
    phone,
    address,
    accessHours,
    officeHours,
    features: unique(features),
    storageTypes: unique(storageTypes),
  };
};
