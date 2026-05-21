import { MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { buildGoogleMapsFromProject, getMapPreviewSrc } from "../lib/googleMapsEmbed";
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
  const previewSrc = useMemo(() => getMapPreviewSrc(project, project.googleMaps.iframeCode), [project, project.googleMaps.iframeCode]);
  const previewTitle = `Map to ${project.locationIdentity.facilityName || "facility"}`;

  const applyIframe = (iframeCode: string) => {
    const next = parseGoogleMapsIframe(iframeCode);
    onChange({ iframeCode, detectedSrc: next.detectedSrc, isValid: next.isValid });
  };

  const generateFromAddress = () => {
    if (!suggested.query) return;
    applyIframe(suggested.iframeCode);
  };

  useEffect(() => {
    if (!project.googleMaps.iframeCode.trim() && suggested.isValid && suggested.iframeCode) {
      const next = parseGoogleMapsIframe(suggested.iframeCode);
      onChange({ iframeCode: suggested.iframeCode, detectedSrc: next.detectedSrc, isValid: next.isValid });
    }
  }, [suggested.query, suggested.iframeCode, suggested.isValid, project.googleMaps.iframeCode, onChange]);

  const statusItems = [
    { label: "Valid iframe", ok: parsed.isValid },
    { label: 'loading="lazy"', ok: parsed.hasLazyLoading },
    { label: "title", ok: parsed.hasTitle },
    { label: "referrerpolicy", ok: parsed.hasReferrerPolicy },
  ];

  return (
    <div className="storiq-stack">
      <div className="storiq-card-inset flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--storiq-fg)" }}>
            Location for map
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {suggested.query || "Add an address in Step 2 (or city/state in Step 1)."}
          </p>
        </div>
        <button type="button" onClick={generateFromAddress} disabled={!suggested.query} className="storiq-btn storiq-btn-secondary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Regenerate from address
        </button>
      </div>

      <section className="storiq-map-preview-wrap" aria-label="Google Maps preview">
        <h3 className="storiq-label mb-2">Live map preview</h3>
        {previewSrc ? (
          <div className="storiq-map-preview">
            <iframe
              title={previewTitle}
              src={previewSrc}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="storiq-map-preview storiq-map-preview--empty">
            <p className="text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
              Enter an address in Step 2 to see the map here, or paste an embed code below.
            </p>
          </div>
        )}
        <p className="storiq-help mt-2">
          This is the same map that will appear on the exported location page. Pan and zoom to confirm the pin looks correct.
        </p>
      </section>

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

      <TextArea
        label="Embed code (advanced)"
        value={project.googleMaps.iframeCode}
        onChange={applyIframe}
        required
        placeholder='<iframe src="https://www.google.com/maps/embed?..." loading="lazy" title="Map to facility" referrerpolicy="no-referrer-when-downgrade"></iframe>'
        helpText="Optional: paste the official Google Maps iframe from Share → Embed a map to override the generated embed."
      />
      {parsed.detectedSrc ? (
        <div className="storiq-card-inset px-4 py-3 text-xs" style={{ color: "var(--storiq-fg-muted)" }}>
          Detected src: <span style={{ fontFamily: "var(--storiq-font-mono)" }}>{parsed.detectedSrc}</span>
        </div>
      ) : null}
    </div>
  );
}
