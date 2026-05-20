/**
 * Import CSV published from Google Sheets (no API key).
 * Sheet must be shared: "Anyone with the link" can view, or published to web.
 */

export type GoogleSheetsParseResult =
  | { kind: "standard"; spreadsheetId: string; gid: string }
  | { kind: "published"; publishId: string };

const trim = (value: string): string => value.trim();

export const parseGoogleSheetsUrl = (input: string): GoogleSheetsParseResult | null => {
  const value = trim(input);
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!url.hostname.includes("docs.google.com")) return null;

    const published = url.pathname.match(/\/spreadsheets\/d\/e\/([^/]+)/);
    if (published?.[1]) {
      return { kind: "published", publishId: published[1] };
    }

    const standard = url.pathname.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!standard?.[1] || standard[1] === "e") return null;

    const gid = url.hash.match(/gid=(\d+)/)?.[1] || url.searchParams.get("gid") || "0";

    return { kind: "standard", spreadsheetId: standard[1], gid };
  } catch {
    return null;
  }
};

export const buildGoogleSheetsCsvExportUrl = (input: string): string | null => {
  const parsed = parseGoogleSheetsUrl(input);
  if (!parsed) return null;

  if (parsed.kind === "published") {
    return `https://docs.google.com/spreadsheets/d/e/${parsed.publishId}/pub?output=csv`;
  }

  return `https://docs.google.com/spreadsheets/d/${parsed.spreadsheetId}/export?format=csv&gid=${parsed.gid}`;
};

export const fetchGoogleSheetsCsv = async (input: string): Promise<{ csv: string } | { error: string }> => {
  const exportUrl = buildGoogleSheetsCsvExportUrl(input);
  if (!exportUrl) {
    return {
      error: "Paste a valid Google Sheets link (Share link or File → Share → Publish to web).",
    };
  }

  try {
    const response = await fetch(exportUrl, { credentials: "omit", mode: "cors" });
    if (!response.ok) {
      return {
        error: `Google Sheets returned ${response.status}. Ensure the sheet is shared (Anyone with the link can view) or published to web.`,
      };
    }

    const csv = await response.text();
    if (!csv.trim()) {
      return { error: "The sheet export was empty. Check the tab (gid) and that the sheet has data." };
    }

    if (csv.trimStart().startsWith("<!DOCTYPE") || csv.includes("<html")) {
      return {
        error:
          "Could not read CSV (got a sign-in page). Share the sheet as Anyone with the link can view, or use File → Download → CSV.",
      };
    }

    return { csv };
  } catch {
    return {
      error:
        "Browser could not fetch the sheet (network or CORS). Download CSV from Google Sheets (File → Download) and use Import CSV instead.",
    };
  }
};

export const googleSheetsHelpSteps = [
  "Keep your master list in Google Sheets with the same column headers as the CSV template.",
  "Share → General access → Anyone with the link → Viewer (or File → Share → Publish to web).",
  "Copy the browser URL from the sheet tab you want (use #gid=… for other tabs).",
  "Paste the link below and click Import from Google Sheets.",
];
