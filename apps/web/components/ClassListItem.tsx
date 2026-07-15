"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function ClassListItem({ cls }: { cls: { id: string; name: string } }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(cls.name);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (editing) {
    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSubmitting(true);
      setError(null);

      const res = await fetch(`/api/classes/${cls.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
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
      <li className="px-2 py-2">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
          <label className={labelClass}>
            Class name
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </label>
          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setName(cls.name);
              setError(null);
            }}
            className="rounded-md px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
          {error && <p className="w-full text-sm text-red-600">{error}</p>}
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 px-2 py-2 text-sm text-zinc-800 dark:text-zinc-200">
      {cls.name}
      <span className="flex items-center gap-3">
        <Link href={`/standings/${cls.id}`} className="underline" target="_blank" rel="noopener noreferrer">
          standings
        </Link>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Edit
        </button>
      </span>
    </li>
  );
}
