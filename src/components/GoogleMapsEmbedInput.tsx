import { MapPin, Sparkles } from "lucide-react";
import { buildGoogleMapsFromProject } from "../lib/googleMapsEmbed";
import { parseGoogleMapsIframe } from "../lib/validators";
import { TextArea } from "./FormControls";
import type { LocationProject } from "../types/storiq";

export default function GoogleMapsEmbedInput({
  project,
  onChange,
}: {
  project: LocationProject;
  onChange: (maps: LocationProject["googleMaps"]) => void;
}) {
  const parsed = parseGoogleMapsIframe(project.googleMaps.iframeCode);
  const suggested = buildGoogleMapsFromProject(project);

  const update = (iframeCode: string) => {
    const next = parseGoogleMapsIframe(iframeCode);
    onChange({ iframeCode, detectedSrc: next.detectedSrc, isValid: next.isValid });
  };

  const generateFromAddress = () => {
    if (!suggested.query) return;
    update(suggested.iframeCode);
  };

  const statusItems = [
    { label: "Valid iframe", ok: parsed.isValid },
    { label: 'loading="lazy"', ok: parsed.hasLazyLoading },
    { label: "title", ok: parsed.hasTitle },
    { label: "referrerpolicy", ok: parsed.hasReferrerPolicy },
  ];

  return (
    <div className="storiq-stack">
      <div className="storiq-alert storiq-alert-info">
        <strong>MVP approach:</strong> generate a map from the facility address (Step 2), or paste the official Google Maps embed iframe from Share → Embed a map.
        No API key is required for this workflow.
      </div>

      <div className="storiq-card-inset flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--storiq-fg)" }}>
            Address used for map
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {suggested.query || "Add an address in Step 2 (or city/state in Step 1) to enable auto-generation."}
          </p>
        </div>
        <button type="button" onClick={generateFromAddress} disabled={!suggested.query} className="storiq-btn storiq-btn-primary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Generate map from address
        </button>
      </div>

      <TextArea
        label="Google Maps iframe"
        value={project.googleMaps.iframeCode}
        onChange={update}
        required
        placeholder='<iframe src="https://www.google.com/maps/embed?..." loading="lazy" title="Map to facility" referrerpolicy="no-referrer-when-downgrade"></iframe>'
        helpText="Paste to override the generated embed. Storagely accepts the full iframe HTML."
      />
      {parsed.detectedSrc ? (
        <div className="storiq-card-inset px-4 py-3 text-xs" style={{ color: "var(--storiq-fg-muted)" }}>
          Detected src: <span style={{ fontFamily: "var(--storiq-font-mono)" }}>{parsed.detectedSrc}</span>
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {statusItems.map((item) => (
          <div
            key={item.label}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${item.ok ? "storiq-alert storiq-alert-success" : "storiq-alert storiq-alert-warning"}`}
            style={{ margin: 0 }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
