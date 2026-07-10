"use client";

import { useState } from "react";
import { parse, type ParsedRow, type ParseWarning, type ResultStatus } from "@paddockboard/parsers";
import { buttonClass, inputClass } from "./form-styles";

const STATUS_OPTIONS: ResultStatus[] = ["finished", "dnf", "dns", "dsq", "unknown"];

function formatMs(ms: number | undefined): string {
  if (ms === undefined) return "—";
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toFixed(3);
  return minutes > 0 ? `${minutes}:${seconds.padStart(6, "0")}` : seconds;
}

function blankRow(): ParsedRow {
  return { position: null, driverName: "", status: "finished", rawRow: {} };
}

export function SessionUploadPreview({
  sessionId,
  source,
}: {
  sessionId: string;
  source: "orbits_csv" | "manual";
}) {
  const [rows, setRows] = useState<ParsedRow[]>(source === "manual" ? [] : []);
  const [warnings, setWarnings] = useState<ParseWarning[]>([]);
  const [unrecognizedColumns, setUnrecognizedColumns] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "uploading" | "parsing" | "ready" | "error">(
    source === "manual" ? "ready" : "idle"
  );
  const [error, setError] = useState<string | null>(null);

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
      const result = parse(buffer, "orbits_csv");
      setRows(result.rows);
      setWarnings(result.warnings);
      setUnrecognizedColumns(result.unrecognizedColumns);
      setPhase("ready");
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Could not read this file.");
    }
  }

  function updateRow(index: number, patch: Partial<ParsedRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-6">
      {source === "orbits_csv" && (
        <div>
          <label className="flex flex-col gap-1 text-sm">
            Upload Orbits CSV export
            <input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-300 dark:border-zinc-700">
                  <th className="py-1 pr-2">Pos</th>
                  <th className="py-1 pr-2">Driver</th>
                  <th className="py-1 pr-2">#</th>
                  <th className="py-1 pr-2">Laps</th>
                  <th className="py-1 pr-2">Total time</th>
                  <th className="py-1 pr-2">Best lap</th>
                  <th className="py-1 pr-2">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-b border-zinc-200 dark:border-zinc-800">
                    <td className="py-1 pr-2">
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
            onClick={() => setRows((prev) => [...prev, blankRow()])}
            className={`mt-3 ${buttonClass}`}
          >
            + Add row manually
          </button>
        </div>
      )}
    </div>
  );
}
