import { AlertTriangle, CheckCircle2 } from "lucide-react";
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

  const update = (iframeCode: string) => {
    const next = parseGoogleMapsIframe(iframeCode);
    onChange({ iframeCode, detectedSrc: next.detectedSrc, isValid: next.isValid });
  };

  const statusItems = [
    { label: "Valid iframe", ok: parsed.isValid },
    { label: 'loading="lazy"', ok: parsed.hasLazyLoading },
    { label: "title", ok: parsed.hasTitle },
    { label: "referrerpolicy", ok: parsed.hasReferrerPolicy },
  ];

  return (
    <div className="storiq-stack">
      <TextArea
        label="Google Maps iframe"
        value={project.googleMaps.iframeCode}
        onChange={update}
        required
        placeholder='<iframe src="https://www.google.com/maps/embed?..." loading="lazy" title="Map to facility" referrerpolicy="no-referrer-when-downgrade"></iframe>'
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
            {item.ok ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}
