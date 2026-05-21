import { useState } from "react";
import { Download } from "lucide-react";
import { countProjectsByQueue } from "../lib/projectQueue";
import { downloadExportReadyZip, getExportReadyProjects } from "../lib/bulkExport";
import { useProjects } from "../state/ProjectsContext";

export default function BatchExportPanel() {
  const { projects, facilities, images } = useProjects();
  const [message, setMessage] = useState("");
  const ready = getExportReadyProjects(projects, facilities, images);
  const counts = countProjectsByQueue(projects, facilities, images);

  const handleZip = async () => {
    const result = await downloadExportReadyZip(projects, facilities, images);
    setMessage(
      result.count > 0
        ? `Downloaded ZIP with ${result.count} file(s). ${result.skipped} project(s) skipped (not export-ready).`
        : "No export-ready projects — complete wizard steps and fix failed checks first.",
    );
  };

  return (
    <section className="storiq-card storiq-card--padding">
      <h2 className="storiq-section-title">Batch export</h2>
      <p className="storiq-section-subtitle">
        {ready.length} of {projects.length} project(s) pass all pre-export checks. Queue: {counts.export_ready} export-ready,{" "}
        {counts.in_progress} in progress.
      </p>
      <button type="button" disabled={ready.length === 0} onClick={handleZip} className="storiq-btn storiq-btn-primary mt-4">
        <Download className="h-4 w-4" aria-hidden="true" />
        Download ZIP ({ready.length} files)
      </button>
      {message ? <p className="storiq-alert storiq-alert-info mt-4">{message}</p> : null}
    </section>
  );
}
