/** Turn scraped hours strings into natural FAQ / NAP copy. */

const DAY_HEADER =
  /\b(weekdays?|monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)(?=\s|$)/gi;

const normalizeDayLabel = (token: string): string => {
  const key = token.toLowerCase().replace(/\s+/g, "");
  const map: Record<string, string> = {
    weekday: "Monday–Friday",
    weekdays: "Monday–Friday",
    monday: "Monday",
    mon: "Monday",
    tuesday: "Tuesday",
    tue: "Tuesday",
    wednesday: "Wednesday",
    wed: "Wednesday",
    thursday: "Thursday",
    thu: "Thursday",
    friday: "Friday",
    fri: "Friday",
    saturday: "Saturday",
    sat: "Saturday",
    sunday: "Sunday",
    sun: "Sunday",
  };
  return map[key] ?? token;
};

const normalizeTimeRange = (schedule: string): string => {
  const trimmed = schedule.trim();
  if (/^closed$/i.test(trimmed)) {
    return "closed";
  }
  const range = trimmed.match(
    /^(\d{1,2}:\d{2})\s*(am|pm)\s*[-–]\s*(\d{1,2}:\d{2})\s*(am|pm)$/i,
  );
  if (range) {
    const meridiem = (value: string): string => (value.toLowerCase() === "am" ? "a.m." : "p.m.");
    return `${range[1]} ${meridiem(range[2])}–${range[3]} ${meridiem(range[4])}`;
  }
  return trimmed.replace(/\s+/g, " ").trim();
};

const formatDayList = (days: string[]): string => {
  const unique = [...new Set(days)];
  if (unique.length === 1) {
    return unique[0];
  }
  if (unique.length === 2) {
    return `${unique[0]} and ${unique[1]}`;
  }
  return `${unique.slice(0, -1).join(", ")}, and ${unique.at(-1)}`;
};

interface DaySegment {
  days: string[];
  schedule: string;
}

const parseDaySegments = (text: string): DaySegment[] => {
  const markers: { index: number; length: number; label: string }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(DAY_HEADER.source, "gi");
  while ((match = re.exec(text)) !== null) {
    markers.push({ index: match.index, length: match[0].length, label: normalizeDayLabel(match[0]) });
  }

  if (markers.length === 0) {
    return [{ days: ["Hours"], schedule: text.trim() }];
  }

  return markers.map((marker, index) => {
    const start = marker.index + marker.length;
    const end = index + 1 < markers.length ? markers[index + 1].index : text.length;
    return { days: [marker.label], schedule: text.slice(start, end).trim() };
  });
};

const groupBySchedule = (segments: DaySegment[]): DaySegment[] => {
  const groups: DaySegment[] = [];
  segments.forEach((segment) => {
    const scheduleKey = segment.schedule.toLowerCase().replace(/\s+/g, " ");
    const last = groups[groups.length - 1];
    if (last && last.schedule.toLowerCase().replace(/\s+/g, " ") === scheduleKey) {
      last.days.push(...segment.days);
      return;
    }
    groups.push({ days: [...segment.days], schedule: segment.schedule });
  });
  return groups;
};

const formatScheduleGroup = (group: DaySegment): string => {
  const days = formatDayList(group.days);
  const schedule = normalizeTimeRange(group.schedule);
  if (schedule === "closed") {
    return `${days}: closed`;
  }
  return `${days}, ${schedule}`;
};

/** e.g. "Weekdays 9:00 am - 5:00 pm Saturday Closed Sunday Closed" → readable phrase. */
export const formatHoursForCopy = (raw: string): string => {
  const text = raw.replace(/\|/g, " ").replace(/\s+/g, " ").trim();
  if (!text) {
    return text;
  }
  if (/available by phone|contact us for/i.test(text)) {
    return text;
  }
  if (/[.;]\s+[A-Z]/.test(text) && text.length > 40) {
    return text;
  }

  const grouped = groupBySchedule(parseDaySegments(text));
  if (grouped.length === 1 && grouped[0].schedule !== "closed") {
    return formatScheduleGroup({ days: ["Daily"], schedule: grouped[0].schedule });
  }
  return grouped.map((group) => formatScheduleGroup(group)).join("; ");
};

const stripTrailingPeriod = (value: string): string => value.replace(/\.+$/, "").trim();

export const buildOfficeAndAccessHoursAnswer = (officeHours: string, accessHours: string): string => {
  const office = stripTrailingPeriod(formatHoursForCopy(officeHours));
  const access = stripTrailingPeriod(formatHoursForCopy(accessHours));
  if (!office && !access) {
    return "Contact our team for current office and gate access hours.";
  }
  if (!office) {
    return `Access hours are ${access}.`;
  }
  if (!access) {
    return `Office hours are ${office}.`;
  }
  return `Office hours are ${office}. Access hours are ${access}.`;
};
