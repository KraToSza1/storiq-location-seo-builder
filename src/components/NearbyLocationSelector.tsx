import { AlertTriangle, Check, ExternalLink, MapPin, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { resolveProjectPlaceLabel } from "../lib/facilityProximity";
import { isWrongNearbyCardImage } from "../lib/nearbyLocationImages";
import {
  NEARBY_PROXIMITY_MAX_MILES,
  NEARBY_SELECTION_IDEAL,
  canSelectMoreNearby,
  canSelectNearbyFacility,
  facilityDistanceMiles,
  filterNearbyFacilities,
  formatNearbySelectionRequirement,
  getNearbySelectionLimits,
  hasProjectOrigin,
  isNearbySelectionCountValid,
  isSelfNearbyFacility,
  selectedNearbyOutsideProximity,
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
  const didInitialSuggest = useRef(false);

  const projectPlace = resolveProjectPlaceLabel(project);
  const originReady = hasProjectOrigin(project);
  const selectionLimits = getNearbySelectionLimits(project, facilities);
  const tooFarSelected = selectedNearbyOutsideProximity(project, facilities, selectedIds);

  useEffect(() => {
    if (didInitialSuggest.current || facilities.length === 0 || !originReady) return;
    if (selectedIds.length > 0) {
      didInitialSuggest.current = true;
      return;
    }

    const ids = suggestNearbyFacilityIds(project, facilities);
    if (ids.length === 0) return;

    didInitialSuggest.current = true;
    onChange(ids);
    const names = suggestNearbyFacilityNames(project, facilities);
    setSuggestMessage(`Auto-selected ${ids.length} closest within ${NEARBY_PROXIMITY_MAX_MILES} mi: ${names.join(" · ")}`);
  }, [facilities.length, onChange, originReady, project, selectedIds.length]);

  const toggle = (id: string) => {
    setSuggestMessage("");
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((selected) => selected !== id));
      return;
    }
    if (!canSelectMoreNearby(selectedIds, project, facilities)) {
      return;
    }
    const facility = facilities.find((entry) => entry.id === id);
    if (!facility || !canSelectNearbyFacility(project, facility)) {
      return;
    }
    onChange([...selectedIds, id]);
  };

  const applySuggestions = () => {
    if (!originReady) {
      setSuggestMessage("Add your Storagely page URL in Step 1 first — nearby picks are based on that location.");
      return;
    }
    const ids = suggestNearbyFacilityIds(project, facilities);
    if (ids.length === 0) {
      setSuggestMessage(`No locations within ${NEARBY_PROXIMITY_MAX_MILES} miles were found. Check the Storagely URL city in Step 1.`);
      return;
    }
    onChange([...ids]);
    const names = suggestNearbyFacilityNames(project, facilities);
    setSuggestMessage(`Updated to the ${ids.length} closest: ${names.join(" · ")}`);
  };

  const clearSelection = () => {
    onChange([]);
    setSuggestMessage(
      `Selection cleared. Pick ${formatNearbySelectionRequirement(selectionLimits)} within ${NEARBY_PROXIMITY_MAX_MILES} mi, or use Suggest nearest.`,
    );
  };

  const selectedFacilities = selectedIds.map((id) => facilities.find((f) => f.id === id)).filter((f): f is NearbyFacility => Boolean(f));

  const displayFacilities = useMemo(
    () => filterNearbyFacilities(project, facilities, query),
    [facilities, project, query],
  );

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

  const atLimit = selectedIds.length >= selectionLimits.max;
  const selectionValid = isNearbySelectionCountValid(selectedIds.length, project, facilities) && tooFarSelected.length === 0;
  const wrongImageCount = facilities.filter((f) => isWrongNearbyCardImage(f.imageUrl)).length;
  const searching = query.trim().length > 0;

  return (
    <div className="storiq-stack">
      {!originReady ? (
        <div className="storiq-alert storiq-alert-warning">
          Add your <strong>Storagely page URL</strong> in Step 1 so StorIQ can pick the 3 closest locations within {NEARBY_PROXIMITY_MAX_MILES}{" "}
          miles.
        </div>
      ) : null}
      <div className={`storiq-alert ${selectionValid ? "storiq-alert-success" : "storiq-alert-warning"}`}>
        Select {formatNearbySelectionRequirement(selectionLimits)} within {NEARBY_PROXIMITY_MAX_MILES} mi of {projectPlace}. Current
        selection: {selectedIds.length}.
        {atLimit ? " Maximum reached for this location — remove one to swap, or use Suggest nearest to reset." : ""}
      </div>
      {selectionLimits.availableClose > 0 && selectionLimits.target < NEARBY_SELECTION_IDEAL && originReady ? (
        <div className="storiq-alert storiq-alert-info">
          Only {selectionLimits.availableClose} {selectionLimits.availableClose === 1 ? "location is" : "locations are"} close enough — StorIQ
          will use {selectionLimits.target}, not {NEARBY_SELECTION_IDEAL}.
        </div>
      ) : null}
      {selectionLimits.availableClose === 0 && originReady ? (
        <div className="storiq-alert storiq-alert-warning">
          No locations within {NEARBY_PROXIMITY_MAX_MILES} mi of {projectPlace}. Check the Storagely page URL city in Step 1.
        </div>
      ) : null}
      {wrongImageCount > 0 ? (
        <div className="storiq-alert storiq-alert-warning">
          {wrongImageCount} facility(ies) still use storage-type images instead of nearby-location photos. Open Master Data and click Reset
          facilities, or re-import your CSV, then refresh this page.
        </div>
      ) : null}
      <div className="storiq-toolbar">
        <button type="button" onClick={applySuggestions} className="storiq-btn storiq-btn-secondary">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Suggest nearest{selectionLimits.target > 0 ? ` (${selectionLimits.target})` : ""}
        </button>
        <button type="button" onClick={clearSelection} disabled={selectedIds.length === 0} className="storiq-btn storiq-btn-ghost">
          Clear selection
        </button>
      </div>
      {suggestMessage ? <div className="storiq-alert storiq-alert-info">{suggestMessage}</div> : null}
      {tooFarSelected.length > 0 ? (
        <div className="storiq-alert storiq-alert-danger">
          {tooFarSelected.map((f) => f.city).join(", ")} is too far from {projectPlace}. Remove it and pick a closer location.
        </div>
      ) : null}
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
          {searching
            ? `Showing ${displayFacilities.length} match(es) from ${facilities.length} in the library.`
            : originReady
              ? `All ${displayFacilities.length} locations shown, nearest first. Only ${formatNearbySelectionRequirement(selectionLimits)} within ${NEARBY_PROXIMITY_MAX_MILES} mi can be selected.`
              : `All ${displayFacilities.length} locations shown. Add the Storagely page URL in Step 1 to enable proximity picks.`}
        </span>
      </label>

      <div className="storiq-nearby-facilities-scroll storiq-scrollbar" tabIndex={0} role="region" aria-label="Nearby facility cards">
        {displayFacilities.length === 0 ? (
          <p className="storiq-empty-text px-1 py-6">No facilities match your search. Try a different city or facility name.</p>
        ) : (
          <div className="grid gap-4 pb-2 md:grid-cols-2 xl:grid-cols-3">
            {displayFacilities.map((facility) => {
              const selected = selectedIds.includes(facility.id);
              const selfLink = isSelfNearbyFacility(project, facility);
              const withinRange = canSelectNearbyFacility(project, facility);
              const disabled = selfLink || (!selected && (atLimit || !withinRange));
              const wrongImage = isWrongNearbyCardImage(facility.imageUrl);
              const distanceMiles = facilityDistanceMiles(project, facility);
              const tooFar = originReady && distanceMiles !== null && distanceMiles > NEARBY_PROXIMITY_MAX_MILES;

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
                        {distanceMiles !== null ? (
                          <p
                            className="mt-1 text-xs font-medium"
                            style={{ color: tooFar ? "var(--storiq-danger)" : "var(--storiq-fg-secondary)" }}
                          >
                            ~{Math.round(distanceMiles)} mi from {projectPlace}
                            {tooFar ? ` — outside ${NEARBY_PROXIMITY_MAX_MILES} mi limit` : ""}
                          </p>
                        ) : null}
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
                      {selfLink
                        ? "Current facility — cannot select"
                        : selected
                          ? "Remove"
                          : tooFar
                            ? "Too far away"
                            : atLimit
                              ? `Limit reached (${selectionLimits.max})`
                              : !originReady
                                ? "Add Storagely URL first"
                                : "Select"}
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
