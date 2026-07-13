"use client";

import { Fragment, useEffect, useState } from "react";
import { buttonClass, inputClass, labelClass } from "./form-styles";

interface Penalty {
  description: string;
  pointsDelta: number;
}

interface ResultRow {
  id: string;
  driverId: string;
  driverName: string;
  driverNumber: string | null;
  classId: string;
  position: number | null;
  status: "finished" | "dnf" | "dns" | "dsq";
  laps: number | null;
  bestLapMs: number | null;
  totalTimeMs: number | null;
  gapMs: number | null;
  pointsOverride: number | null;
  penalties: Penalty[];
}

interface ResultEditEntry {
  id: string;
  reason: string;
  createdAt: string;
}

const STATUS_OPTIONS = ["finished", "dnf", "dns", "dsq"] as const;

function rowsDiffer(a: ResultRow, b: ResultRow): boolean {
  return (
    a.position !== b.position ||
    a.status !== b.status ||
    a.laps !== b.laps ||
    a.bestLapMs !== b.bestLapMs ||
    a.totalTimeMs !== b.totalTimeMs ||
    a.gapMs !== b.gapMs ||
    a.pointsOverride !== b.pointsOverride ||
    JSON.stringify(a.penalties) !== JSON.stringify(b.penalties)
  );
}

