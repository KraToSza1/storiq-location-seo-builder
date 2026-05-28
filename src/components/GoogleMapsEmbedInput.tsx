import { MapPin, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";
import { debugLog } from "../lib/debugLog";
import { debugFlow } from "../lib/debugUi";
import {
  applyMapDisplayTypeToIframeCode,
  buildGoogleMapsFromProject,
  getMapPreviewSrc,
  isExportQualityMapEmbedSrc,
  isLegacyMapEmbedSrc,
  resolveMapDisplayType,
  upgradeLegacyMapEmbedIfPossible,
  type MapDisplayType,
} from "../lib/googleMapsEmbed";
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

  const mapType = resolveMapDisplayType(project.googleMaps.mapType);

  const applyIframe = (iframeCode: string, nextMapType = mapType) => {
    const styled = applyMapDisplayTypeToIframeCode(iframeCode, nextMapType);
    const next = parseGoogleMapsIframe(styled);
    debugLog("GoogleMapsEmbed", "iframe updated", {
      isValid: next.isValid,
      mapType: nextMapType,
      detectedSrc: next.detectedSrc?.slice(0, 80),
      isEmbedPb: /maps\/embed/i.test(next.detectedSrc) && /!3d/i.test(next.detectedSrc),
      isLegacyQ: /maps\?q=/i.test(next.detectedSrc),
    });
    onChange({
      iframeCode: styled,
      detectedSrc: next.detectedSrc,
      isValid: next.isValid,
      mapType: nextMapType,
    });
  };

  const setMapType = (nextMapType: MapDisplayType) => {
    debugFlow("GoogleMapsEmbed", `mapType → ${nextMapType}`);
    if (project.googleMaps.iframeCode.trim()) {
      applyIframe(project.googleMaps.iframeCode, nextMapType);
      return;
    }
    onChange({ ...project.googleMaps, mapType: nextMapType });
  };

  const generateFromAddress = () => {
    if (!suggested.query) return;
    applyIframe(suggested.iframeCode, mapType);
  };

  useEffect(() => {
    if (!project.googleMaps.iframeCode.trim() && suggested.isValid && suggested.iframeCode) {
      const next = parseGoogleMapsIframe(suggested.iframeCode);
      onChange({
        iframeCode: suggested.iframeCode,
        detectedSrc: next.detectedSrc,
        isValid: next.isValid,
        mapType,
      });
    }
  }, [suggested.query, suggested.iframeCode, suggested.isValid, project.googleMaps.iframeCode, onChange]);

  const exportQualityEmbed = parsed.detectedSrc ? isExportQualityMapEmbedSrc(parsed.detectedSrc) : false;
  const legacyEmbed = parsed.detectedSrc ? isLegacyMapEmbedSrc(parsed.detectedSrc) : false;

  const statusItems = [
    { label: "Valid iframe", ok: parsed.isValid },
    { label: "Export-quality embed (!3d/!2d)", ok: exportQualityEmbed },
    { label: 'loading="lazy"', ok: parsed.hasLazyLoading },
    { label: "title", ok: parsed.hasTitle },
    { label: "referrerpolicy", ok: parsed.hasReferrerPolicy },
  ];

  const applyExportQualityEmbed = () => {
    const upgraded = upgradeLegacyMapEmbedIfPossible(project);
    if (upgraded.googleMaps.iframeCode !== project.googleMaps.iframeCode) {
      applyIframe(upgraded.googleMaps.iframeCode, mapType);
    }
  };

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

      <div className="flex flex-wrap items-end gap-3">
        <label className="storiq-field flex-1 min-w-[12rem]">
          <span className="storiq-label">Map style</span>
          <select
            className="storiq-input mt-1 w-full"
            value={mapType}
            onChange={(e) => setMapType(e.target.value as MapDisplayType)}
          >
            <option value="satellite">Satellite (aerial)</option>
            <option value="hybrid">Hybrid (satellite + labels)</option>
            <option value="roadmap">Road map</option>
          </select>
        </label>
        <p className="storiq-help flex-1 pb-1" style={{ margin: 0 }}>
          For export quality, switch Google Maps to your preferred view, then Share → Embed a map. The dropdown also adjusts generated and pasted embeds when possible.
        </p>
      </div>

      {legacyEmbed ? (
        <div className="storiq-alert storiq-alert-warning flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm" style={{ margin: 0 }}>
            Basic <code className="storiq-code">maps?q=</code> embed blocks export. Use Share → Embed from Google Maps, or click Fix for coordinates when this city is in the facility library.
          </p>
          <button type="button" onClick={applyExportQualityEmbed} className="storiq-btn storiq-btn-secondary storiq-btn-sm">
            Fix embed for export
          </button>
        </div>
      ) : null}

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
