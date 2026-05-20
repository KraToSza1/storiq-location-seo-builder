import { Database, Save } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { TextArea, TextInput } from "../components/FormControls";
import { useProjects } from "../state/ProjectsContext";

export default function SettingsPage() {
  const { settings, updateSettings } = useProjects();
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateSettings(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="storiq-stack">
      <section>
        <h1 className="storiq-page-title">Settings</h1>
        <p className="storiq-page-subtitle">Brand defaults and optional AI prompt guidance for future integrations.</p>
      </section>

      <section className="storiq-highlight-banner">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="storiq-section-title">Master Data</h2>
            <p className="storiq-section-subtitle">
              Facility and image libraries live on a dedicated page with CSV import, Google Sheets import, JSON export, and CRUD.
            </p>
          </div>
          <Link to="/master-data" className="storiq-btn storiq-btn-primary">
            <Database className="h-4 w-4" aria-hidden="true" />
            Open Master Data
          </Link>
        </div>
      </section>

      <section className="storiq-card storiq-card--padding">
        <div className="grid gap-4 lg:grid-cols-2">
          <TextInput label="Brand name" value={draft.brandName} onChange={(brandName) => setDraft((current) => ({ ...current, brandName }))} />
          <TextInput
            label="Default primary keyword pattern"
            value={draft.defaultKeywordPattern}
            onChange={(defaultKeywordPattern) => setDraft((current) => ({ ...current, defaultKeywordPattern }))}
            helpText="Use {City} and {State} tokens."
          />
          <div className="lg:col-span-2">
            <TextArea
              label="Optional AI prompt settings"
              value={draft.aiPromptSettings}
              onChange={(aiPromptSettings) => setDraft((current) => ({ ...current, aiPromptSettings }))}
              helpText="Used when external AI is added in a future sprint. Not sent anywhere today."
            />
          </div>
        </div>
        <button type="button" onClick={save} className="storiq-btn storiq-btn-primary mt-5">
          <Save className="h-4 w-4" aria-hidden="true" />
          {saved ? "Saved" : "Save Settings"}
        </button>
      </section>
    </div>
  );
}
