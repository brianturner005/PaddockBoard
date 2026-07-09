"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function CreateClassForm({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seasonId, name }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not create class.");
      return;
    }

    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Class name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? "Creating…" : "Create class"}
      </button>
    </form>
  );
}
