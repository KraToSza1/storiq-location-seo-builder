import { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { runPublishedPageQa } from "../lib/publishedPageQa";
import type { LocationProject } from "../types/storiq";

const icons = { pass: CheckCircle2, warning: AlertTriangle, fail: XCircle };
const classes = {
  pass: "storiq-alert-success",
  warning: "storiq-alert-warning",
  fail: "storiq-alert-danger",
};

export default function PublishedPageQaPanel({ project }: { project: LocationProject }) {
  const [pastedHtml, setPastedHtml] = useState("");
  const checks = pastedHtml.trim() ? runPublishedPageQa(project, pastedHtml) : [];

  return (
    <section className="storiq-card storiq-card--padding">
      <h2 className="storiq-section-title">Published page QA</h2>
      <p className="storiq-section-subtitle">
        After pasting into Storagely, copy the live page HTML (View Source) and compare against this project.
      </p>
      <textarea
        className="storiq-input mt-4 min-h-32 font-mono text-xs"
        value={pastedHtml}
        onChange={(e) => setPastedHtml(e.target.value)}
        placeholder="Paste live page HTML here…"
      />
      {checks.length > 0 ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {checks.map((check) => {
            const Icon = icons[check.status];
            return (
              <div key={check.id} className={`storiq-alert ${classes[check.status]} flex items-start gap-2`} style={{ margin: 0 }}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <div className="font-semibold">{check.label}</div>
                  <div className="text-xs opacity-90">{check.message}</div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
