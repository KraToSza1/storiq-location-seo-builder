import { AlertTriangle, CheckCircle2, Rocket, XCircle } from "lucide-react";
import { getLaunchReadiness } from "../lib/launchReadiness";
import { useProjects } from "../state/ProjectsContext";
import type { LocationProject, LaunchReadinessStatus } from "../types/storiq";

const iconMap = { pass: CheckCircle2, warning: AlertTriangle, fail: XCircle };
const tileClass = { pass: "storiq-tile storiq-tile--pass", warning: "storiq-tile storiq-tile--warning", fail: "storiq-tile storiq-tile--fail" };
const launchBadge: Record<LaunchReadinessStatus, string> = {
  ready: "storiq-badge storiq-badge-ready-launch",
  needs_review: "storiq-badge storiq-badge-needs-review",
  blocked: "storiq-badge storiq-badge-blocked",
};

export default function LaunchReadinessPanel({ project, compact = false }: { project: LocationProject; compact?: boolean }) {
  const { facilities, images } = useProjects();
  const readiness = getLaunchReadiness(project, facilities, images);

  return (
    <section className="storiq-card storiq-card--padding">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="storiq-icon-well">
            <Rocket className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="storiq-section-title">Launch Readiness</h2>
            <p className="storiq-section-subtitle">Score out of 100 · {readiness.overallLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="storiq-stat-value storiq-stat-value--accent">{readiness.score}</div>
            <div className="storiq-stat-label">/ 100</div>
          </div>
          <span className={launchBadge[readiness.status]}>{readiness.overallLabel}</span>
        </div>
      </div>

      {!compact && readiness.blockedReasons.length > 0 ? (
        <div className="storiq-alert storiq-alert-danger mt-4">
          <strong>Blocked:</strong> {readiness.blockedReasons.join(" · ")}
        </div>
      ) : null}

      {!compact && readiness.warnings.length > 0 ? (
        <div className="storiq-alert storiq-alert-warning mt-3">
          <strong>Warnings:</strong> {readiness.warnings.slice(0, 5).join(" · ")}
          {readiness.warnings.length > 5 ? ` (+${readiness.warnings.length - 5} more)` : ""}
        </div>
      ) : null}

      <div className={`mt-5 grid gap-3 ${compact ? "md:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"}`}>
        {readiness.items.map((item) => {
          const Icon = iconMap[item.status];
          return (
            <article key={item.id} className={tileClass[item.status]}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-2">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold">{item.label}</h3>
                    <p className="mt-1 text-xs opacity-90">{item.message}</p>
                  </div>
                </div>
                <span className="text-sm font-bold">{item.score}</span>
              </div>
              {!compact ? <p className="mt-3 text-xs font-medium opacity-80">{item.action}</p> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