export function PublishedResultsEditor({ sessionId }: { sessionId: string }) {
  const [rows, setRows] = useState<ResultRow[] | null>(null);
  const [originalRows, setOriginalRows] = useState<ResultRow[]>([]);
  const [reason, setReason] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [history, setHistory] = useState<ResultEditEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [penaltiesFor, setPenaltiesFor] = useState<string | null>(null);
  const [penaltyDraft, setPenaltyDraft] = useState({ description: "", pointsDelta: "" });

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}`)
      .then((res) => res.json())
      .then((data: { results: ResultRow[] }) => {
        setRows(data.results);
        setOriginalRows(data.results);
      });
  }, [sessionId]);

  function updateRow(id: string, patch: Partial<ResultRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
  }

  async function handleSave() {
    if (!rows || !reason.trim()) return;

    const changedRows = rows.filter((row) => {
      const original = originalRows.find((o) => o.id === row.id);
      return original ? rowsDiffer(row, original) : false;
    });
    if (changedRows.length === 0) return;

    setSaveState("saving");
    try {
      for (const row of changedRows) {
        const res = await fetch(`/api/results/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position: row.position,
            status: row.status,
            laps: row.laps,
            bestLapMs: row.bestLapMs,
            totalTimeMs: row.totalTimeMs,
            gapMs: row.gapMs,
            pointsOverride: row.pointsOverride,
            penalties: row.penalties,
            reason,
          }),
        });
        if (!res.ok) throw new Error("save failed");
      }
      setOriginalRows(rows);
      setReason("");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  async function toggleHistory(resultId: string) {
    if (historyFor === resultId) {
      setHistoryFor(null);
      return;
    }
    setHistoryFor(resultId);
    setHistoryLoading(true);
    const res = await fetch(`/api/results/${resultId}/edits`);
    const data = await res.json();
    setHistory(data.edits ?? []);
    setHistoryLoading(false);
  }

  function togglePenalties(resultId: string) {
    setPenaltyDraft({ description: "", pointsDelta: "" });
    setPenaltiesFor((prev) => (prev === resultId ? null : resultId));
  }

  function addPenalty(row: ResultRow) {
    const description = penaltyDraft.description.trim();
    const rawPoints = penaltyDraft.pointsDelta.trim();
    const pointsDelta = Number(rawPoints);
    if (!description || !rawPoints || !Number.isInteger(pointsDelta)) return;
    updateRow(row.id, { penalties: [...row.penalties, { description, pointsDelta }] });
    setPenaltyDraft({ description: "", pointsDelta: "" });
  }

  function removePenalty(row: ResultRow, index: number) {
    updateRow(row.id, { penalties: row.penalties.filter((_, i) => i !== index) });
  }

  if (!rows) {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading results…</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-300 dark:border-zinc-700">
              <th className="py-1 pr-2">Pos</th>
              <th className="py-1 pr-2">Driver</th>
              <th className="py-1 pr-2">Status</th>
              <th className="py-1 pr-2">Laps</th>
              <th className="py-1 pr-2">Points override</th>
              <th className="py-1 pr-2">Penalties</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <Fragment key={row.id}>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      value={row.position ?? ""}
                      onChange={(e) =>
                        updateRow(row.id, { position: e.target.value ? Number(e.target.value) : null })
                      }
                      className={`w-14 ${inputClass}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    {row.driverName}
                    {row.driverNumber ? ` #${row.driverNumber}` : ""}
                  </td>
                  <td className="py-1 pr-2">
                    <select
                      value={row.status}
                      onChange={(e) => updateRow(row.id, { status: e.target.value as ResultRow["status"] })}
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
                    <input
                      type="number"
                      value={row.laps ?? ""}
                      onChange={(e) => updateRow(row.id, { laps: e.target.value ? Number(e.target.value) : null })}
                      className={`w-16 ${inputClass}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      type="number"
                      value={row.pointsOverride ?? ""}
                      onChange={(e) =>
                        updateRow(row.id, {
                          pointsOverride: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className={`w-20 ${inputClass}`}
                    />
                  </td>
                  <td className="py-1 pr-2">
                    <button type="button" onClick={() => togglePenalties(row.id)} className="text-sm underline">
                      {row.penalties.length > 0 ? `${row.penalties.length} penalty` : "Add"}
                      {row.penalties.length > 1 ? "s" : ""}
                    </button>
                  </td>
                  <td className="py-1">
                    <button type="button" onClick={() => toggleHistory(row.id)} className="text-sm underline">
                      History
                    </button>
                  </td>
                </tr>
                {penaltiesFor === row.id && (
                  <tr>
                    <td colSpan={7} className="bg-zinc-50 px-2 py-3 text-xs dark:bg-zinc-900">
                      {row.penalties.length > 0 && (
                        <ul className="mb-2 flex flex-col gap-1">
                          {row.penalties.map((p, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="text-red-600 dark:text-red-400">{p.pointsDelta} pts</span>
                              <span>{p.description}</span>
                              <button
                                type="button"
                                onClick={() => removePenalty(row, i)}
                                className="text-red-600 underline"
                              >
                                Remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          placeholder="Reason (e.g. avoidable contact T3)"
                          value={penaltyDraft.description}
                          onChange={(e) =>
                            setPenaltyDraft((prev) => ({ ...prev, description: e.target.value }))
                          }
                          className={`w-56 ${inputClass}`}
                        />
                        <input
                          type="number"
                          placeholder="Points"
                          value={penaltyDraft.pointsDelta}
                          onChange={(e) =>
                            setPenaltyDraft((prev) => ({ ...prev, pointsDelta: e.target.value }))
                          }
                          className={`w-24 ${inputClass}`}
                        />
                        <button type="button" onClick={() => addPenalty(row)} className={buttonClass}>
                          Add penalty
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {historyFor === row.id && (
                  <tr>
                    <td colSpan={7} className="bg-zinc-50 px-2 py-2 text-xs dark:bg-zinc-900">
                      {historyLoading ? (
                        "Loading…"
                      ) : history.length === 0 ? (
                        "No edits yet."
                      ) : (
                        <ul className="flex flex-col gap-1">
                          {history.map((edit) => (
                            <li key={edit.id}>
                              {new Date(edit.createdAt).toLocaleString()} — {edit.reason}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <label className={labelClass}>
        Reason for changes (required to save)
        <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
      </label>

      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saveState === "saving"} className={buttonClass}>
          {saveState === "saving" ? "Saving…" : "Save changes"}
        </button>
        {saveState === "saved" && <span className="text-sm text-green-700 dark:text-green-400">Saved.</span>}
        {saveState === "error" && <span className="text-sm text-red-600">Could not save. Try again.</span>}
      </div>
    </div>
  );
}
