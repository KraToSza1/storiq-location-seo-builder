import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { runMasterDataHealthCheck } from "../lib/masterDataHealth";
import { useProjects } from "../state/ProjectsContext";

export default function LaunchChecklist() {
  const { facilities, images, settings, projects } = useProjects();
  const brandConfigured = settings.brandName.trim().length > 0;
  const health = runMasterDataHealthCheck(facilities, images);
  const hasErrors = health.some((i) => i.severity === "error");
  const hasRealFacilities = facilities.length > 6 || !health.some((i) => i.id === "sample-only");
  const hasProjects = projects.length > 0;

  const items = [
    {
      done: brandConfigured,
      label: "Brand settings configured",
      href: "/settings",
    },
    {
      done: facilities.length > 0 && !hasErrors,
      label: "Facility library imported (no critical errors)",
      href: "/master-data",
    },
    {
      done: images.filter((i) => i.type === "storage_type").length >= 3,
      label: "Storage type images in library (3+)",
      href: "/master-data",
    },
    {
      done: hasRealFacilities,
      label: "Replace starter sample facilities with client data",
      href: "/master-data",
    },
    {
      done: hasProjects,
      label: "At least one location project created",
      href: "/locations/new",
    },
  ];

  const doneCount = items.filter((i) => i.done).length;

  return (
    <section className="storiq-card storiq-card--padding">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="storiq-section-title">Launch checklist</h2>
          <p className="storiq-section-subtitle">
            {doneCount}/{items.length} complete — finish before client demos.
          </p>
        </div>
        <span className={`storiq-badge ${doneCount === items.length ? "storiq-badge-pass" : "storiq-badge-needs-review"}`}>
          {doneCount === items.length ? "Ready" : "In setup"}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: "var(--storiq-success)" }} aria-hidden="true" />
            ) : (
              <Circle className="h-4 w-4 shrink-0" style={{ color: "var(--storiq-fg-muted)" }} aria-hidden="true" />
            )}
            <span style={{ color: item.done ? "var(--storiq-fg-secondary)" : "var(--storiq-fg)" }}>{item.label}</span>
            {!item.done ? (
              <Link to={item.href} className="storiq-link ml-auto inline-flex items-center gap-1 text-xs">
                Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
