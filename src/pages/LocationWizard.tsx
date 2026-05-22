import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CityStateInput from "../components/CityStateInput";
import CompletionProgress from "../components/CompletionProgress";
import ExistingContentParser from "../components/ExistingContentParser";
import FaqEditor from "../components/FaqEditor";
import { ListTextarea, TextInput } from "../components/FormControls";
import GoogleMapsEmbedInput from "../components/GoogleMapsEmbedInput";
import NearbyLocationSelector from "../components/NearbyLocationSelector";
import RequiredFieldBadge from "../components/RequiredFieldBadge";
import StorageTypeSelector from "../components/StorageTypeSelector";
import WizardStep from "../components/WizardStep";
import { generateDraftFaqs } from "../lib/draftGenerator";
import { saveDashboardSession } from "../lib/dashboardSession";
import { normalizePrimaryKeyword } from "../lib/keywordUtils";
import { enhanceProjectFromLibraries, matchNearbyIdsFromContent } from "../lib/projectEnhancements";
import { buildPrimaryKeyword, createLocationProject } from "../lib/projectDefaults";
import { getProjectValidation } from "../lib/validators";
import { useProjects } from "../state/ProjectsContext";
import type { LocationProject } from "../types/storiq";

const stepLabels = [
  "NAP",
  "Existing Location Content",
  "Storage Types",
  "Local Content",
  "Nearby Locations",
  "FAQs",
  "Google Map",
  "Review",
];

const STEP_COUNT = stepLabels.length;

