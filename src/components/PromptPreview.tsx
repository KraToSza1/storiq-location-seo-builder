import CopyButton from "./CopyButton";

export default function PromptPreview({ prompt }: { prompt: string }) {
  return (
    <section className="storiq-card storiq-card--padding storiq-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="storiq-section-title">AI Build Prompt</h2>
          <p className="storiq-section-subtitle">Copy-ready prompt for Claude, ChatGPT, or another approved assistant.</p>
        </div>
        <CopyButton value={prompt} label="Copy AI Build Prompt" />
      </div>
      <textarea readOnly value={prompt} className="storiq-code storiq-scrollbar" style={{ height: "24rem", width: "100%", padding: "1rem" }} />
    </section>
  );
}
