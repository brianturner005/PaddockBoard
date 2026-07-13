"use client";

import { useState } from "react";
import {
  parse,
  readCsvHeaders,
  type CanonicalField,
  type ParsedRow,
  type ParseWarning,
  type ResultStatus,
} from "@paddockboard/parsers";
import { buttonClass, inputClass } from "./form-styles";
import { GenericCsvColumnMapper } from "./GenericCsvColumnMapper";
import { formatMs } from "@/lib/format";

const STATUS_OPTIONS: ResultStatus[] = ["finished", "dnf", "dns", "dsq", "unknown"];

function blankRow(): ParsedRow {
  return { position: null, driverName: "", status: "finished", rawRow: {} };
}

interface ClassOption {
  id: string;
  name: string;
}

export function SessionUploadPreview({
  sessionId,
  source,
  classes,
  publicSlug,
  initialStatus,
  clubId,
  initialColumnMapping,
}: {
  sessionId: string;
  source: "orbits_csv" | "orbits_html" | "generic_csv" | "manual";
  classes: ClassOption[];
  publicSlug: string;
  initialStatus: "draft" | "published";
  clubId: string;
  initialColumnMapping?: Record<string, string> | null;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [unrecognizedColumns, setUnrecognizedColumns] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "parsing" | "mapping" | "ready" | "error">(
    source === "manual" ? "ready" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, CanonicalField | "">>({});

  // Parallel to `rows` (same index), not part of ParsedRow -- the parser
  // package only knows a raw className hint from the file, matching that
  // hint to a real class record is an app-level concern.
  const [rowClassIds, setRowClassIds] = useState<string[]>([]);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const [sessionStatus, setSessionStatus] = useState(initialStatus);
  const [publishState, setPublishState] = useState<"idle" | "publishing" | "error">("idle");

  const hasUnknownStatus = rows.some((row) => row.status === "unknown");
  const hasMissingClass = classes.length > 0 && rowClassIds.some((id) => !id);

  function defaultClassIdFor(row: ParsedRow): string {
    if (row.className) {
      const match = classes.find((c) => c.name.toLowerCase() === row.className!.trim().toLowerCase());
      if (match) return match.id;
    }
    return classes[0]?.id ?? "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setPhase("uploading");

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch(`/api/sessions/${sessionId}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      setPhase("error");
      setError("Could not upload the file — nothing was stored. Try again.");
      return;
    }

    setPhase("parsing");
    try {
      const buffer = await file.arrayBuffer();

      if (source === "generic_csv") {
        const { headers } = readCsvHeaders(buffer);
        const prefilled: Record<string, CanonicalField | ""> = {};
        for (const header of headers) {
          const saved = initialColumnMapping?.[header];
          if (saved) prefilled[header] = saved as CanonicalField;
        }
        setFileBuffer(buffer);
        setCsvHeaders(headers);
        setColumnMapping(prefilled);
        setPhase("mapping");
        return;
      }

      const result = parse(buffer, source === "orbits_html" ? "orbits_html" : "orbits_csv");
      setRows(result.rows);
      setRowClassIds(result.rows.map(defaultClassIdFor));
      setWarnings(result.warnings);
      setUnrecognizedColumns(result.unrecognizedColumns);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Could not read this file.");
    }
  }

  function handleMappingChange(header: string, field: CanonicalField | "") {
    setColumnMapping((prev) => ({ ...prev, [header]: field }));
  }

  function handleApplyMapping() {
    if (!fileBuffer) return;

    const mapping: Record<string, CanonicalField> = {};
    for (const [header, field] of Object.entries(columnMapping)) {
      if (field) mapping[header] = field;
    }

    try {
      const result = parse(fileBuffer, "generic_csv", { columnMapping: mapping });
      setRows(result.rows);
      setRowClassIds(result.rows.map(defaultClassIdFor));
      setWarnings(result.warnings);
      setUnrecognizedColumns(result.unrecognizedColumns);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Could not read this file.");
      return;
    }

    fetch(`/api/clubs/${clubId}/csv-mapping`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnMapping: mapping }),
    }).catch(() => {});
  }

  function updateRow(index: number, patch: Partial<ParsedRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function updateRowClass(index: number, classIdValue: string) {
    setRowClassIds((prev) => prev.map((id, i) => (i === index ? classIdValue : id)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
    setRowClassIds((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaveState("saving");
    setSaveError(null);

    const res = await fetch(`/api/sessions/${sessionId}/rows`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map((row, i) => ({
          position: row.position,
          driverName: row.driverName,
          driverNumber: row.driverNumber,
          laps: row.laps,
          bestLapMs: row.bestLapMs,
          totalTimeMs: row.totalTimeMs,
          gapMs: row.gapMs,
          status: row.status,
          classId: rowClassIds[i],
        })),
      }),
    });

    if (!res.ok) {
      setSaveState("error");
      setSaveError("Could not save results. Check the rows and try again.");
      return;
    }

    setSaveState("saved");
  }

  async function handlePublish() {
    setPublishState("publishing");
    const res = await fetch(`/api/sessions/${sessionId}/publish`, { method: "POST" });
    if (!res.ok) {
      setPublishState("error");
      return;
    }
    setPublishState("idle");
    setSessionStatus("published");
  }

  return (
    <div className="flex flex-col gap-6">
      {(source === "orbits_csv" || source === "orbits_html" || source === "generic_csv") && (
        <div>
          <label className="flex flex-col gap-1 text-sm">
            {source === "orbits_csv"
              ? "Upload Orbits CSV export"
              : source === "orbits_html"
                ? "Upload Orbits HTML export"
                : "Upload CSV export"}
            <input
              type="file"
              accept={source === "orbits_html" ? ".html,.htm,text/html" : ".csv,text/csv"}
              onChange={handleFileChange}
            />
          </label>
          {phase === "uploading" && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Uploading…</p>
          )}
          {phase === "parsing" && (
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Reading file…</p>
          )}
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
      )}

      {phase === "mapping" && (
        <GenericCsvColumnMapper
          headers={csvHeaders}
          mapping={columnMapping}
          onChange={handleMappingChange}
          onApply={handleApplyMapping}
        />
      )}

      {warnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
          <p className="font-medium">
            {warnings.length} thing{warnings.length === 1 ? "" : "s"} to check
          </p>
          <ul className="mt-1 list-disc pl-5">
            {warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
        </div>
      )}

      {unrecognizedColumns.length > 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Unrecognized columns (ignored): {unrecognizedColumns.join(", ")}
        </p>
      )}

      {phase === "ready" && (
        <div>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
                  <th className="py-1.5 pr-2 pl-3">Pos</th>
                  <th className="py-1.5 pr-2">Driver</th>
                  <th className="py-1.5 pr-2">#</th>
                  <th className="py-1.5 pr-2">Laps</th>
                  <th className="py-1.5 pr-2">Total time</th>
                  <th className="py-1.5 pr-2">Best lap</th>
                  <th className="py-1.5 pr-2">Status</th>
                  <th className="py-1.5 pr-2">Class</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60">
                    <td className="py-1 pr-2 pl-3">
                      <input
                        type="number"
                        value={row.position ?? ""}
                        onChange={(e) =>
                          updateRow(index, {
                            position: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        className={`w-14 ${inputClass}`}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={row.driverName}
                        onChange={(e) => updateRow(index, { driverName: e.target.value })}
                        className={`w-40 ${inputClass}`}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={row.driverNumber ?? ""}
                        onChange={(e) =>
                          updateRow(index, { driverNumber: e.target.value || undefined })
                        }
                        className={`w-16 ${inputClass}`}
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        value={row.laps ?? ""}
                        onChange={(e) =>
                          updateRow(index, {
                            laps: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        className={`w-16 ${inputClass}`}
                      />
                    </td>
                    <td className="py-1 pr-2 text-zinc-600 dark:text-zinc-400">
                      {formatMs(row.totalTimeMs)}
                    </td>
                    <td className="py-1 pr-2 text-zinc-600 dark:text-zinc-400">
                      {formatMs(row.bestLapMs)}
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        value={row.status}
                        onChange={(e) =>
                          updateRow(index, { status: e.target.value as ResultStatus })
                        }
                        className={inputClass}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1 pr-2">
                      <select
                        value={rowClassIds[index] ?? ""}
                        onChange={(e) => updateRowClass(index, e.target.value)}
                        className={inputClass}
                      >
                        {classes.length === 0 && <option value="">No classes yet</option>}
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="text-sm text-red-600 underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() => {
              setRows((prev) => [...prev, blankRow()]);
              setRowClassIds((prev) => [...prev, classes[0]?.id ?? ""]);
            }}
            className={`mt-3 ${buttonClass}`}
          >
            + Add row manually
          </button>

          <div className="mt-6 flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            {classes.length === 0 && (
              <p className="text-sm text-red-600">
                This season has no classes yet — create one before saving results.
              </p>
            )}

            {hasUnknownStatus && (
              <p className="text-sm text-red-600">
                Some rows have an &ldquo;unknown&rdquo; status — resolve them before saving.
              </p>
            )}

            {hasMissingClass && (
              <p className="text-sm text-red-600">
                Some rows have no class assigned — pick one for each row before saving.
              </p>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={
                  saveState === "saving" ||
                  rows.length === 0 ||
                  classes.length === 0 ||
                  hasUnknownStatus ||
                  hasMissingClass
                }
                className={buttonClass}
              >
                {saveState === "saving" ? "Saving…" : "Save results"}
              </button>
              {saveState === "saved" && (
                <span className="text-sm text-green-700 dark:text-green-400">Saved.</span>
              )}
              {saveState === "error" && <span className="text-sm text-red-600">{saveError}</span>}
            </div>

            {saveState === "saved" && sessionStatus === "draft" && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishState === "publishing"}
                  className={buttonClass}
                >
                  {publishState === "publishing" ? "Publishing…" : "Publish session"}
                </button>
                {publishState === "error" && (
                  <span className="text-sm text-red-600">Could not publish. Try again.</span>
                )}
              </div>
            )}

            {sessionStatus === "published" && (
              <p className="text-sm text-green-700 dark:text-green-400">
                Published — public page at{" "}
                <a href={`/r/${publicSlug}`} className="underline" target="_blank" rel="noopener noreferrer">
                  /r/{publicSlug}
                </a>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
