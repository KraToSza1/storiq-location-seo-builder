import { CopyPlus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuditPanel from "../components/AuditPanel";
import CompletionProgress from "../components/CompletionProgress";
import DraftGeneratorPanel from "../components/DraftGeneratorPanel";
import ExistingContentParser from "../components/ExistingContentParser";
import ExportPanel from "../components/ExportPanel";
import CityStateInput from "../components/CityStateInput";
import { ListTextarea, TextArea, TextInput } from "../components/FormControls";
import GoogleMapsEmbedInput from "../components/GoogleMapsEmbedInput";
import HtmlPreview from "../components/HtmlPreview";
import LaunchReadinessPanel from "../components/LaunchReadinessPanel";
import NearbyLocationSelector from "../components/NearbyLocationSelector";
import PromptPreview from "../components/PromptPreview";
import { StatusBadge } from "../components/StatusBadge";
import FacilityLocationImageSelector from "../components/FacilityLocationImageSelector";
import StorageTypeSelector from "../components/StorageTypeSelector";
import { exportHtmlForPublish } from "../lib/htmlExport";
import { loadDashboardSession, saveDashboardSession } from "../lib/dashboardSession";
import { applyLocalReferences, mergeLocalReferences } from "../lib/localContextUtils";
import { normalizePrimaryKeyword } from "../lib/keywordUtils";
import { buildPrimaryKeyword } from "../lib/projectDefaults";
import { debugLog, debugWarn } from "../lib/debugLog";
import { debugFlow } from "../lib/debugUi";
import { isGenerationBlockedOutput } from "../lib/myGarageGenerationSpec";
import { useProjects } from "../state/ProjectsContext";
import type { LocationProject, ProjectStatus } from "../types/storiq";

const tabs = [
  "Brief",
  "Content Inputs",
  "Images",
  "Nearby Locations",
  "Content Output",
  "Launch Score",
  "SEO Audit",
  "HTML Preview",
  "Export",
] as const;
type Tab = (typeof tabs)[number];

const normalizeWorkspaceTab = (tab: string | null | undefined): Tab | null => {
  if (!tab) {
    return null;
  }
  const legacyTab = tab === "Draft Copy" ? "Content Output" : tab;
  return (tabs as readonly string[]).includes(legacyTab) ? (legacyTab as Tab) : null;
};

const statuses: ProjectStatus[] = ["draft", "ready_for_generation", "generated", "needs_review", "approved"];

export default function LocationWorkspace() {
  const { id } = useParams();
  const { projects, facilities, settings, updateProject, deleteProject, duplicateProject } = useProjects();
  const project = projects.find((item) => item.id === id);
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    if (!id) {
      return "Brief";
    }
    const session = loadDashboardSession();
    const restored = normalizeWorkspaceTab(session.lastProjectId === id ? session.lastWorkspaceTab : null);
    if (restored) {
      return restored;
    }
    return "Brief";
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!project) {
      debugWarn("LocationWorkspace", "project not found", { id, projectCount: projects.length });
      return;
    }
    debugLog("LocationWorkspace", "loaded project", {
      id: project.id,
      tab: activeTab,
      status: project.status,
      htmlLength: project.generated.html.length,
      generationBlocked: isGenerationBlockedOutput(project.generated.html),
      draftFaqCount: project.generated.draftFaqs.length,
    });
  }, [project?.id, project?.generated.html, project?.status, activeTab, id, projects.length]);

  useEffect(() => {
    if (!project || project.id !== id) {
      return;
    }

    const session = loadDashboardSession();
    const restoredTab = session.lastProjectId === id ? normalizeWorkspaceTab(session.lastWorkspaceTab) : null;
    const tab = restoredTab ?? "Brief";

    setActiveTab(tab);
    saveDashboardSession({
      lastProjectId: project.id,
      lastWorkspaceTab: tab,
    });
  }, [id, project?.id]);

  const selectTab = (tab: Tab) => {
    debugFlow("workspace", `tab → ${tab}`, { projectId: project?.id });
    setActiveTab(tab);
    if (project) {
      saveDashboardSession({
        lastProjectId: project.id,
        lastWorkspaceTab: tab,
      });
    }
  };

  const pageTitle = useMemo(() => project?.locationIdentity.facilityName || "Location Workspace", [project]);

  if (!project || !id) {
    return (
      <section className="storiq-empty">
        <h1 className="storiq-empty-title">Location project not found</h1>
        <p className="storiq-empty-text">Return to the dashboard and select a saved project.</p>
        <Link to="/" className="storiq-btn storiq-btn-primary mt-5">
          Back to Dashboard
        </Link>
      </section>
    );
  }

  const save = (updater: (current: LocationProject) => LocationProject) => {
    debugLog("LocationWorkspace", "save field change", { projectId: project.id, tab: activeTab });
    updateProject(project.id, updater);
  };

  const updateIdentity = (field: keyof LocationProject["locationIdentity"], value: string) => {
    save((current) => {
      const previousDefault = buildPrimaryKeyword(
        current.locationIdentity.city,
        current.locationIdentity.state,
        settings.defaultKeywordPattern,
      );
      const nextIdentity = { ...current.locationIdentity, [field]: value };
      const nextDefault = buildPrimaryKeyword(nextIdentity.city, nextIdentity.state, settings.defaultKeywordPattern);
      const shouldAutoKeyword = !current.seo.primaryKeyword || current.seo.primaryKeyword === previousDefault;

      return {
        ...current,
        locationIdentity: nextIdentity,
        seo: {
          ...current.seo,
          primaryKeyword: normalizePrimaryKeyword(shouldAutoKeyword ? nextDefault : current.seo.primaryKeyword),
        },
      };
    });
  };

  const updateCityState = (city: string, state: string) => {
    save((current) => {
      const previousDefault = buildPrimaryKeyword(
        current.locationIdentity.city,
        current.locationIdentity.state,
        settings.defaultKeywordPattern,
      );
      const nextIdentity = { ...current.locationIdentity, city, state };
      const nextDefault = buildPrimaryKeyword(city, state, settings.defaultKeywordPattern);
      const shouldAutoKeyword = !current.seo.primaryKeyword || current.seo.primaryKeyword === previousDefault;

      return {
        ...current,
        locationIdentity: nextIdentity,
        seo: {
          ...current.seo,
          primaryKeyword: normalizePrimaryKeyword(shouldAutoKeyword ? nextDefault : current.seo.primaryKeyword),
        },
      };
    });
  };

  const renderTab = () => {
    if (activeTab === "Brief") {
      return (
        <div className="storiq-stack">
          <CompletionProgress project={project} />
          <LaunchReadinessPanel project={project} compact />
          <section className="storiq-card storiq-card--padding">
            <div className="storiq-card-header flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="storiq-section-title">Location Brief (NAP)</h2>
                <p className="storiq-section-subtitle">Name, address, market, and SEO metadata.</p>
              </div>
              <StatusBadge status={project.status} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <TextInput
                  label="Facility name"
                  value={project.locationIdentity.facilityName}
                  onChange={(value) => updateIdentity("facilityName", value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <TextInput
                  label="Address"
                  value={project.existingContent.address}
                  onChange={(address) => save((current) => ({ ...current, existingContent: { ...current.existingContent, address } }))}
                  required
                />
              </div>
              <CityStateInput
                city={project.locationIdentity.city}
                state={project.locationIdentity.state}
                onChange={updateCityState}
                required
                helpText="Enter as City, State — e.g. Orange, TX"
              />
              <TextInput label="ZIP code" value={project.locationIdentity.zipCode} onChange={(value) => updateIdentity("zipCode", value)} required />
              <div className="md:col-span-2">
                <TextInput
                  label="Storagely page URL"
                  value={project.locationIdentity.storagelyPageUrl}
                  onChange={(value) => updateIdentity("storagelyPageUrl", value)}
                  required
                  placeholder="https://www.mygarageselfstorage.com/"
                />
              </div>
              <TextInput
                label="Primary keyword"
                value={project.seo.primaryKeyword}
                onChange={(primaryKeyword) =>
                  save((current) => ({
                    ...current,
                    seo: { ...current.seo, primaryKeyword: normalizePrimaryKeyword(primaryKeyword) },
                  }))
                }
                required
                helpText="Stored and displayed in lowercase only."
              />
              <label className="block">
                <span className="storiq-label">Project status</span>
                <select className="storiq-select"
                  value={project.status}
                  onChange={(event) => save((current) => ({ ...current, status: event.target.value as ProjectStatus }))}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <TextInput
                label="Title tag"
                value={project.seo.titleTag}
                onChange={(titleTag) => save((current) => ({ ...current, seo: { ...current.seo, titleTag } }))}
                placeholder="Optional SEO title"
              />
              <div className="md:col-span-2">
                <TextArea
                  label="Meta description"
                  value={project.seo.metaDescription}
                  onChange={(metaDescription) => save((current) => ({ ...current, seo: { ...current.seo, metaDescription } }))}
                  placeholder="Optional meta description"
                />
              </div>
            </div>
          </section>
        </div>
      );
    }

    if (activeTab === "Content Inputs") {
      return (
        <div className="storiq-stack">
          <section className="storiq-card storiq-card--padding">
            <h2 className="storiq-section-title mb-5">Existing Location Content</h2>
            <ExistingContentParser
              content={project.existingContent}
              state={project.locationIdentity.state}
              onChange={(existingContent) => save((current) => ({ ...current, existingContent }))}
              showNapFields={false}
              showStorageTypes={false}
            />
          </section>
          <section className="storiq-card storiq-card--padding">
            <h2 className="storiq-section-title mb-5">Google Maps Embed</h2>
            <GoogleMapsEmbedInput project={project} onChange={(googleMaps) => save((current) => ({ ...current, googleMaps }))} />
          </section>
        </div>
      );
    }

    if (activeTab === "Images") {
      return (
        <div className="storiq-stack">
          <section className="storiq-card storiq-card--padding">
            <div className="mb-5">
              <h2 className="storiq-section-title">Storage Type Images</h2>
              <p className="storiq-section-subtitle">From master image library (storage_type). H3 links only when destination URL exists.</p>
            </div>
            <StorageTypeSelector
              selectedIds={project.selectedStorageImages}
              project={project}
              onChange={(selectedStorageImages) => save((current) => ({ ...current, selectedStorageImages }))}
            />
          </section>
          <section className="storiq-card storiq-card--padding">
            <div className="mb-5">
              <h2 className="storiq-section-title">Facility Location Images</h2>
              <p className="storiq-section-subtitle">Optional facility_location images from master data.</p>
            </div>
            <FacilityLocationImageSelector
              selectedIds={project.selectedFacilityLocationImages}
              onChange={(selectedFacilityLocationImages) => save((current) => ({ ...current, selectedFacilityLocationImages }))}
            />
          </section>
        </div>
      );
    }

    if (activeTab === "Nearby Locations") {
      return (
        <div className="storiq-stack">
          <section className="storiq-card storiq-card--padding">
            <div className="storiq-alert storiq-alert-warning mb-5">
              All Section 4 local landmarks must be within 10 miles / 16 km of the facility. This MVP marks distance checks as manual
              verification required.
            </div>
            <div className="storiq-stack gap-4">
              <ListTextarea
                label="Local references within 10 miles"
                value={mergeLocalReferences(project.localContext)}
                onChange={(lines) =>
                  save((current) => ({
                    ...current,
                    localContext: applyLocalReferences(current.localContext, lines),
                  }))
                }
                helpText="One item per line — landmarks, neighborhoods, lifestyle tie-ins, etc."
              />
              <ListTextarea
                label="Do-not-include notes"
                value={project.localContext.doNotInclude}
                onChange={(doNotInclude) => save((current) => ({ ...current, localContext: { ...current.localContext, doNotInclude } }))}
              />
            </div>
          </section>
          <section className="storiq-card storiq-card--padding">
            <h2 className="storiq-section-title mb-5">Nearby Facility Cards</h2>
            <NearbyLocationSelector
              project={project}
              facilities={facilities}
              selectedIds={project.selectedNearbyLocations}
              onChange={(selectedNearbyLocations) => save((current) => ({ ...current, selectedNearbyLocations }))}
            />
          </section>
        </div>
      );
    }

    if (activeTab === "SEO Audit") {
      return <AuditPanel project={project} />;
    }

    if (activeTab === "Content Output") {
      return <DraftGeneratorPanel project={project} />;
    }

    if (activeTab === "Launch Score") {
      return <LaunchReadinessPanel project={project} />;
    }

    if (activeTab === "HTML Preview") {
      return (
        <section className="storiq-card storiq-card--padding">
          <HtmlPreview html={exportHtmlForPublish(project.generated.html, settings)} />
        </section>
      );
    }

    return (
      <div className="storiq-stack">
        <ExportPanel project={project} />
        <PromptPreview prompt={project.generated.aiPrompt} />
      </div>
    );
  };

  return (
    <div className="storiq-stack">
      <section className="storiq-page-header">
        <div>
          <Link to="/" className="storiq-back-link">
            ← Back to dashboard
          </Link>
          <h1 className="storiq-page-title mt-2">{pageTitle}</h1>
          <p className="storiq-page-subtitle">
            {[project.locationIdentity.city, project.locationIdentity.state].filter(Boolean).join(", ") || "City and state missing"}
          </p>
        </div>
        <div className="storiq-toolbar">
          <button type="button" onClick={() => save((current) => current)} className="storiq-btn storiq-btn-ghost">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => {
              const copy = duplicateProject(project.id);
              if (copy) navigate(`/locations/${copy.id}`);
            }}
            className="storiq-btn storiq-btn-secondary"
          >
            <CopyPlus className="h-4 w-4" aria-hidden="true" />
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => {
              deleteProject(project.id);
              navigate("/");
            }}
            className="storiq-btn storiq-btn-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </section>

      <section className="storiq-card storiq-card--padding" style={{ padding: "0.75rem" }}>
        <div className="storiq-tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => selectTab(tab)}
              className={`storiq-tab${activeTab === tab ? " storiq-tab--active" : ""}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {renderTab()}
    </div>
  );
}
