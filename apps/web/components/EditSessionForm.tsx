"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sessionTypeSchema } from "@paddockboard/shared";
import { inputClass, buttonClass, labelClass } from "./form-styles";

const SESSION_TYPES = sessionTypeSchema.options;

export function EditSessionForm({
  session,
}: {
  session: { id: string; name: string; type: (typeof SESSION_TYPES)[number] };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const [type, setType] = useState(session.type);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          {session.name} <span className="text-zinc-500 dark:text-zinc-400">— {session.type}</span>
        </h1>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Edit
        </button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not save changes.");
      return;
    }

    setEditing(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
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
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={buttonClass}>
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(session.name);
            setType(session.type);
            setError(null);
          }}
          className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
