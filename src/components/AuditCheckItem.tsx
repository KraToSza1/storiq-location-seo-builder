import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { SEOAuditCheck } from "../types/storiq";

const iconMap = {
  pass: CheckCircle2,
  warning: AlertTriangle,
  fail: XCircle,
};

const tileClass = {
  pass: "storiq-tile storiq-tile--pass",
  warning: "storiq-tile storiq-tile--warning",
  fail: "storiq-tile storiq-tile--fail",
};

export default function AuditCheckItem({ check }: { check: SEOAuditCheck }) {
  const Icon = iconMap[check.status];

  return (
    <article className={tileClass[check.status]}>
      <div className="flex gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold">{check.label}</h3>
          <p className="mt-1 text-sm opacity-90">{check.message}</p>
          {check.fixSuggestion ? <p className="mt-2 text-xs font-medium opacity-80">Fix: {check.fixSuggestion}</p> : null}
        </div>
      </div>
    </article>
  );
}
