import { AlertTriangle, Check, Link as LinkIcon, MinusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { isLinkableStorageType } from "../lib/imageLibrary";
import { useProjects } from "../state/ProjectsContext";

export default function StorageTypeSelector({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const { images } = useProjects();
  const storageImages = images.filter((image) => image.type === "storage_type");

  const toggle = (id: string) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id]);
  };

  if (storageImages.length === 0) {
    return (
      <div className="storiq-empty">
        <AlertTriangle className="mx-auto h-8 w-8" style={{ color: "var(--storiq-warning)" }} aria-hidden="true" />
        <p className="storiq-empty-title mt-3">No storage type images</p>
        <Link to="/master-data" className="storiq-link mt-2 inline-block">
          Import image library in Master Data →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {storageImages.map((image) => {
        const selected = selectedIds.includes(image.id);
        const linkable = isLinkableStorageType(image.category);

        return (
          <button
            key={image.id}
            type="button"
            onClick={() => toggle(image.id)}
            className={`storiq-select-card${selected ? " storiq-select-card--selected" : ""}`}
          >
            <img src={image.imageUrl} alt={image.altText} className="h-32 w-full object-cover" loading="lazy" />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold" style={{ color: "var(--storiq-fg)" }}>{image.category}</h3>
                  <p className="mt-1 text-xs" style={{ color: "var(--storiq-fg-muted)" }}>
                    {image.destinationUrl && linkable ? "H3 will link to destination URL." : "H3 will remain plain text."}
                  </p>
                </div>
                <span
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: selected ? "var(--storiq-accent)" : "var(--storiq-surface-muted)",
                    color: selected ? "var(--storiq-accent-fg)" : "var(--storiq-fg-muted)",
                  }}
                >
                  {selected ? <Check className="h-4 w-4" aria-hidden="true" /> : <MinusCircle className="h-4 w-4" aria-hidden="true" />}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--storiq-fg-muted)" }}>
                <LinkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{image.destinationUrl || "No destination URL"}</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
