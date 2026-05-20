import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";
import CopyButton from "./CopyButton";
import LaunchReadinessPanel from "./LaunchReadinessPanel";
import { buildExportFilename, exportChecksPass, runExportChecks } from "../lib/exportChecks";
import { useProjects } from "../state/ProjectsContext";
import type { LocationProject } from "../types/storiq";

const downloadText = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const auditReport = (project: LocationProject): string =>
  [
    `StorIQ SEO Audit Report`,
    `Facility: ${project.locationIdentity.facilityName || "Untitled"}`,
    `Location: ${project.locationIdentity.city}, ${project.locationIdentity.state}`,
    `Score: ${project.audit.score}/100`,
    "",
    ...project.audit.checks.map(
      (check) => `- [${check.status.toUpperCase()}] ${check.label}: ${check.message}${check.fixSuggestion ? ` Fix: ${check.fixSuggestion}` : ""}`,
    ),
  ].join("\n");

const checkIcon = { pass: CheckCircle2, warning: AlertTriangle, fail: XCircle };
const checkClass = { pass: "storiq-alert storiq-alert-success", warning: "storiq-alert storiq-alert-warning", fail: "storiq-alert storiq-alert-danger" };

export default function ExportPanel({ project }: { project: LocationProject }) {
  const { facilities, images } = useProjects();
  const html = project.generated.html;
  const exportChecks = runExportChecks(project, html, images, facilities);
  const canExport = exportChecksPass(exportChecks);
  const filename = buildExportFilename(project);
  const json = JSON.stringify(project, null, 2);
  const report = auditReport(project);

  return (
    <div className="storiq-stack">
      <LaunchReadinessPanel project={project} compact />

      <section className="storiq-card storiq-card--padding">
        <h2 className="storiq-section-title">Pre-Export Checks</h2>
        <p className="storiq-section-subtitle">
          {canExport ? "All critical export checks passed." : "Resolve failed checks before publishing to Storagely."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {exportChecks.map((check) => {
            const Icon = checkIcon[check.status];
            return (
              <div key={check.id} className={`${checkClass[check.status]} flex items-start gap-2`} style={{ margin: 0 }}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-semibold">{check.label}</div>
                  <div className="text-xs opacity-90">{check.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="storiq-card storiq-card--padding">
        <h2 className="storiq-section-title">Export Assets</h2>
        <p className="storiq-section-subtitle">Download filename: {filename}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <CopyButton value={html} label="Copy HTML" />
          <button type="button" disabled={!canExport} onClick={() => downloadText(filename, html, "text/html")} className="storiq-btn storiq-btn-secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download HTML
          </button>
          <CopyButton value={project.generated.aiPrompt} label="Copy AI Prompt" variant="secondary" />
          <button type="button" onClick={() => downloadText(filename.replace(".html", ".json"), json, "application/json")} className="storiq-btn storiq-btn-secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download Project JSON
          </button>
          <CopyButton value={report} label="Copy SEO Audit Report" variant="secondary" />
        </div>
        {!canExport ? <p className="storiq-alert storiq-alert-danger mt-4">Fix failed pre-export checks before downloading HTML for production.</p> : null}
      </section>
    </div>
  );
}
