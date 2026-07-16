"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inputClass, buttonClass, labelClass } from "./form-styles";
import { DeleteButton } from "./DeleteButton";

export function EditEventForm({
  event,
  seasonId,
}: {
  event: { id: string; name: string; venue: string | null; eventDate: string; roundNumber: number | null };
  seasonId: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(event.name);
  const [venue, setVenue] = useState(event.venue ?? "");
  const [eventDate, setEventDate] = useState(event.eventDate);
  const [roundNumber, setRoundNumber] = useState(event.roundNumber?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <div>
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">{event.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {event.venue ? `${event.venue} · ` : ""}
            {event.eventDate}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Edit
        </button>
        <DeleteButton
          endpoint={`/api/events/${event.id}`}
          entityLabel="event"
          onDeleted={() => router.push(`/admin/seasons/${seasonId}`)}
        />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        venue: venue || null,
        eventDate,
        roundNumber: roundNumber ? Number(roundNumber) : null,
      }),
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
      <div className="flex gap-2">
        <button type="submit" disabled={submitting} className={buttonClass}>
          {submitting ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setName(event.name);
            setVenue(event.venue ?? "");
            setEventDate(event.eventDate);
            setRoundNumber(event.roundNumber?.toString() ?? "");
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
