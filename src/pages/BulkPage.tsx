import { CheckCircle2, Download, FileUp, Layers, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import GoogleSheetsImport from "../components/GoogleSheetsImport";
import { bulkCsvTemplate, bulkRowToProject, parseBulkCsv } from "../lib/bulkImport";
import { findNextIncompleteProject } from "../lib/projectQueue";
import { useProjects } from "../state/ProjectsContext";

const downloadBlob = (filename: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export default function BulkPage() {
  const { addProject, settings, facilities, images, projects } = useProjects();
  const fileRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [rows, setRows] = useState<ReturnType<typeof parseBulkCsv>["rows"]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [createdIds, setCreatedIds] = useState<string[]>([]);

  const validRows = rows.filter((row) => row.valid);
  const invalidRows = rows.filter((row) => !row.valid);

  const applyCsv = (csv: string, sourceLabel = "CSV") => {
    const parsed = parseBulkCsv(csv);
    setRows(parsed.rows);
    setMissingColumns(parsed.missingColumns);
    setMessage(
      parsed.missingColumns.length > 0
        ? `${sourceLabel}: missing columns ${parsed.missingColumns.join(", ")}`
        : `${sourceLabel}: parsed ${parsed.rows.length} row(s). ${parsed.rows.filter((r) => r.valid).length} valid.`,
    );
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => applyCsv(String(reader.result ?? ""), "File upload");
    reader.readAsText(file);
  };

  const createDrafts = () => {
    const ids: string[] = [];
    validRows.forEach((row) => {
      const saved = addProject(bulkRowToProject(row, settings, facilities, images));
      ids.push(saved.id);
    });
    setCreatedIds(ids);
    setMessage(
      `Created ${validRows.length} draft project(s) with auto map, nearby, and storage suggestions when libraries are loaded.`,
    );
  };

  const openFirstCreated = () => {
    if (createdIds[0]) {
      navigate(`/locations/${createdIds[0]}`);
      return;
    }
    const next = findNextIncompleteProject(projects, facilities, images);
    navigate(next ? `/locations/${next.id}` : "/");
  };

  return (
    <div className="storiq-stack">
      <section className="storiq-page-header">
        <div className="flex items-center gap-3">
          <span className="storiq-icon-well">
            <Layers className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="storiq-page-title">Bulk Builder</h1>
            <p className="storiq-page-subtitle">
              Upload CSV or Google Sheets to create draft projects. Each row auto-fills map embed, nearby picks, and storage types when master data is loaded.
            </p>
          </div>
        </div>
      </section>

      <section className="storiq-card storiq-card--padding">
        <h2 className="storiq-section-title">Required CSV columns</h2>
        <p className="storiq-section-subtitle mt-2">
          <code className="storiq-code px-2 py-0.5" style={{ display: "inline" }}>city, state, zipCode, facilityName, storagelyPageUrl</code>
          {" "}— optional:{" "}
          <code className="storiq-code px-2 py-0.5" style={{ display: "inline" }}>primaryKeyword, address, phone, rawContent</code>
        </p>
        <div className="storiq-toolbar mt-4">
          <button type="button" onClick={() => downloadBlob("storiq-bulk-locations-template.csv", bulkCsvTemplate, "text/csv")} className="storiq-btn storiq-btn-secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download CSV template
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className="storiq-btn storiq-btn-primary">
            <FileUp className="h-4 w-4" aria-hidden="true" />
            Upload CSV
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
        {message ? <div className="storiq-alert storiq-alert-info mt-4">{message}</div> : null}
        {createdIds.length > 0 ? (
          <button type="button" onClick={openFirstCreated} className="storiq-btn storiq-btn-secondary mt-3">
            Open first created project →
          </button>
        ) : null}

        <GoogleSheetsImport
          scope="bulk"
          label="Bulk location intake"
          onMessage={setMessage}
          onImportCsv={(csv) => applyCsv(csv, "Google Sheets")}
        />
      </section>

      {missingColumns.length > 0 ? (
        <section className="storiq-alert storiq-alert-danger">Cannot parse CSV until required columns are present: {missingColumns.join(", ")}.</section>
      ) : null}

      {rows.length > 0 ? (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            <article className="storiq-tile storiq-tile--pass p-5">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                {validRows.length} valid row(s)
              </div>
            </article>
            <article className="storiq-tile storiq-tile--fail p-5">
              <div className="flex items-center gap-2 font-semibold">
                <XCircle className="h-5 w-5" aria-hidden="true" />
                {invalidRows.length} invalid row(s)
              </div>
            </article>
          </section>

          <section className="storiq-card storiq-card--padding">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="storiq-section-title">Preview</h2>
              <button type="button" disabled={validRows.length === 0} onClick={createDrafts} className="storiq-btn storiq-btn-primary">
                Create {validRows.length} Draft Project{validRows.length === 1 ? "" : "s"}
              </button>
            </div>
            <div className="storiq-table-wrap storiq-scrollbar max-h-96 overflow-auto">
              <table className="storiq-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Facility</th>
                    <th>Market</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowNumber} style={row.valid ? undefined : { background: "var(--storiq-danger-bg)" }}>
                      <td>{row.rowNumber}</td>
                      <td style={{ fontWeight: 600 }}>{row.facilityName || "—"}</td>
                      <td>
                        {row.city}, {row.state} {row.zipCode}
                      </td>
                      <td>
                        {row.valid ? (
                          <span className="storiq-badge storiq-badge-pass">Valid</span>
                        ) : (
                          <span style={{ color: "var(--storiq-danger)" }}>{row.errors.join("; ")}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <section className="storiq-empty">
          <p className="storiq-empty-text">Upload a CSV to preview bulk location intake.</p>
          <Link to="/master-data" className="storiq-link mt-4 inline-block">
            Import master facility and image data first →
          </Link>
        </section>
      )}
    </div>
  );
}
