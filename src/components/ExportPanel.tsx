import { AlertTriangle, CheckCircle2, Download, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";
import CopyButton from "./CopyButton";
import ExportOptionCard, { type ExportOptionGuide } from "./ExportOptionCard";
import LaunchReadinessPanel from "./LaunchReadinessPanel";
import PublishedPageQaPanel from "./PublishedPageQaPanel";
import { buildExportFilename, exportChecksPass, runExportChecks } from "../lib/exportChecks";
import { exportHtmlForPublish, extractMainFragment, extractStoragelyPasteBody } from "../lib/htmlExport";
import { resolvePublishAssetBaseUrl } from "../lib/assetUrls";
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

const STORAGELY_EXPORT_OPTIONS: ExportOptionGuide[] = [
  {
    id: "storagely-fragment",
    title: "Copy Storagely Fragment",
    summary: "Paste this into the Storagely page editor. This is the usual choice for publishing.",
    recommended: true,
    details:
      "This copies only the page content Storagely expects — styles plus the main page sections — without extra document wrapper tags. Open the location page in Storagely, switch to HTML/source mode if needed, paste, preview, then save.",
  },
  {
    id: "full-html",
    title: "Copy Full HTML",
    summary: "The complete HTML file: head tags, styles, and full body. Use if Storagely accepts a whole document.",
    details:
      "Everything in one block, including <!DOCTYPE html>, <head>, and inline CSS. Helpful for archiving or if your Storagely workflow accepts a full HTML document instead of a fragment.",
  },
  {
    id: "main-only",
    title: "Copy Main Only",
    summary: "Just the inner <main> page block — no styles in the copy. Use only if Storagely asks for markup without CSS.",
    details:
      "Copies the facility template main section only. Storagely usually needs the fragment option above because it includes the required CSS. Try this only if Storagely support tells you to paste markup without styles.",
  },
];

const FILE_EXPORT_OPTIONS: ExportOptionGuide[] = [
  {
    id: "download-full",
    title: "Download Full (.md)",
    summary: "Save the full HTML to your computer as a file — same content as Copy Full HTML.",
    details:
      "Downloads a .md file containing the full HTML document. Useful if you want to keep a copy on your desktop or attach it in email. The file can be opened in any text editor.",
  },
  {
    id: "download-fragment",
    title: "Download Fragment (.md)",
    summary: "Save the Storagely paste version to a file — same content as Copy Storagely Fragment.",
    details:
      "Downloads the Storagely-ready fragment as a .md file. Good for backup before you paste, or if you prefer to open the file and copy from there.",
  },
];

const WORKFLOW_EXPORT_OPTIONS: ExportOptionGuide[] = [
  {
    id: "ai-prompt",
    title: "Copy AI Prompt",
    summary: "A text brief you can paste into ChatGPT or another AI tool. StorIQ does not call AI for you.",
    details:
      "Copies a structured prompt built from this location's data. Use it if you want outside AI help rewriting copy. You still paste final approved content back through the workspace before export.",
  },
  {
    id: "project-json",
    title: "Download Project JSON",
    summary: "Backup of all wizard fields for this location. Not pasted into Storagely.",
    details:
      "Downloads every saved field for this project as JSON — identity, content, images, nearby picks, FAQs, and generated HTML. Use for backup, support, or importing into another browser later.",
  },
  {
    id: "audit-report",
    title: "Copy SEO Audit Report",
    summary: "Plain-text checklist of SEO audit results for review or sharing.",
    details:
      "Copies a readable report with pass/fail items from the SEO Audit tab. Helpful for internal review notes or sending to a teammate — not uploaded to Storagely.",
  },
];

export default function ExportPanel({ project }: { project: LocationProject }) {
  const { facilities, images, settings } = useProjects();
  const [openHelpId, setOpenHelpId] = useState<string | null>(null);
  const html = exportHtmlForPublish(project.generated.html, settings);
  const assetBase = resolvePublishAssetBaseUrl(settings);
  const exportChecks = runExportChecks(project, html, images, facilities);
  const canExport = exportChecksPass(exportChecks);
  const filename = buildExportFilename(project);
  const json = JSON.stringify(project, null, 2);
  const report = auditReport(project);
  const fragment = extractStoragelyPasteBody(html);
  const mainOnly = extractMainFragment(html);

  const renderOption = (option: ExportOptionGuide, action: ReactNode, disabled = false) => (
    <ExportOptionCard
      key={option.id}
      {...option}
      disabled={disabled}
      helpOpen={openHelpId === option.id}
      onHelpOpen={() => setOpenHelpId(option.id)}
      onHelpClose={() => setOpenHelpId(null)}
    >
      {action}
    </ExportOptionCard>
  );

  return (
    <div className="storiq-stack">
      <section className="storiq-alert storiq-alert-success">
        <div className="font-semibold">Facility wireframe structure</div>
        <p className="mt-1 text-sm opacity-90">
          Export HTML follows the 7-section My Garage wireframe: Features &amp; Amenities, Value Proposition, Storage Types,
          Local Content, Nearby Locations, FAQs, and Map/CTA. All H tags match the wireframe — 7 section H2 titles, H3 on
          storage cards, nearby cards, and FAQ questions. No heading changes needed.
        </p>
      </section>

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
        <p className="storiq-section-subtitle">
          Not sure where to start? Use <strong>Copy Storagely Fragment</strong> — then paste into the Storagely page editor.
          Tap <strong>What is this?</strong> on any option for a short explanation.
        </p>
        <p className="storiq-help mt-2">
          Suggested filename: {filename}. Images use absolute URLs from {assetBase} (change in Settings → Media asset base URL).
        </p>

        <h3 className="storiq-export-group-title">Paste into Storagely</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {renderOption(
            STORAGELY_EXPORT_OPTIONS[0],
            <CopyButton value={fragment} label="Copy Storagely Fragment" variant={canExport ? "primary" : "secondary"} />,
          )}
          {renderOption(
            STORAGELY_EXPORT_OPTIONS[1],
            <CopyButton value={html} label="Copy Full HTML" variant="secondary" />,
          )}
          {renderOption(
            STORAGELY_EXPORT_OPTIONS[2],
            <CopyButton value={mainOnly} label="Copy Main Only" variant="secondary" />,
          )}
        </div>

        <h3 className="storiq-export-group-title">Save to your computer</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {renderOption(
            FILE_EXPORT_OPTIONS[0],
            <button
              type="button"
              disabled={!canExport}
              onClick={() => downloadText(filename, html, "text/markdown")}
              className="storiq-btn storiq-btn-secondary"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Full (.md)
            </button>,
            !canExport,
          )}
          {renderOption(
            FILE_EXPORT_OPTIONS[1],
            <button
              type="button"
              disabled={!canExport}
              onClick={() => downloadText(filename.replace(".md", "-fragment.md"), fragment, "text/markdown")}
              className="storiq-btn storiq-btn-secondary"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Fragment (.md)
            </button>,
            !canExport,
          )}
        </div>

        <h3 className="storiq-export-group-title">Review &amp; backup</h3>
        <div className="grid gap-3 lg:grid-cols-3">
          {renderOption(
            WORKFLOW_EXPORT_OPTIONS[0],
            <CopyButton value={project.generated.aiPrompt} label="Copy AI Prompt" variant="secondary" />,
          )}
          {renderOption(
            WORKFLOW_EXPORT_OPTIONS[1],
            <button
              type="button"
              onClick={() => downloadText(filename.replace(".md", ".json"), json, "application/json")}
              className="storiq-btn storiq-btn-secondary"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Project JSON
            </button>,
          )}
          {renderOption(
            WORKFLOW_EXPORT_OPTIONS[2],
            <CopyButton value={report} label="Copy SEO Audit Report" variant="secondary" />,
          )}
        </div>

        {!canExport ? (
          <p className="storiq-alert storiq-alert-danger mt-4">
            Fix failed pre-export checks before downloading HTML files for production. Copy buttons still work for preview.
          </p>
        ) : null}
      </section>

      <PublishedPageQaPanel project={project} />
    </div>
  );
}
