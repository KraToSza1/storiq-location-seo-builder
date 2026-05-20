import { AlertTriangle, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { useProjects } from "../state/ProjectsContext";

export default function FacilityLocationImageSelector({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { images } = useProjects();
  const locationImages = images.filter((image) => image.type === "facility_location");

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((s) => s !== id) : [...selectedIds, id]);
  };

  if (locationImages.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
        No facility location images.{" "}
        <Link to="/master-data" className="storiq-link">
          Add facility_location images →
        </Link>
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {locationImages.map((image) => {
        const selected = selectedIds.includes(image.id);
        return (
          <button
            key={image.id}
            type="button"
            onClick={() => toggle(image.id)}
            className={`storiq-select-card p-3 text-left${selected ? " storiq-select-card--selected" : ""}`}
          >
            <img src={image.imageUrl} alt={image.altText} className="mb-2 h-24 w-full rounded object-cover" loading="lazy" />
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: "var(--storiq-fg)" }}>{image.category}</span>
              {selected ? <Check className="h-4 w-4" style={{ color: "var(--storiq-accent)" }} aria-hidden="true" /> : null}
            </div>
            {!image.altText ? (
              <span className="mt-1 flex items-center gap-1 text-xs" style={{ color: "var(--storiq-warning)" }}>
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Missing alt text
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
