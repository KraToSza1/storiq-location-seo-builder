import { AlertTriangle, Database, Download, FileUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import GoogleSheetsImport from "../components/GoogleSheetsImport";
import { TextInput } from "../components/FormControls";
import { facilityCsvTemplate, facilityWarnings, normalizeFacility } from "../lib/facilityLibrary";
import { createId } from "../lib/projectDefaults";
import { imageCsvTemplate, imageWarnings, normalizeImage } from "../lib/imageLibrary";
import { useProjects } from "../state/ProjectsContext";
import type { NearbyFacility, StorageImage, StorageImageType } from "../types/storiq";

const emptyFacility = (): NearbyFacility => ({
  id: createId(),
  facilityName: "",
  city: "",
  state: "",
  address: "",
  zipCode: "",
  storagelyUrl: "",
});

const emptyImage = (): StorageImage => ({
  id: createId(),
  category: "",
  imageUrl: "",
  altText: "",
  type: "storage_type",
});

export default function MasterDataPage() {
  const {
    facilities,
    images,
    importFacilitiesCsv,
    saveFacility,
    deleteFacility,
    resetFacilities,
    exportFacilitiesJson,
    importImagesCsv,
    saveImage,
    deleteImage,
    resetImages,
    exportImagesJson,
  } = useProjects();

  const facilityFileRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const [facilityMsg, setFacilityMsg] = useState("");
  const [imageMsg, setImageMsg] = useState("");
  const [editingFacility, setEditingFacility] = useState<NearbyFacility | null>(null);
  const [editingImage, setEditingImage] = useState<StorageImage | null>(null);

  const facilityWarns = facilityWarnings(facilities);
  const imageWarns = imageWarnings(images);

  const downloadBlob = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const saveFacilityForm = () => {
    if (!editingFacility) return;
    const normalized = normalizeFacility(editingFacility);
    if (!normalized) {
      setFacilityMsg("Facility name, city, state, address, and Storagely URL are required.");
      return;
    }
    const result = saveFacility(normalized);
    setFacilityMsg(result.error || `Saved ${normalized.facilityName}.`);
    setEditingFacility(null);
  };

  const saveImageForm = () => {
    if (!editingImage) return;
    const normalized = normalizeImage(editingImage);
    if (!normalized) {
      setImageMsg("Category and image URL are required.");
      return;
    }
    saveImage(normalized);
    setImageMsg(`Saved ${normalized.category}.`);
    setEditingImage(null);
  };

  return (
    <div className="storiq-stack">
      <section className="storiq-page-header">
        <div className="flex items-center gap-3">
          <span className="storiq-icon-well">
            <Database className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="storiq-page-title">Master Data</h1>
            <p className="storiq-page-subtitle">
              Approved facility and image libraries used by every location project. Replace starter sample data before client demos.
            </p>
          </div>
        </div>
      </section>

      <section className="storiq-card storiq-card--padding">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="storiq-section-title">Facility Library</h2>
            <p className="storiq-section-subtitle">{facilities.length} facilities · duplicate URLs and IDs prevented on save</p>
          </div>
          <div className="storiq-toolbar">
            <button type="button" onClick={() => setEditingFacility(emptyFacility())} className="storiq-btn storiq-btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Facility
            </button>
            <button type="button" onClick={() => downloadBlob("storiq-facilities-template.csv", facilityCsvTemplate, "text/csv")} className="storiq-btn storiq-btn-secondary">
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV Template
            </button>
            <button type="button" onClick={() => facilityFileRef.current?.click()} className="storiq-btn storiq-btn-secondary">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Import CSV
            </button>
            <button type="button" onClick={() => downloadBlob("storiq-facilities.json", exportFacilitiesJson(), "application/json")} className="storiq-btn storiq-btn-secondary">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export JSON
            </button>
            <button type="button" onClick={() => { resetFacilities(); setFacilityMsg("Reset to starter sample facilities."); }} className="storiq-btn storiq-btn-secondary">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          </div>
          <input ref={facilityFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const result = importFacilitiesCsv(String(reader.result ?? ""));
              setFacilityMsg(`Imported ${result.imported}, skipped ${result.skipped}. ${result.errors.slice(0, 2).join(" ")}`);
            };
            reader.readAsText(file);
          }} />
        </div>

        {facilityMsg ? <div className="storiq-alert storiq-alert-info mt-4">{facilityMsg}</div> : null}
        {facilityWarns.map((warning) => (
          <div key={warning} className="storiq-alert storiq-alert-warning mt-3 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {warning}
          </div>
        ))}

        <GoogleSheetsImport
          scope="facilities"
          label="Facility Library"
          onMessage={setFacilityMsg}
          onImportCsv={(csv) => {
            const result = importFacilitiesCsv(csv);
            setFacilityMsg(`Imported ${result.imported}, skipped ${result.skipped}. ${result.errors.slice(0, 2).join(" ")}`);
          }}
        />

        {editingFacility ? (
          <div className="storiq-form-panel mt-5 grid gap-3 md:grid-cols-2">
            <TextInput label="Facility name" value={editingFacility.facilityName} onChange={(v) => setEditingFacility((c) => c && { ...c, facilityName: v })} required />
            <TextInput label="City" value={editingFacility.city} onChange={(v) => setEditingFacility((c) => c && { ...c, city: v })} required />
            <TextInput label="State" value={editingFacility.state} onChange={(v) => setEditingFacility((c) => c && { ...c, state: v })} required />
            <TextInput label="ZIP" value={editingFacility.zipCode} onChange={(v) => setEditingFacility((c) => c && { ...c, zipCode: v })} />
            <div className="md:col-span-2">
              <TextInput label="Address" value={editingFacility.address} onChange={(v) => setEditingFacility((c) => c && { ...c, address: v })} required />
            </div>
            <div className="md:col-span-2">
              <TextInput label="Storagely URL" value={editingFacility.storagelyUrl} onChange={(v) => setEditingFacility((c) => c && { ...c, storagelyUrl: v })} required />
            </div>
            <TextInput label="Phone (optional)" value={editingFacility.phone || ""} onChange={(v) => setEditingFacility((c) => c && { ...c, phone: v })} />
            <TextInput label="Image URL (optional)" value={editingFacility.imageUrl || ""} onChange={(v) => setEditingFacility((c) => c && { ...c, imageUrl: v })} />
            <div className="storiq-toolbar md:col-span-2">
              <button type="button" onClick={saveFacilityForm} className="storiq-btn storiq-btn-primary">Save Facility</button>
              <button type="button" onClick={() => setEditingFacility(null)} className="storiq-btn storiq-btn-secondary">Cancel</button>
            </div>
          </div>
        ) : null}

        <div className="storiq-table-wrap storiq-scrollbar mt-5 max-h-96 overflow-auto">
          <table className="storiq-table">
            <thead>
              <tr>
                <th>Facility</th>
                <th>Market</th>
                <th>URL / Image</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((facility) => (
                <tr key={facility.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{facility.facilityName}</div>
                    <div className="storiq-help">{facility.address}</div>
                  </td>
                  <td>
                    {facility.city}, {facility.state} {facility.zipCode}
                  </td>
                  <td>
                    <div className="storiq-link truncate text-xs">{facility.storagelyUrl}</div>
                    {!facility.imageUrl ? <span className="storiq-badge storiq-badge-warning mt-1">Missing image</span> : null}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button type="button" onClick={() => setEditingFacility(facility)} className="storiq-link mr-2 text-xs">
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteFacility(facility.id)} className="storiq-btn storiq-btn-danger storiq-btn-icon" aria-label={`Delete ${facility.facilityName}`}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="storiq-card storiq-card--padding">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="storiq-section-title">Image Library</h2>
            <p className="storiq-section-subtitle">
              {images.length} images · Vehicle, Business, and Climate-Controlled may include destination URLs
            </p>
          </div>
          <div className="storiq-toolbar">
            <button type="button" onClick={() => setEditingImage(emptyImage())} className="storiq-btn storiq-btn-primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Image
            </button>
            <button type="button" onClick={() => downloadBlob("storiq-images-template.csv", imageCsvTemplate, "text/csv")} className="storiq-btn storiq-btn-secondary">
              <Download className="h-4 w-4" aria-hidden="true" />
              CSV Template
            </button>
            <button type="button" onClick={() => imageFileRef.current?.click()} className="storiq-btn storiq-btn-secondary">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Import CSV
            </button>
            <button type="button" onClick={() => downloadBlob("storiq-images.json", exportImagesJson(), "application/json")} className="storiq-btn storiq-btn-secondary">
              <Download className="h-4 w-4" aria-hidden="true" />
              Export JSON
            </button>
            <button type="button" onClick={() => { resetImages(); setImageMsg("Reset to starter image library."); }} className="storiq-btn storiq-btn-secondary">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          </div>
          <input ref={imageFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              const result = importImagesCsv(String(reader.result ?? ""));
              setImageMsg(`Imported ${result.imported}, skipped ${result.skipped}.`);
            };
            reader.readAsText(file);
          }} />
        </div>

        {imageMsg ? <div className="storiq-alert storiq-alert-info mt-4">{imageMsg}</div> : null}
        {imageWarns.map((warning) => (
          <div key={warning} className="storiq-alert storiq-alert-warning mt-3 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {warning}
          </div>
        ))}

        <GoogleSheetsImport
          scope="images"
          label="Image Library"
          onMessage={setImageMsg}
          onImportCsv={(csv) => {
            const result = importImagesCsv(csv);
            setImageMsg(`Imported ${result.imported}, skipped ${result.skipped}. ${result.errors.slice(0, 2).join(" ")}`);
          }}
        />

        {editingImage ? (
          <div className="storiq-form-panel mt-5 grid gap-3 md:grid-cols-2">
            <TextInput label="Category" value={editingImage.category} onChange={(v) => setEditingImage((c) => c && { ...c, category: v })} required />
            <label className="block">
              <span className="storiq-label">Type</span>
              <select className="storiq-select" value={editingImage.type} onChange={(e) => setEditingImage((c) => c && { ...c, type: e.target.value as StorageImageType })}>
                <option value="storage_type">storage_type</option>
                <option value="facility_location">facility_location</option>
              </select>
            </label>
            <div className="md:col-span-2">
              <TextInput label="Image URL" value={editingImage.imageUrl} onChange={(v) => setEditingImage((c) => c && { ...c, imageUrl: v })} required />
            </div>
            <div className="md:col-span-2">
              <TextInput label="Destination URL (optional)" value={editingImage.destinationUrl || ""} onChange={(v) => setEditingImage((c) => c && { ...c, destinationUrl: v })} helpText="Linkable for Vehicle, Business, Climate-Controlled storage types." />
            </div>
            <div className="md:col-span-2">
              <TextInput label="Alt text" value={editingImage.altText} onChange={(v) => setEditingImage((c) => c && { ...c, altText: v })} />
            </div>
            <div className="storiq-toolbar md:col-span-2">
              <button type="button" onClick={saveImageForm} className="storiq-btn storiq-btn-primary">Save Image</button>
              <button type="button" onClick={() => setEditingImage(null)} className="storiq-btn storiq-btn-secondary">Cancel</button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image) => (
            <article key={image.id} className="storiq-card-inset p-3">
              <img src={image.imageUrl} alt={image.altText} className="mb-3 h-24 w-full rounded object-cover" loading="lazy" />
              <div className="font-semibold" style={{ color: "var(--storiq-fg)" }}>{image.category}</div>
              <div className="storiq-help">{image.type}</div>
              <div className="storiq-help truncate">{image.destinationUrl || "No destination URL"}</div>
              {!image.altText ? <div className="storiq-badge storiq-badge-warning mt-1">Missing alt text</div> : null}
              <div className="storiq-toolbar mt-3">
                <button type="button" onClick={() => setEditingImage(image)} className="storiq-link text-xs">Edit</button>
                <button type="button" onClick={() => deleteImage(image.id)} className="storiq-link text-xs" style={{ color: "var(--storiq-danger)" }}>Delete</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
