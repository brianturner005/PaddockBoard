"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";

const SESSION_TYPES = ["practice", "qualifying", "heat", "final", "feature"] as const;
const SESSION_SOURCES = [
  { value: "orbits_csv", label: "Upload an Orbits CSV export" },
  { value: "manual", label: "Enter results manually" },
] as const;

export function CreateSessionForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof SESSION_TYPES)[number]>("final");
  const [source, setSource] = useState<(typeof SESSION_SOURCES)[number]["value"]>("orbits_csv");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, name, type, source }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not create session.");
      return;
    }

    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Session name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className={labelClass}>
        Type
        <select
          value={type}
          onChange={(e) => setType(e.target.value as (typeof SESSION_TYPES)[number])}
          className={inputClass}
        >
          {SESSION_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        How will results get entered?
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as (typeof SESSION_SOURCES)[number]["value"])}
          className={inputClass}
        >
          {SESSION_SOURCES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? "Creating…" : "Create session"}
      </button>
    </form>
  );
}
