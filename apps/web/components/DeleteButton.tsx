"use client";

import { useState } from "react";

const IMPACT_LABELS: Record<string, string> = {
  seasons: "season",
  events: "event",
  sessions: "session",
  classes: "class",
  results: "result",
  drivers: "driver",
};

function describeImpact(impact: Record<string, number>): string {
  const parts = Object.entries(impact)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => {
      const label = IMPACT_LABELS[key] ?? key;
      return `${count} ${label}${count === 1 ? "" : "s"}`;
    });
  if (parts.length === 0) return "";
  return ` This also permanently deletes ${parts.join(", ")}.`;
}

export function DeleteButton({
  endpoint,
  entityLabel,
  onDeleted,
}: {
  endpoint: string;
  entityLabel: string;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setBusy(true);

    const previewRes = await fetch(endpoint, { method: "DELETE" });
    if (!previewRes.ok) {
      setBusy(false);
      setError(`Could not delete this ${entityLabel}.`);
      return;
    }
    const preview = (await previewRes.json()) as { impact?: Record<string, number> };

    const confirmed = window.confirm(
      `Delete this ${entityLabel}?${describeImpact(preview.impact ?? {})} This cannot be undone.`
    );
    if (!confirmed) {
      setBusy(false);
      return;
    }

    const res = await fetch(`${endpoint}?confirm=true`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      setError(`Could not delete this ${entityLabel}.`);
      return;
    }
    onDeleted();
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-xs text-red-600 underline hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
      >
        {busy ? "Deleting…" : "Delete"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
