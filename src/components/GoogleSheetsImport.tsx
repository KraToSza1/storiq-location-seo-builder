import { ExternalLink, Sheet } from "lucide-react";
import { useState } from "react";
import { TextInput } from "./FormControls";
import { fetchGoogleSheetsCsv, googleSheetsHelpSteps } from "../lib/googleSheets";

const storageKeyFor = (scope: string): string => `storiq-google-sheet-url-${scope}`;

export default function GoogleSheetsImport({
  scope,
  label,
  onImportCsv,
  onMessage,
}: {
  scope: "facilities" | "images" | "bulk";
  label: string;
  onImportCsv: (csv: string) => void;
  onMessage?: (message: string) => void;
}) {
  const [url, setUrl] = useState(() => {
    try {
      return localStorage.getItem(storageKeyFor(scope)) || "";
    } catch {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const persistUrl = (value: string) => {
    setUrl(value);
    try {
      if (value.trim()) localStorage.setItem(storageKeyFor(scope), value.trim());
      else localStorage.removeItem(storageKeyFor(scope));
    } catch {
      /* ignore */
    }
  };

  const importFromSheets = async () => {
    setError("");
    setLoading(true);
    const result = await fetchGoogleSheetsCsv(url);
    setLoading(false);

    if ("error" in result) {
      setError(result.error);
      onMessage?.(result.error);
      return;
    }

    onImportCsv(result.csv);
    onMessage?.(`Imported from Google Sheets (${label}).`);
  };

  return (
    <div className="storiq-card storiq-card--padding mt-4 border-dashed" style={{ borderStyle: "dashed" }}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="storiq-icon-well">
          <Sheet className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="storiq-section-title">Import from Google Sheets</h3>
          <p className="storiq-section-subtitle mt-1">
            Pull the live sheet as CSV — same columns as the CSV template. No API key; sheet must be viewable with the link.
          </p>
        </div>
      </div>

      <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm" style={{ color: "var(--storiq-fg-secondary)" }}>
        {googleSheetsHelpSteps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <TextInput
          label="Google Sheets URL"
          value={url}
          onChange={persistUrl}
          placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0"
          helpText="Tip: open the Facilities (or Images / Bulk) tab in Sheets, then copy the URL from your browser."
        />
        <button
          type="button"
          disabled={!url.trim() || loading}
          onClick={() => void importFromSheets()}
          className="storiq-btn storiq-btn-primary md:mb-0.5"
        >
          {loading ? "Importing…" : "Import from Google Sheets"}
        </button>
      </div>

      {error ? <div className="storiq-alert storiq-alert-danger mt-3">{error}</div> : null}

      <p className="mt-3 text-xs" style={{ color: "var(--storiq-fg-muted)" }}>
        Works with shared or published sheets. If fetch fails, use{" "}
        <strong>File → Download → Comma-separated values (.csv)</strong> in Sheets and Import CSV above.{" "}
        <a
          href="https://support.google.com/docs/answer/183965"
          target="_blank"
          rel="noreferrer"
          className="storiq-link inline-flex items-center gap-1"
        >
          Google publish help <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}
