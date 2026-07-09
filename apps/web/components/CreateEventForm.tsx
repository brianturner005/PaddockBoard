"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function CreateEventForm({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [roundNumber, setRoundNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seasonId,
        name,
        venue: venue || undefined,
        eventDate,
        roundNumber: roundNumber ? Number(roundNumber) : undefined,
      }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not create event.");
      return;
    }

    setName("");
    setVenue("");
    setEventDate("");
    setRoundNumber("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Event name
        <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </label>
      <label className={labelClass}>
        Venue
        <input value={venue} onChange={(e) => setVenue(e.target.value)} className={inputClass} />
      </label>
      <label className={labelClass}>
        Date
        <input
          required
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Round number
        <input
          type="number"
          value={roundNumber}
          onChange={(e) => setRoundNumber(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={submitting} className={buttonClass}>
        {submitting ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}
