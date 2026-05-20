import { RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import CopyButton from "./CopyButton";
import { regenerateDraftSection } from "../lib/draftGenerator";
import { useProjects } from "../state/ProjectsContext";
import type { DraftSection, LocationProject } from "../types/storiq";

const draftAsText = (project: LocationProject): string =>
  [
    `Title Tag: ${project.generated.draftTitleTag}`,
    `Meta Description: ${project.generated.draftMetaDescription}`,
    "",
    ...project.generated.draftSections.map((section) => sectionToText(section)),
    "",
    "FAQs:",
    ...project.generated.draftFaqs.map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`),
  ].join("\n\n");

const sectionToText = (section: DraftSection): string =>
  [`${section.label}: ${section.heading}`, section.body, ...section.bullets.map((bullet) => `- ${bullet}`)].join("\n");

export default function DraftGeneratorPanel({
  project,
  onUpdate,
}: {
  project: LocationProject;
  onUpdate: (updater: (current: LocationProject) => LocationProject) => void;
}) {
  const { facilities, images } = useProjects();
  const draftText = draftAsText(project);
  const regenerateAll = () => onUpdate((current) => current);

  const regenerateSection = (sectionId: string) => {
    const section = regenerateDraftSection(project, sectionId, facilities, images);
    if (!section) return;
    onUpdate((current) => ({
      ...current,
      generated: {
        ...current.generated,
        draftSections: current.generated.draftSections.map((s) => (s.id === sectionId ? section : s)),
      },
    }));
  };

  return (
    <section className="storiq-card storiq-card--padding storiq-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="storiq-icon-well">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="storiq-section-title">Draft Content Generator</h2>
            <p className="storiq-section-subtitle">Deterministic starter copy from your brief — no external AI API.</p>
          </div>
        </div>
        <div className="storiq-toolbar">
          <button type="button" onClick={regenerateAll} className="storiq-btn storiq-btn-primary">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Generate Starter Draft
          </button>
          <button type="button" onClick={regenerateAll} className="storiq-btn storiq-btn-ghost">
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh All
          </button>
          <CopyButton value={draftText} label="Copy All Draft Copy" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="storiq-card-inset p-4">
          <h3 className="storiq-section-title" style={{ fontSize: "0.875rem" }}>Title Tag Suggestion</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--storiq-fg-secondary)" }}>{project.generated.draftTitleTag}</p>
        </article>
        <article className="storiq-card-inset p-4">
          <h3 className="storiq-section-title" style={{ fontSize: "0.875rem" }}>Meta Description Suggestion</h3>
          <p className="mt-2 text-sm" style={{ color: "var(--storiq-fg-secondary)" }}>{project.generated.draftMetaDescription}</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {project.generated.draftSections.map((section) => (
          <article key={section.id} className="storiq-card-inset p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--storiq-accent)" }}>
                {section.label}
              </div>
              <div className="storiq-toolbar">
                <button type="button" onClick={() => regenerateSection(section.id)} className="storiq-btn storiq-btn-secondary storiq-btn-sm">
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Regenerate
                </button>
                <button type="button" onClick={() => regenerateSection(section.id)} className="storiq-btn storiq-btn-secondary storiq-btn-sm">
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
                <CopyButton value={sectionToText(section)} label="Copy" variant="ghost" className="storiq-btn-sm" />
              </div>
            </div>
            <h3 className="mt-2 text-base font-semibold" style={{ color: "var(--storiq-fg)" }}>{section.heading}</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--storiq-fg-muted)" }}>{section.body}</p>
            {section.bullets.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm" style={{ color: "var(--storiq-fg-muted)" }}>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>- {bullet}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </div>

      <section className="storiq-card-inset p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="storiq-section-title" style={{ fontSize: "0.875rem" }}>FAQ Drafts (6)</h3>
          <CopyButton value={project.generated.draftFaqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")} label="Copy FAQs" variant="secondary" />
        </div>
        <div className="storiq-stack-sm">
          {project.generated.draftFaqs.map((faq) => (
            <article key={faq.question} className="storiq-card-inset p-3 text-sm" style={{ background: "var(--storiq-surface)" }}>
              <p className="font-semibold" style={{ color: "var(--storiq-fg)" }}>{faq.question}</p>
              <p className="mt-1" style={{ color: "var(--storiq-fg-muted)" }}>{faq.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
