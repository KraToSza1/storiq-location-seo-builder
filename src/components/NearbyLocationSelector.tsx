import { AlertTriangle, Check, ExternalLink, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import type { LocationProject, NearbyFacility } from "../types/storiq";

export default function NearbyLocationSelector({
  project,
  facilities,
  selectedIds,
  onChange,
}: {
  project: LocationProject;
  facilities: NearbyFacility[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id]);
  };

  const selectedFacilities = selectedIds.map((id) => facilities.find((f) => f.id === id)).filter((f): f is NearbyFacility => Boolean(f));

  if (facilities.length === 0) {
    return (
      <div className="storiq-empty">
        <AlertTriangle className="mx-auto h-8 w-8" style={{ color: "var(--storiq-warning)" }} aria-hidden="true" />
        <p className="storiq-empty-title mt-3">No facilities in library</p>
        <Link to="/master-data" className="storiq-link mt-2 inline-block">
          Import facility CSV in Master Data →
        </Link>
      </div>
    );
  }

  return (
    <div className="storiq-stack">
      <div className={`storiq-alert ${selectedIds.length === 3 ? "storiq-alert-success" : "storiq-alert-warning"}`}>
        Select exactly 3 nearby facilities. Current selection: {selectedIds.length}.
      </div>
      {selectedFacilities.some((f) => !f.storagelyUrl) ? (
        <div className="storiq-alert storiq-alert-danger">One or more selected facilities are missing a Storagely URL.</div>
      ) : null}
      {selectedFacilities.some((f) => !f.imageUrl) ? (
        <div className="storiq-alert storiq-alert-warning">One or more selected facilities are missing an image URL.</div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {facilities.map((facility) => {
          const selected = selectedIds.includes(facility.id);
          const selfLink =
            facility.storagelyUrl.toLowerCase() === project.locationIdentity.storagelyPageUrl.trim().toLowerCase() ||
            facility.facilityName.toLowerCase() === project.locationIdentity.facilityName.trim().toLowerCase();

          return (
            <article key={facility.id} className={`storiq-select-card${selected ? " storiq-select-card--selected" : ""}${selfLink ? " storiq-select-card--disabled" : ""}`} style={{ cursor: selfLink ? "not-allowed" : undefined }}>
              {facility.imageUrl ? (
                <img src={facility.imageUrl} alt={facility.facilityName} className="h-28 w-full object-cover" loading="lazy" />
              ) : (
                <div className="flex h-28 items-center justify-center text-xs" style={{ background: "var(--storiq-surface-muted)", color: "var(--storiq-fg-muted)" }}>
                  No image
                </div>
              )}
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold" style={{ color: "var(--storiq-fg)" }}>{facility.facilityName}</h3>
                    <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {facility.city}, {facility.state}
                    </p>
                  </div>
                  {selected ? <Check className="h-5 w-5" style={{ color: "var(--storiq-accent)" }} aria-hidden="true" /> : null}
                </div>
                <p className="text-sm" style={{ color: "var(--storiq-fg-secondary)" }}>{facility.address}</p>
                {facility.storagelyUrl ? (
                  <a href={facility.storagelyUrl} target="_blank" rel="noreferrer" className="storiq-link inline-flex items-center gap-1">
                    Storagely URL <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-xs font-semibold" style={{ color: "var(--storiq-danger)" }}>Missing URL</span>
                )}
                <button type="button" onClick={() => toggle(facility.id)} disabled={selfLink} className="storiq-btn storiq-btn-secondary w-full">
                  {selfLink ? "Current facility — cannot select" : selected ? "Remove" : "Select"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
