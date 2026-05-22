/** Format city and state for a single "City, State" field. */
export const formatCityState = (city: string, state: string): string => {
  const c = city.trim();
  const s = state.trim();
  if (c && s) return `${c}, ${s}`;
  return c || s;
};

/** Parse "Orange, TX" or "Orange TX" into separate fields. */
export const parseCityState = (value: string): { city: string; state: string } => {
  const trimmed = value.trim();
  if (!trimmed) return { city: "", state: "" };

  const commaIndex = trimmed.indexOf(",");
  if (commaIndex >= 0) {
    return {
      city: trimmed.slice(0, commaIndex).trim(),
      state: trimmed.slice(commaIndex + 1).trim(),
    };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2 && /^[A-Za-z]{2}$/.test(parts[parts.length - 1] ?? "")) {
    return {
      city: parts.slice(0, -1).join(" "),
      state: parts[parts.length - 1] ?? "",
    };
  }

  return { city: trimmed, state: "" };
};
