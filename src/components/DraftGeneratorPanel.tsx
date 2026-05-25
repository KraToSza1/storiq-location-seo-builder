import { CheckCircle2, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import CopyButton from "./CopyButton";
import {
  generateDraftFaqs,
  refreshAllDraftContent,
  refreshDraftSection,
  restoreAllDraftsFromBaseline,
  restoreDraftSectionFromBaseline,
} from "../lib/draftGenerator";
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

const formatDraftTime = (iso: string): string => {
  if (!iso.trim()) {
    return "";
  }

  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

export default function DraftGeneratorPanel({ project }: { project: LocationProject }) {
  const { facilities, images, updateProject } = useProjects();
  const [notice, setNotice] = useState<string | null>(null);
  const [highlightSectionId, setHighlightSectionId] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const draftText = draftAsText(project);
  const lastDraftedLabel = formatDraftTime(project.generated.lastDraftedAt);

  const showNotice = (message: string, sectionId?: string) => {
    setNotice(message);
    setHighlightSectionId(sectionId ?? null);
    if (noticeTimerRef.current) {
      window.clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null);
      setHighlightSectionId(null);
    }, 3200);
  };

  useEffect(
    () => () => {
      if (noticeTimerRef.current) {
        window.clearTimeout(noticeTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (project.generated.draftSections.length > 0) {
      return;
    }

    updateProject(project.id, (current) => ({
      ...current,
      generated: {
        ...current.generated,
        ...refreshAllDraftContent(current, facilities, images),
      },
    }));
  }, [project.id, project.generated.draftSections.length, facilities, images, updateProject]);

  const applyGenerated = (
    updater: (current: LocationProject) => Partial<LocationProject["generated"]>,
    message: string,
    sectionId?: string,
  ) => {
    updateProject(project.id, (current) => ({
      ...current,
      generated: {
        ...current.generated,
        ...updater(current),
      },
    }));
    showNotice(message, sectionId);
  };

  const regenerateAll = () => {
    applyGenerated(
      (current) => refreshAllDraftContent(current, facilities, images),
      "All sections, title, meta, and FAQs refreshed from your latest brief.",
    );
  };

  const regenerateSection = (sectionId: string, label: string) => {
    applyGenerated(
      (current) => ({
        draftSections: refreshDraftSection(current, sectionId, facilities, images),
        lastDraftedAt: new Date().toISOString(),
      }),
      `${label} regenerated from your latest brief fields.`,
      sectionId,
    );
  };

  const resetSection = (sectionId: string, label: string) => {
    applyGenerated(
      (current) => {
        const restored = restoreDraftSectionFromBaseline(current, sectionId);
        if (restored) {
          return {
            draftSections: restored,
            lastDraftedAt: new Date().toISOString(),
          };
        }

        return {
          draftSections: refreshDraftSection(current, sectionId, facilities, images),
          lastDraftedAt: new Date().toISOString(),
        };
      },
      project.generated.draftBaseline
        ? `${label} reset to your last saved starter draft.`
        : `${label} reset — run Generate Starter Draft first to save a reset point.`,
      sectionId,
    );
  };

  const resetAll = () => {
    applyGenerated(
      (current) => {
        const restored = restoreAllDraftsFromBaseline(current);
        if (restored) {
          return restored;
        }
        return refreshAllDraftContent(current, facilities, images);
      },
      project.generated.draftBaseline
        ? "All sections restored to your last saved starter draft."
        : "No saved starter draft yet — generated fresh copy from your brief instead.",
    );
  };

  const regenerateFaqs = () => {
    applyGenerated(
      (current) => ({
        draftFaqs: generateDraftFaqs(current, images),
        lastDraftedAt: new Date().toISOString(),
      }),
      "FAQ drafts regenerated from your latest brief.",
    );
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
            <p className="storiq-section-subtitle">
              Starter copy from your brief — no external AI. Update Brief or Content Inputs first, then Regenerate or Refresh All.
              {lastDraftedLabel ? ` Last updated ${lastDraftedLabel}.` : ""}
            </p>
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
          <button type="button" onClick={resetAll} className="storiq-btn storiq-btn-ghost">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset All
          </button>
          <CopyButton value={draftText} label="Copy All Draft Copy" />
        </div>
      </div>

      {notice ? (
        <div className="storiq-alert storiq-alert-success flex items-start gap-2" role="status">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="storiq-card-inset p-4">
          <h3 className="storiq-section-title" style={{ fontSize: "0.875rem" }}>
            Title Tag Suggestion
          </h3>
          <p className="mt-2 text-sm" style={{ color: "var(--storiq-fg-secondary)" }}>
            {project.generated.draftTitleTag || "Generate starter draft to create a title tag suggestion."}
          </p>
        </article>
        <article className="storiq-card-inset p-4">
          <h3 className="storiq-section-title" style={{ fontSize: "0.875rem" }}>
            Meta Description Suggestion
          </h3>
          <p className="mt-2 text-sm" style={{ color: "var(--storiq-fg-secondary)" }}>
            {project.generated.draftMetaDescription || "Generate starter draft to create a meta description suggestion."}
          </p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {project.generated.draftSections.map((section) => (
          <article
            key={section.id}
            className={`storiq-card-inset p-4${highlightSectionId === section.id ? " storiq-draft-card--updated" : ""}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--storiq-accent)" }}>
                {section.label}
              </div>
              <div className="storiq-toolbar">
                <button
                  type="button"
                  onClick={() => regenerateSection(section.id, section.label)}
                  className="storiq-btn storiq-btn-secondary storiq-btn-sm"
                >
                  <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => resetSection(section.id, section.label)}
                  className="storiq-btn storiq-btn-secondary storiq-btn-sm"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  Reset
                </button>
                <CopyButton value={sectionToText(section)} label="Copy" variant="ghost" className="storiq-btn-sm" />
              </div>
            </div>
            <h3 className="mt-2 text-base font-semibold" style={{ color: "var(--storiq-fg)" }}>
              {section.heading}
            </h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--storiq-fg-muted)" }}>
              {section.body}
            </p>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="storiq-section-title" style={{ fontSize: "0.875rem" }}>
            FAQ Drafts (6)
          </h3>
          <div className="storiq-toolbar">
            <button type="button" onClick={regenerateFaqs} className="storiq-btn storiq-btn-secondary storiq-btn-sm">
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              Regenerate FAQs
            </button>
            <CopyButton
              value={project.generated.draftFaqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n")}
              label="Copy FAQs"
              variant="secondary"
            />
          </div>
        </div>
        <div className="storiq-stack-sm">
          {project.generated.draftFaqs.map((faq, index) => (
            <article key={`${faq.question}-${index}`} className="storiq-card-inset p-3 text-sm" style={{ background: "var(--storiq-surface)" }}>
              <p className="font-semibold" style={{ color: "var(--storiq-fg)" }}>
                {faq.question}
              </p>
              <p className="mt-1" style={{ color: "var(--storiq-fg-muted)" }}>
                {faq.answer}
              </p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
