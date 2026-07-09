"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function CreateClubForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, timezone }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not create club. Check the name and try again.");
      return;
    }

    const { club } = await res.json();
    router.push(`/admin/clubs/${club.id}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Club name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className={labelClass}>
        Timezone
        <input
          required
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? "Creating…" : "Create club"}
      </button>
    </form>
  );
}
