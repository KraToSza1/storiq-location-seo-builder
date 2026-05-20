import AuditCheckItem from "./AuditCheckItem";
import { auditStatusFromScore, AuditStatusBadge } from "./StatusBadge";
import type { LocationProject } from "../types/storiq";

export default function AuditPanel({ project }: { project: LocationProject }) {
  const failCount = project.audit.checks.filter((check) => check.status === "fail").length;
  const warningCount = project.audit.checks.filter((check) => check.status === "warning").length;
  const status = auditStatusFromScore(project.audit.score, failCount);

  return (
    <section className="storiq-stack">
      <div className="storiq-card storiq-card--padding">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="storiq-section-title">SEO Audit</h2>
            <p className="storiq-section-subtitle">
              {failCount} fail(s), {warningCount} warning(s), score {project.audit.score}/100.
            </p>
          </div>
          <AuditStatusBadge status={status} label={status === "pass" ? "Pass" : status === "fail" ? "Fail" : "Warning"} />
        </div>
      </div>
      <div className="grid gap-3">
        {project.audit.checks.map((check) => (
          <AuditCheckItem key={check.id} check={check} />
        ))}
      </div>
    </section>
  );
}
