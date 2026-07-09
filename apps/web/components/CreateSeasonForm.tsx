"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function CreateSeasonForm({ clubId }: { clubId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/seasons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId, name, year }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not create season.");
      return;
    }

    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Season name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className={labelClass}>
        Year
        <input
          required
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? "Creating…" : "Create season"}
      </button>
    </form>
  );
}
