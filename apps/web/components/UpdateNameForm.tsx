"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function UpdateNameForm({ initialName }: { initialName: string | null }) {
  const router = useRouter();
  const [name, setName] = useState(initialName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not save your name.");
      return;
    }

    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700 dark:text-green-400">Saved.</p>}
      <button type="submit" disabled={submitting} className={`${buttonClass} self-start`}>
        {submitting ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
