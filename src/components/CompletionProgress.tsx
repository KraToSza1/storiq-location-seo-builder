import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { getProjectValidation } from "../lib/validators";
import { useProjects } from "../state/ProjectsContext";
import type { LocationProject } from "../types/storiq";

export default function CompletionProgress({ project }: { project: LocationProject }) {
  const { facilities, images } = useProjects();
  const validation = getProjectValidation(project, facilities, images);

  return (
    <section className="storiq-card storiq-card--padding">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="storiq-section-title">Completion</h2>
          <p className="storiq-section-subtitle">
            {validation.hardFails.length === 0
              ? "Required intake fields are complete."
              : `${validation.hardFails.length} required item(s) still need attention.`}
          </p>
        </div>
        <div className="storiq-stat-value storiq-stat-value--accent">{validation.completionPercent}%</div>
      </div>
      <div className="storiq-progress-track">
        <div className="storiq-progress-fill" style={{ width: `${validation.completionPercent}%` }} />
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {validation.hardFails.slice(0, 6).map((issue) => (
          <div key={issue.id} className="storiq-alert storiq-alert-danger flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {issue.message}
          </div>
        ))}
        {validation.hardFails.length === 0 ? (
          <div className="storiq-alert storiq-alert-success flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            Ready for generation and audit review.
          </div>
        ) : null}
      </div>
    </section>
  );
}
