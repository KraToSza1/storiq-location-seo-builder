import { useEffect, useState } from "react";
import { debugLog } from "../lib/debugLog";
import CopyButton from "./CopyButton";

/**
 * Renders generated HTML in a same-origin blob iframe (no sandbox) so nested Google Maps embeds can run scripts.
 * Content is always produced by StorIQ — not arbitrary third-party HTML.
 */
export default function HtmlPreview({ html }: { html: string }) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    debugLog("HtmlPreview", "preview mounted", {
      htmlLength: html.length,
      hasMapIframe: /<iframe[^>]+google\.com\/maps/i.test(html),
      mode: "blob-url",
    });
    return () => URL.revokeObjectURL(url);
  }, [html]);

  return (
    <div className="storiq-stack">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="storiq-section-title">HTML Preview</h2>
          <p className="storiq-section-subtitle">
            Rendered preview and copy-ready Storagely HTML. Errors from mygarageselfstorage.com or Storagely tabs in the
            same DevTools window are not from this preview.
          </p>
        </div>
        <CopyButton value={html} label="Copy HTML" />
      </div>
      {previewUrl ? (
        <iframe
          title="Storagely HTML preview"
          src={previewUrl}
          className="storiq-card"
          style={{ height: "620px", width: "100%", background: "var(--storiq-surface)" }}
        />
      ) : (
        <div className="storiq-card storiq-map-preview--empty" style={{ height: "620px" }} aria-busy="true" />
      )}
      <textarea readOnly value={html} className="storiq-code storiq-scrollbar" style={{ height: "20rem", width: "100%", padding: "1rem" }} />
    </div>
  );
}
