import { useEffect } from "react";
import { debugLog } from "../lib/debugLog";
import CopyButton from "./CopyButton";

export default function HtmlPreview({ html }: { html: string }) {
  useEffect(() => {
    debugLog("HtmlPreview", "preview mounted", { htmlLength: html.length, hasMapIframe: /<iframe[^>]+google\.com\/maps/i.test(html) });
  }, [html]);
  return (
    <div className="storiq-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="storiq-section-title">HTML Preview</h2>
          <p className="storiq-section-subtitle">Rendered preview and copy-ready Storagely HTML.</p>
        </div>
        <CopyButton value={html} label="Copy HTML" />
      </div>
      <iframe
        title="Storagely HTML preview"
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin allow-popups"
        className="storiq-card"
        style={{ height: "620px", width: "100%", background: "var(--storiq-surface)" }}
      />
      <textarea readOnly value={html} className="storiq-code storiq-scrollbar" style={{ height: "20rem", width: "100%", padding: "1rem" }} />
    </div>
  );
}
