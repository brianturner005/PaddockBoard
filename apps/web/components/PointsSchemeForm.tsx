"use client";

import { useState } from "react";
import { buttonClass, inputClass, labelClass } from "./form-styles";

interface PositionPointRow {
  position: string;
  points: string;
}

function toRows(positionPoints: Record<string, number>): PositionPointRow[] {
  return Object.entries(positionPoints)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([position, points]) => ({ position, points: String(points) }));
}

export function PointsSchemeForm({
  schemeId,
  initialName,
  initialPositionPoints,
  initialPoleBonus,
  initialFastestLapBonus,
  initialDropRounds,
  initialCountbackRule,
}: {
  schemeId: string;
  initialName: string;
  initialPositionPoints: Record<string, number>;
  initialPoleBonus: number;
  initialFastestLapBonus: number;
  initialDropRounds: number;
  initialCountbackRule: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [rows, setRows] = useState<PositionPointRow[]>(
    toRows(initialPositionPoints).length > 0 ? toRows(initialPositionPoints) : [{ position: "1", points: "25" }]
  );
  const [poleBonus, setPoleBonus] = useState(String(initialPoleBonus));
  const [fastestLapBonus, setFastestLapBonus] = useState(String(initialFastestLapBonus));
  const [dropRounds, setDropRounds] = useState(String(initialDropRounds));
  const [countbackRule, setCountbackRule] = useState(initialCountbackRule ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function updateRow(index: number, patch: Partial<PositionPointRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    const nextPosition = rows.length > 0 ? Math.max(...rows.map((r) => Number(r.position) || 0)) + 1 : 1;
    setRows((prev) => [...prev, { position: String(nextPosition), points: "0" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");

    const positionPoints: Record<string, number> = {};
    for (const row of rows) {
      if (row.position.trim()) {
        positionPoints[row.position.trim()] = Number(row.points) || 0;
      }
    }

    const res = await fetch(`/api/points-schemes/${schemeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        positionPoints,
        poleBonus: Number(poleBonus) || 0,
        fastestLapBonus: Number(fastestLapBonus) || 0,
        dropRounds: Number(dropRounds) || 0,
        countbackRule: countbackRule.trim() || undefined,
      }),
    });

    setStatus(res.ok ? "saved" : "error");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className={labelClass}>
        Scheme name
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>

      <div>
        <p className="mb-2 text-sm font-medium text-black dark:text-zinc-50">Points by finishing position</p>
        <div className="flex flex-col gap-2">
          {rows.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">P</span>
              <input
                type="number"
                value={row.position}
                onChange={(e) => updateRow(index, { position: e.target.value })}
                className={`w-16 ${inputClass}`}
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">=</span>
              <input
                type="number"
                value={row.points}
                onChange={(e) => updateRow(index, { points: e.target.value })}
                className={`w-20 ${inputClass}`}
              />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">pts</span>
              <button type="button" onClick={() => removeRow(index)} className="text-sm text-red-600 underline">
                Remove
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addRow} className="mt-2 text-sm underline">
          + Add position
        </button>
      </div>

      <label className={labelClass}>
        Fastest lap bonus (points) — auto-awarded to the quickest lap among finishers each round
        <input
          type="number"
          value={fastestLapBonus}
          onChange={(e) => setFastestLapBonus(e.target.value)}
          className={`max-w-[120px] ${inputClass}`}
        />
      </label>

      <label className={labelClass}>
        Pole bonus (points) — not auto-computed yet; apply manually via a result&apos;s points override
        <input
          type="number"
          value={poleBonus}
          onChange={(e) => setPoleBonus(e.target.value)}
          className={`max-w-[120px] ${inputClass}`}
        />
      </label>

      <label className={labelClass}>
        Drop rounds — number of a driver&apos;s worst-scoring rounds excluded from their total
        <input
          type="number"
          value={dropRounds}
          onChange={(e) => setDropRounds(e.target.value)}
          className={`max-w-[120px] ${inputClass}`}
        />
      </label>

      <label className={labelClass}>
        Countback rule (notes only — Phase 1 always breaks ties by most wins, then most 2nds, etc.)
        <input value={countbackRule} onChange={(e) => setCountbackRule(e.target.value)} className={inputClass} />
      </label>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={status === "saving"} className={buttonClass}>
          {status === "saving" ? "Saving…" : "Save points scheme"}
        </button>
        {status === "saved" && <span className="text-sm text-green-700 dark:text-green-400">Saved.</span>}
        {status === "error" && <span className="text-sm text-red-600">Could not save. Try again.</span>}
      </div>
    </form>
  );
}
