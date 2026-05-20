import type { AuditStatus, ProjectStatus } from "../types/storiq";

const statusLabels: Record<ProjectStatus, string> = {
  draft: "Draft",
  ready_for_generation: "Ready",
  generated: "Generated",
  needs_review: "Needs Review",
  approved: "Approved",
};

const statusClass: Record<ProjectStatus, string> = {
  draft: "storiq-badge-draft",
  ready_for_generation: "storiq-badge-ready",
  generated: "storiq-badge-generated",
  needs_review: "storiq-badge-review",
  approved: "storiq-badge-approved",
};

const auditClass: Record<AuditStatus, string> = {
  pass: "storiq-badge-pass",
  warning: "storiq-badge-warning",
  fail: "storiq-badge-fail",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={`storiq-badge ${statusClass[status]}`}>{statusLabels[status]}</span>;
}

export function AuditStatusBadge({ status, label }: { status: AuditStatus; label?: string }) {
  return <span className={`storiq-badge ${auditClass[status]}`}>{label ?? status}</span>;
}

export const auditStatusFromScore = (score: number, failCount: number): AuditStatus => {
  if (failCount > 0) return "fail";
  if (score < 90) return "warning";
  return "pass";
};
