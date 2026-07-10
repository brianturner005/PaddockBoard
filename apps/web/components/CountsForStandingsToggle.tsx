"use client";

import { useState } from "react";

export function CountsForStandingsToggle({
  sessionId,
  initialValue,
}: {
  sessionId: string;
  initialValue: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);

  async function handleChange(next: boolean) {
    setValue(next);
    setSaving(true);
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ countsForStandings: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setValue(!next); // revert on failure
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
      <input
        type="checkbox"
        checked={value}
        disabled={saving}
        onChange={(e) => handleChange(e.target.checked)}
      />
      Counts toward championship standings
    </label>
  );
}
