import { ArrowRight, CopyPlus, Download, FileUp, Layers, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import BatchExportPanel from "../components/BatchExportPanel";
import CompletionProgress from "../components/CompletionProgress";
import LaunchChecklist from "../components/LaunchChecklist";
import LaunchReadinessPanel from "../components/LaunchReadinessPanel";
import { auditStatusFromScore, AuditStatusBadge, StatusBadge } from "../components/StatusBadge";
import { getLaunchReadiness } from "../lib/launchReadiness";
import {
  countProjectsByQueue,
  filterProjectsByQueue,
  findNextIncompleteProject,
  getProjectQueueStatus,
  type ProjectQueueFilter,
} from "../lib/projectQueue";
import { useProjects } from "../state/ProjectsContext";

const formatDate = (iso: string): string =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));

const filterOptions: { id: ProjectQueueFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "in_progress", label: "In progress" },
  { id: "export_ready", label: "Export ready" },
  { id: "needs_review", label: "Needs review" },
  { id: "approved", label: "Approved" },
];

export default function Dashboard() {
  const { projects, facilities, images, deleteProject, duplicateProject, importProjects } = useProjects();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [importMessage, setImportMessage] = useState("");
  const [queueFilter, setQueueFilter] = useState<ProjectQueueFilter>("all");

  const counts = useMemo(() => countProjectsByQueue(projects, facilities, images), [projects, facilities, images]);
  const filteredProjects = useMemo(
    () => filterProjectsByQueue(projects, queueFilter, facilities, images),
    [projects, queueFilter, facilities, images],
  );
  const nextIncomplete = useMemo(() => findNextIncompleteProject(projects, facilities, images), [projects, facilities, images]);

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "storiq-location-projects-backup.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importProjects(String(reader.result ?? ""));
      setImportMessage(result.error ? `Import failed: ${result.error}` : `Imported ${result.imported} project(s).`);
    };
    reader.readAsText(file);
  };

  return (
    <div className="storiq-stack">
      <section className="storiq-page-header">
        <div>
          <h1 className="storiq-page-title">Dashboard</h1>
          <p className="storiq-page-subtitle">Create, validate, audit, and export Storagely-ready location pages.</p>
        </div>
        <div className="storiq-toolbar">
          <button type="button" onClick={() => fileInputRef.current?.click()} className="storiq-btn storiq-btn-secondary">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Import JSON
          </button>
          <button type="button" onClick={downloadBackup} className="storiq-btn storiq-btn-secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Export Backup
          </button>
          <Link to="/bulk" className="storiq-btn storiq-btn-secondary">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Bulk Builder
          </Link>
          <Link to="/locations/new" className="storiq-btn storiq-btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create New Location Page
          </Link>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => handleImport(event.target.files?.[0])}
        />
      </section>

      {importMessage ? <div className="storiq-alert storiq-alert-info">{importMessage}</div> : null}

      <LaunchChecklist />

      {projects.length > 0 ? <BatchExportPanel /> : null}

      <section className="storiq-grid-stats">
        <article className="storiq-stat-card">
          <div className="storiq-stat-value">{projects.length}</div>
          <div className="storiq-stat-label">Saved location projects</div>
        </article>
        <article className="storiq-stat-card">
          <div className="storiq-stat-value">{counts.export_ready}</div>
          <div className="storiq-stat-label">Export ready</div>
        </article>
        <article className="storiq-stat-card">
          <div className="storiq-stat-value">{facilities.length}</div>
          <div className="storiq-stat-label">Master facilities</div>
        </article>
        <article className="storiq-stat-card">
          <div className="storiq-stat-value storiq-stat-value--accent">
            {projects.length === 0
              ? 0
              : Math.round(
                  projects.reduce((total, project) => total + getLaunchReadiness(project, facilities, images).score, 0) /
                    projects.length,
                )}
          </div>
          <div className="storiq-stat-label">Avg launch readiness / 100</div>
        </article>
      </section>

      {nextIncomplete ? (
        <section className="storiq-card storiq-card--padding flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="storiq-section-title">Continue work</h2>
            <p className="storiq-section-subtitle">
              Next incomplete: {nextIncomplete.locationIdentity.facilityName || "Untitled"} —{" "}
              {getProjectQueueStatus(nextIncomplete, facilities, images).label}
            </p>
          </div>
          <Link to={`/locations/${nextIncomplete.id}`} className="storiq-btn storiq-btn-primary">
            Open workspace
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      ) : null}

      {projects.length === 0 ? (
        <section className="storiq-empty">
          <h2 className="storiq-empty-title">No location projects yet</h2>
          <p className="storiq-empty-text">
            Start a guided intake, paste the facility brief, select storage and nearby-location cards, then export the finished HTML.
          </p>
          <Link to="/locations/new" className="storiq-btn storiq-btn-primary mt-5">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create New Location Page
          </Link>
        </section>
      ) : (
        <>
          <section className="storiq-card storiq-card--padding">
            <h2 className="storiq-section-title">Project queue</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setQueueFilter(option.id)}
                  className={`storiq-btn storiq-btn-sm ${queueFilter === option.id ? "storiq-btn-primary" : "storiq-btn-secondary"}`}
                >
                  {option.label} ({counts[option.id]})
                </button>
              ))}
            </div>
          </section>

          {filteredProjects.length === 0 ? (
            <p className="storiq-empty-text">No projects in this queue filter.</p>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {filteredProjects.map((project) => {
                const failCount = project.audit.checks.filter((check) => check.status === "fail").length;
                const auditStatus = auditStatusFromScore(project.audit.score, failCount);
                const readiness = getLaunchReadiness(project, facilities, images);
                const queueStatus = getProjectQueueStatus(project, facilities, images);
                const launchBadge =
                  readiness.status === "ready"
                    ? "storiq-badge-ready-launch"
                    : readiness.status === "needs_review"
                      ? "storiq-badge-needs-review"
                      : "storiq-badge-blocked";

                return (
                  <article key={project.id} className="storiq-card storiq-card--padding">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <Link to={`/locations/${project.id}`} className="storiq-link text-lg font-semibold" style={{ fontSize: "1.0625rem" }}>
                          {project.locationIdentity.facilityName || "Untitled Location"}
                        </Link>
                        <p className="storiq-section-subtitle mt-1">
                          {[project.locationIdentity.city, project.locationIdentity.state].filter(Boolean).join(", ") || "City and state missing"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="storiq-badge storiq-badge-pass">{queueStatus.label}</span>
                        <StatusBadge status={project.status} />
                        <AuditStatusBadge status={auditStatus} label={`SEO ${project.audit.score}`} />
                        <span className={`storiq-badge ${launchBadge}`}>
                          {readiness.overallLabel} {readiness.score}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <CompletionProgress project={project} />
                    </div>
                    <div className="mt-4">
                      <LaunchReadinessPanel project={project} compact />
                    </div>

                    <div className="storiq-footer-meta mt-4 flex flex-wrap items-center justify-between gap-3">
                      <span>Last updated {formatDate(project.updatedAt)}</span>
                      <div className="storiq-toolbar">
                        <button
                          type="button"
                          onClick={() => {
                            const copy = duplicateProject(project.id);
                            if (copy) navigate(`/locations/${copy.id}`);
                          }}
                          className="storiq-btn storiq-btn-secondary storiq-btn-sm"
                        >
                          <CopyPlus className="h-4 w-4" aria-hidden="true" />
                          Duplicate
                        </button>
                        <button type="button" onClick={() => deleteProject(project.id)} className="storiq-btn storiq-btn-danger storiq-btn-sm">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
