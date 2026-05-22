import { AlertTriangle, Check, ExternalLink, MapPin, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { isWrongNearbyCardImage } from "../lib/nearbyLocationImages";
import {
  NEARBY_SELECTION_MAX,
  NEARBY_SELECTION_MIN,
  canSelectMoreNearby,
  isNearbySelectionCountValid,
  rankNearbyFacilities,
  suggestNearbyFacilityIds,
  suggestNearbyFacilityNames,
} from "../lib/nearbySuggestions";
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
  const [query, setQuery] = useState("");
  const [suggestMessage, setSuggestMessage] = useState("");

  const toggle = (id: string) => {
    setSuggestMessage("");
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selected) => selected !== id));
      return;
    }
    if (!canSelectMoreNearby(selectedIds)) {
      return;
    }
    onChange([...selectedIds, id]);
  };

  const applySuggestions = () => {
    const ids = suggestNearbyFacilityIds(project, facilities);
    if (ids.length === 0) {
      setSuggestMessage("No facilities available to suggest. Import your facility library in Master Data.");
      return;
    }
    onChange([...ids]);
    const names = suggestNearbyFacilityNames(project, facilities);
    setSuggestMessage(`Updated selection: ${names.join(" · ")}`);
  };

  const clearSelection = () => {
    onChange([]);
    setSuggestMessage(`Selection cleared. Pick ${NEARBY_SELECTION_MIN}–${NEARBY_SELECTION_MAX} nearby locations or use Suggest best.`);
  };

  const selectedFacilities = selectedIds.map((id) => facilities.find((f) => f.id === id)).filter((f): f is NearbyFacility => Boolean(f));

  const rankedFacilities = useMemo(() => rankNearbyFacilities(project, facilities), [project, facilities]);

  const filteredFacilities = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rankedFacilities;

    return rankedFacilities.filter((facility) => {
      const haystack = [facility.facilityName, facility.city, facility.state, facility.address, facility.zipCode, facility.storagelyUrl]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [rankedFacilities, query]);

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

  const atLimit = selectedIds.length >= NEARBY_SELECTION_MAX;
  const selectionValid = isNearbySelectionCountValid(selectedIds.length);
  const wrongImageCount = facilities.filter((f) => isWrongNearbyCardImage(f.imageUrl)).length;

  return (
    <div className="storiq-stack">
      <div className={`storiq-alert ${selectionValid ? "storiq-alert-success" : "storiq-alert-warning"}`}>
        Select {NEARBY_SELECTION_MIN}–{NEARBY_SELECTION_MAX} nearby facilities with correct nearby-location photos. Current selection:{" "}
        {selectedIds.length}.
        {atLimit ? " Maximum reached — remove one to change selection, or use Suggest best to replace all." : ""}
      </div>
      {wrongImageCount > 0 ? (
        <div className="storiq-alert storiq-alert-warning">
          {wrongImageCount} facility(ies) still use storage-type images instead of nearby-location photos. Open Master Data and click Reset
          facilities, or re-import your CSV, then refresh this page.
        </div>
      ) : null}
      <div className="storiq-toolbar">
        <button type="button" onClick={applySuggestions} className="storiq-btn storiq-btn-secondary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Suggest best (up to {NEARBY_SELECTION_MAX}, same state)
        </button>
        <button type="button" onClick={clearSelection} disabled={selectedIds.length === 0} className="storiq-btn storiq-btn-ghost">
          Clear selection
        </button>
      </div>
      {suggestMessage ? <div className="storiq-alert storiq-alert-info">{suggestMessage}</div> : null}
      {selectedFacilities.some((f) => !f.storagelyUrl) ? (
        <div className="storiq-alert storiq-alert-danger">One or more selected facilities are missing a Storagely URL.</div>
      ) : null}
      {selectedFacilities.some((f) => !f.imageUrl) ? (
        <div className="storiq-alert storiq-alert-warning">One or more selected facilities are missing an image URL.</div>
      ) : null}
      {selectedFacilities.some((f) => isWrongNearbyCardImage(f.imageUrl)) ? (
        <div className="storiq-alert storiq-alert-warning">
          A selected card still uses a storage-type image. Remove it and pick a location with a nearby-locations photo.
        </div>
      ) : null}

      <label className="block">
        <span className="storiq-label">Search locations</span>
        <div className="relative mt-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: "var(--storiq-fg-muted)" }}
            aria-hidden="true"
          />
          <input
            className="storiq-input"
            style={{ paddingLeft: "2.5rem" }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by facility name, city, state, or address"
          />
        </div>
        <span className="storiq-help">
          Showing {filteredFacilities.length} eligible location(s) (correct nearby-locations image + URL)
          {query.trim() ? ` matching “${query.trim()}”` : ""} · {facilities.length} total in library. Scroll the panel below for all cards.
        </span>
      </label>

      <div className="storiq-nearby-facilities-scroll storiq-scrollbar" tabIndex={0} role="region" aria-label="Nearby facility cards">
        {filteredFacilities.length === 0 ? (
          <p className="storiq-empty-text px-1 py-6">No facilities match your search. Try a different city or facility name.</p>
        ) : (
          <div className="grid gap-4 pb-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredFacilities.map((facility) => {
              const selected = selectedIds.includes(facility.id);
              const selfLink =
                facility.storagelyUrl.toLowerCase() === project.locationIdentity.storagelyPageUrl.trim().toLowerCase() ||
                facility.facilityName.toLowerCase() === project.locationIdentity.facilityName.trim().toLowerCase();
              const disabled = selfLink || (!selected && atLimit);
              const wrongImage = isWrongNearbyCardImage(facility.imageUrl);

              return (
                <article
                  key={facility.id}
                  className={`storiq-select-card${selected ? " storiq-select-card--selected" : ""}${disabled ? " storiq-select-card--disabled" : ""}`}
                  style={{ cursor: disabled ? "not-allowed" : undefined, opacity: disabled && !selected ? 0.65 : undefined }}
                >
                  {facility.imageUrl && !wrongImage ? (
                    <img src={facility.imageUrl} alt={facility.facilityName} className="h-28 w-full object-cover" loading="lazy" />
                  ) : (
                    <div
                      className="flex h-28 flex-col items-center justify-center gap-1 px-2 text-center text-xs"
                      style={{ background: "var(--storiq-surface-muted)", color: "var(--storiq-fg-muted)" }}
                    >
                      {wrongImage ? "Use a nearby-locations image in Master Data" : "No image"}
                    </div>
                  )}
                  <div className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold" style={{ color: "var(--storiq-fg)" }}>
                          {facility.facilityName}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
                          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                          {facility.city}, {facility.state}
                        </p>
                      </div>
                      {selected ? <Check className="h-5 w-5 shrink-0" style={{ color: "var(--storiq-accent)" }} aria-hidden="true" /> : null}
                    </div>
                    <p className="text-sm" style={{ color: "var(--storiq-fg-secondary)" }}>
                      {facility.address}
                    </p>
                    {facility.storagelyUrl ? (
                      <a href={facility.storagelyUrl} target="_blank" rel="noreferrer" className="storiq-link inline-flex items-center gap-1">
                        Storagely URL <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: "var(--storiq-danger)" }}>
                        Missing URL
                      </span>
                    )}
                    <button type="button" onClick={() => toggle(facility.id)} disabled={disabled} className="storiq-btn storiq-btn-secondary w-full">
                      {selfLink ? "Current facility — cannot select" : selected ? "Remove" : atLimit ? `Limit reached (${NEARBY_SELECTION_MAX})` : "Select"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
