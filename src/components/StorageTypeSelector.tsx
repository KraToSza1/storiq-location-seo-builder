import { AlertTriangle, Check, Link as LinkIcon, MinusCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { getStorageImageById, isLinkableStorageType } from "../lib/imageLibrary";
import { debugLog, debugTable } from "../lib/debugLog";
import { selectedStorageCategories } from "../lib/storageTypeFidelity";
import { useProjects } from "../state/ProjectsContext";

export default function StorageTypeSelector({
  selectedIds,
  onChange,
  project,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** When provided, logs Step 3 categories for debug trace. */
  project?: { selectedStorageImages: string[]; existingContent: { storageTypes: string[] } };
}) {
  const { images } = useProjects();
  const storageImages = images.filter((image) => image.type === "storage_type");

  const toggle = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter((selected) => selected !== id) : [...selectedIds, id];
    debugLog("StorageTypeSelector", selectedIds.includes(id) ? "deselected" : "selected", { id, count: next.length });
    if (project && images) {
      const categories = selectedStorageCategories(
        { ...project, selectedStorageImages: next } as import("../types/storiq").LocationProject,
        images,
      );
      debugTable(
        "StorageTypeSelector:Step3",
        next.map((imageId) => ({
          imageId,
          category: getStorageImageById(images, imageId)?.category ?? "(missing)",
        })),
      );
      debugLog("StorageTypeSelector", "Step 3 categories now", { categories, extractedIgnored: project.existingContent.storageTypes });
    }
    onChange(next);
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
    <div className="storiq-stack">
      <p className="storiq-help">
        Images load from <code className="storiq-code">public/media-library/storage-types/</code>. Add or replace files there, then refresh Master Data if needed. Generated copy only mentions storage types you select here — types detected in pasted page content are ignored unless selected.
      </p>
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
    </div>
  );
}
