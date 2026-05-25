import { RefreshCw } from "lucide-react";
import { generateDraftFaqs } from "../lib/draftGenerator";
import { TextArea } from "./FormControls";
import type { FaqItem, LocationProject, StorageImage } from "../types/storiq";

export default function FaqEditor({
  project,
  images,
  faqs,
  onChange,
}: {
  project: LocationProject;
  images: StorageImage[];
  faqs: FaqItem[];
  onChange: (faqs: FaqItem[]) => void;
}) {
  const regenerate = () => {
    onChange(generateDraftFaqs(project, images));
  };

  const updateFaq = (index: number, field: keyof FaqItem, value: string) => {
    onChange(faqs.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)));
  };

  return (
    <div className="storiq-stack">
      <div className="storiq-toolbar">
        <button type="button" onClick={regenerate} className="storiq-btn storiq-btn-secondary">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Regenerate FAQs from project data
        </button>
      </div>
      <p className="storiq-help">
        FAQ text must match the exported FAQPage JSON-LD exactly. Each FAQ should include the wireframe phrase{" "}
        <strong>Self Storage units in [City, State]</strong> for local SEO. Regenerate to refresh from project data.
      </p>
      <div className="storiq-stack-sm">
        {faqs.map((faq, index) => (
          <article key={`faq-${index}`} className="storiq-card-inset p-4">
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--storiq-accent)" }}>
              FAQ {index + 1}
            </p>
            <TextArea
              label="Question (H3)"
              value={faq.question}
              onChange={(question) => updateFaq(index, "question", question)}
              required
            />
            <TextArea
              label="Answer"
              value={faq.answer}
              onChange={(answer) => updateFaq(index, "answer", answer)}
              required
            />
          </article>
        ))}
      </div>
    </div>
  );
}
