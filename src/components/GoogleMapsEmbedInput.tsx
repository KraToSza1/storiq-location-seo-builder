import { MapPin } from "lucide-react";
import { useMemo } from "react";
import { debugLog, debugWarn } from "../lib/debugLog";
import { debugFlow } from "../lib/debugUi";
import {
  buildGoogleMapsFromProject,
  buildMapsQuery,
  getMapPreviewSrc,
  isLegacyMapEmbedSrc,
  isMalformedSyntheticEmbed,
  isOfficialGoogleMapsEmbedSrc,
  resolveMapDisplayType,
  type MapDisplayType,
} from "../lib/googleMapsEmbed";
import { parseGoogleMapsIframe } from "../lib/validators";
import { TextArea } from "./FormControls";
import type { LocationProject } from "../types/storiq";

const mapsSearchUrl = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

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
  const searchQuery = suggested.query || buildMapsQuery(
    project.existingContent.address,
    project.locationIdentity.facilityName,
    project.locationIdentity.city,
    project.locationIdentity.state,
    project.locationIdentity.zipCode,
  );

  const applyIframe = (iframeCode: string) => {
    const next = parseGoogleMapsIframe(iframeCode);
    const official = next.detectedSrc ? isOfficialGoogleMapsEmbedSrc(next.detectedSrc) : false;
    const malformed = next.detectedSrc ? isMalformedSyntheticEmbed(next.detectedSrc) : false;
    const legacy = next.detectedSrc ? isLegacyMapEmbedSrc(next.detectedSrc) : false;

    debugLog("GoogleMapsEmbed", "iframe updated", {
      isValid: next.isValid,
      official,
      malformed,
      legacy,
      detectedSrc: next.detectedSrc?.slice(0, 100),
    });

    if (malformed) {
      debugWarn("GoogleMapsEmbed", "rejecting synthetic pb= embed (0x0:0x0) — paste official Share → Embed", {
        detectedSrc: next.detectedSrc?.slice(0, 120),
      });
    }

    onChange({
      iframeCode,
      detectedSrc: next.detectedSrc,
      isValid: next.isValid && official,
      mapType,
    });
  };

  const setMapType = (nextMapType: MapDisplayType) => {
    debugFlow("GoogleMapsEmbed", `mapType → ${nextMapType} (preview only for legacy q= URLs)`);
    onChange({ ...project.googleMaps, mapType: nextMapType });
  };

  const officialEmbed = parsed.detectedSrc ? isOfficialGoogleMapsEmbedSrc(parsed.detectedSrc) : false;
  const malformedEmbed = parsed.detectedSrc ? isMalformedSyntheticEmbed(parsed.detectedSrc) : false;
  const legacyEmbed = parsed.detectedSrc ? isLegacyMapEmbedSrc(parsed.detectedSrc) : false;
  const previewOnly = Boolean(previewSrc) && !officialEmbed;

  const statusItems = [
    { label: "Official Share → Embed", ok: officialEmbed },
    { label: "Valid iframe markup", ok: parsed.isValid },
    { label: 'loading="lazy"', ok: parsed.hasLazyLoading },
    { label: "title", ok: parsed.hasTitle },
    { label: "referrerpolicy", ok: parsed.hasReferrerPolicy },
  ];

  return (
    <div className="storiq-stack">
      <div className="storiq-card-inset flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--storiq-fg)" }}>
            Google Maps embed (required for export)
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {searchQuery || "Add an address in Step 2 (or city/state in Step 1)."}
          </p>
        </div>
        {searchQuery ? (
          <a
            href={mapsSearchUrl(searchQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className="storiq-btn storiq-btn-secondary"
          >
            Open in Google Maps
          </a>
        ) : null}
      </div>

      <div className="storiq-alert storiq-alert-warning" style={{ margin: 0 }}>
        <p className="text-sm" style={{ margin: 0 }}>
          In Google Maps: find the facility → <strong>Share</strong> → <strong>Embed a map</strong> → copy the full{" "}
          <code className="storiq-code">&lt;iframe&gt;</code> and paste below. Do not edit the <code className="storiq-code">pb=</code>{" "}
          URL — it must stay exactly as Google generated it (real place ID, correct pin).
        </p>
      </div>

      {malformedEmbed ? (
        <div className="storiq-alert storiq-alert-warning" style={{ margin: 0 }}>
          <p className="text-sm" style={{ margin: 0 }}>
            This embed looks auto-generated (<code className="storiq-code">0x0:0x0</code> place id). Replace it with the official Share → Embed
            iframe from Google Maps.
          </p>
        </div>
      ) : null}

      {legacyEmbed ? (
        <div className="storiq-alert storiq-alert-warning" style={{ margin: 0 }}>
          <p className="text-sm" style={{ margin: 0 }}>
            Basic <code className="storiq-code">maps?q=</code> URLs cannot be exported. Paste the official Share → Embed iframe instead.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="storiq-field flex-1 min-w-[12rem]">
          <span className="storiq-label">Map style (preview only)</span>
          <select
            className="storiq-input mt-1 w-full"
            value={mapType}
            onChange={(e) => setMapType(e.target.value as MapDisplayType)}
            disabled={officialEmbed}
          >
            <option value="satellite">Satellite (aerial)</option>
            <option value="hybrid">Hybrid (satellite + labels)</option>
            <option value="roadmap">Road map</option>
          </select>
        </label>
        <p className="storiq-help flex-1 pb-1" style={{ margin: 0 }}>
          {officialEmbed
            ? "Map style is set inside Google’s embed — change the view in Google Maps before copying Share → Embed."
            : "Style applies only to the temporary preview until you paste an official embed."}
        </p>
      </div>

      <section className="storiq-map-preview-wrap" aria-label="Google Maps preview">
        <h3 className="storiq-label mb-2">Live map preview{previewOnly ? " (preview only)" : ""}</h3>
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
              Paste the official Google Maps embed below to preview and export.
            </p>
          </div>
        )}
        <p className="storiq-help mt-2">
          Confirm the pin and business name match this facility before exporting.
        </p>
      </section>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
        label="Official Google Maps embed code"
        value={project.googleMaps.iframeCode}
        onChange={applyIframe}
        required
        placeholder='<iframe src="https://www.google.com/maps/embed?pb=!1m14!1m8!..." width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
        helpText="Paste the complete iframe from Google Maps Share → Embed a map. The pb= parameter must not be edited."
      />
      {parsed.detectedSrc ? (
        <div className="storiq-card-inset px-4 py-3 text-xs" style={{ color: "var(--storiq-fg-muted)" }}>
          Detected src: <span style={{ fontFamily: "var(--storiq-font-mono)" }}>{parsed.detectedSrc}</span>
        </div>
      ) : null}
    </div>
  );
}
