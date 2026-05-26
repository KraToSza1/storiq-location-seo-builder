/** Editable allow-list — area codes valid per US state (validation gate S1). */
export const AREA_CODES_BY_STATE: Record<string, string[]> = {
  TX: [
    "210", "214", "254", "281", "325", "346", "361", "409", "430", "432", "469", "512", "682", "713", "737", "806",
    "817", "830", "832", "903", "915", "936", "940", "956", "979",
  ],
};

export const areaCodesForState = (state: string): string[] => AREA_CODES_BY_STATE[state.trim().toUpperCase()] ?? [];