export default function LocationWizard() {
  const { addProject, facilities, images, settings } = useProjects();
  const [project, setProject] = useState<LocationProject>(() => createLocationProject());
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const validation = useMemo(() => getProjectValidation(project, facilities, images), [project, facilities, images]);

  const updateProject = (updater: (current: LocationProject) => LocationProject) => {
    setProject((current) => updater(current));
  };

  const updateIdentity = (field: keyof LocationProject["locationIdentity"], value: string) => {
    updateProject((current) => {
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
    updateProject((current) => {
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

  useEffect(() => {
    if (step === 5 && project.generated.draftFaqs.length === 0) {
      setProject((current) => ({
        ...current,
        generated: {
          ...current.generated,
          draftFaqs: generateDraftFaqs(current, images),
        },
      }));
    }
  }, [step, images, project.generated.draftFaqs.length]);

  const saveDraft = () => {
    const withFaqs =
      project.generated.draftFaqs.length > 0
        ? project
        : {
            ...project,
            generated: {
              ...project.generated,
              draftFaqs: generateDraftFaqs(project, images),
            },
          };
    const saved = addProject(enhanceProjectFromLibraries(withFaqs, facilities, images));
    saveDashboardSession({
      lastProjectId: saved.id,
      lastWorkspaceTab: "Brief",
    });
    navigate(`/locations/${saved.id}`);
  };

  const renderStep = () => {
    if (step === 0) {
      return (
        <WizardStep
          title="Step 1: NAP"
          description="Name, address, and phone for this facility, plus market and Storagely page details."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <TextInput
                label="Facility name"
                value={project.locationIdentity.facilityName}
                onChange={(value) => updateIdentity("facilityName", value)}
                required
                placeholder="My Garage Self Storage | I-35"
              />
            </div>
            <div className="md:col-span-2">
              <TextInput
                label="Address"
                value={project.existingContent.address}
                onChange={(address) => setProject((current) => ({ ...current, existingContent: { ...current.existingContent, address } }))}
                required
              />
            </div>
            <TextInput
              label="Phone"
              value={project.existingContent.phone}
              onChange={(phone) => setProject((current) => ({ ...current, existingContent: { ...current.existingContent, phone } }))}
              required
              placeholder="+1 555 123 4567"
              helpText="International numbers with a leading + are supported."
            />
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
                placeholder="https://www.mygarageselfstorage.com/self-storage/tx/city/location/"
              />
            </div>
            <div className="md:col-span-2">
              <TextInput
                label="Primary keyword"
                value={project.seo.primaryKeyword}
                onChange={(primaryKeyword) =>
                  setProject((current) => ({
                    ...current,
                    seo: { ...current.seo, primaryKeyword: normalizePrimaryKeyword(primaryKeyword) },
                  }))
                }
                required
                helpText="Always lowercase. Defaults to: self storage units in {city}, {state}."
              />
            </div>
          </div>
        </WizardStep>
      );
    }

    if (step === 1) {
      return (
        <WizardStep
          title="Step 2: Existing Location Content"
          description="Paste the brief, then extract hours and Features & Amenities. Choose storage type cards in Step 3."
        >
          <ExistingContentParser
            content={project.existingContent}
            onChange={(existingContent) => setProject((current) => ({ ...current, existingContent }))}
            showNapFields={false}
            showStorageTypes={false}
            onExtracted={(existingContent) => {
              setProject((current) => {
                const nearbyIds = matchNearbyIdsFromContent(existingContent.rawContent, facilities, current);
                return {
                  ...current,
                  existingContent: {
                    ...existingContent,
                    address: existingContent.address || current.existingContent.address,
                    phone: existingContent.phone || current.existingContent.phone,
                  },
                  selectedNearbyLocations: nearbyIds.length > 0 ? nearbyIds : current.selectedNearbyLocations,
                };
              });
            }}
          />
        </WizardStep>
      );
    }

    if (step === 2) {
      return (
        <WizardStep title="Step 3: Storage Types" description="Select storage type image cards from the master library for this location page.">
          <StorageTypeSelector
            selectedIds={project.selectedStorageImages}
            onChange={(selectedStorageImages) => setProject((current) => ({ ...current, selectedStorageImages }))}
          />
        </WizardStep>
      );
    }

    if (step === 3) {
      return (
        <WizardStep title="Step 4: Local Content" description="Add local references without claiming distance verification is complete.">
          <div className="storiq-alert storiq-alert-warning mb-5">
            All local landmarks must be within 10 miles / 16 km of the facility. For this MVP, these checks are marked as needs manual
            verification.
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ListTextarea
              label="Landmarks within 10 miles"
              value={project.localContext.landmarks}
              onChange={(landmarks) => setProject((current) => ({ ...current, localContext: { ...current.localContext, landmarks } }))}
            />
            <ListTextarea
              label="Neighborhoods within 10 miles"
              value={project.localContext.neighborhoods}
              onChange={(neighborhoods) => setProject((current) => ({ ...current, localContext: { ...current.localContext, neighborhoods } }))}
            />
            <ListTextarea
              label="Lifestyle tie-ins within 10 miles"
              value={project.localContext.lifestyleTieIns}
              onChange={(lifestyleTieIns) => setProject((current) => ({ ...current, localContext: { ...current.localContext, lifestyleTieIns } }))}
            />
            <ListTextarea
              label="Do-not-include notes"
              value={project.localContext.doNotInclude}
              onChange={(doNotInclude) => setProject((current) => ({ ...current, localContext: { ...current.localContext, doNotInclude } }))}
            />
          </div>
        </WizardStep>
      );
    }

    if (step === 4) {
      return (
        <WizardStep title="Step 5: Nearby Locations" description="Pick 3–6 nearby locations with correct photos from the full library. Use search and scroll to see every eligible facility.">
          <NearbyLocationSelector
            project={project}
            facilities={facilities}
            selectedIds={project.selectedNearbyLocations}
            onChange={(selectedNearbyLocations) => setProject((current) => ({ ...current, selectedNearbyLocations }))}
          />
        </WizardStep>
      );
    }

    if (step === 5) {
      const faqs =
        project.generated.draftFaqs.length > 0 ? project.generated.draftFaqs : generateDraftFaqs(project, images);

      return (
        <WizardStep title="Step 6: FAQs" description="Review and edit FAQ questions and answers. Visible copy must match FAQPage JSON-LD on export.">
          <FaqEditor
            project={project}
            images={images}
            faqs={faqs}
            onChange={(draftFaqs) =>
              setProject((current) => ({
                ...current,
                generated: { ...current.generated, draftFaqs },
              }))
            }
          />
        </WizardStep>
      );
    }

    if (step === 6) {
      return (
        <WizardStep
          title="Step 7: Google Map"
          description="Preview the embedded map while you work. It fills from your NAP address, or paste an official Google embed to override."
        >
          <GoogleMapsEmbedInput project={project} onChange={(googleMaps) => setProject((current) => ({ ...current, googleMaps }))} />
        </WizardStep>
      );
    }

    return (
      <WizardStep title="Step 8: Review" description="Review hard fails, warnings, and save the draft into the workspace.">
        <div className="storiq-stack">
          <CompletionProgress project={project} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="storiq-card-inset p-4">
              <h2 className="storiq-section-title">Required Hard Fails</h2>
              <div className="mt-3 space-y-2">
                {validation.hardFails.length === 0 ? (
                  <p className="storiq-alert storiq-alert-success">No required fields are missing.</p>
                ) : (
                  validation.hardFails.map((issue) => (
                    <div key={issue.id} className="storiq-card flex items-center justify-between gap-3 p-3 text-sm" style={{ padding: "0.75rem 1rem" }}>
                      <span>{issue.message}</span>
                      <RequiredFieldBadge missing />
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="storiq-card-inset p-4">
              <h2 className="storiq-section-title">Warnings</h2>
              <div className="mt-3 space-y-2">
                {validation.warnings.length === 0 ? (
                  <p className="storiq-alert storiq-alert-success">No warnings.</p>
                ) : (
                  validation.warnings.map((issue) => (
                    <div key={issue.id} className="storiq-card p-3 text-sm" style={{ padding: "0.75rem 1rem", color: "var(--storiq-fg-secondary)" }}>
                      {issue.message}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </WizardStep>
    );
  };

  return (
    <div className="storiq-stack">
      <section className="storiq-page-header">
        <div>
          <h1 className="storiq-page-title">New Location Page</h1>
          <p className="storiq-page-subtitle">Guided intake for Storagely-ready location SEO pages.</p>
        </div>
      </section>

      <section className="storiq-card storiq-card--padding" style={{ padding: "1rem" }}>
        <div className="flex flex-wrap gap-2">
          {stepLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`storiq-wizard-step ${
                step === index ? "storiq-wizard-step--current" : index < step ? "storiq-wizard-step--done" : "storiq-wizard-step--pending"
              }`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </section>

      {renderStep()}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((current) => Math.max(0, current - 1))}
          disabled={step === 0}
          className="storiq-btn storiq-btn-secondary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back
        </button>
        <div className="storiq-toolbar">
          <button type="button" onClick={saveDraft} className="storiq-btn storiq-btn-ghost">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save Draft
          </button>
          {step < STEP_COUNT - 1 ? (
            <button type="button" onClick={() => setStep((current) => Math.min(STEP_COUNT - 1, current + 1))} className="storiq-btn storiq-btn-primary">
              Next
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            <button type="button" onClick={saveDraft} className="storiq-btn storiq-btn-primary">
              Create Location Workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
