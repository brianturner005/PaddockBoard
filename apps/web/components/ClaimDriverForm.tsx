"use client";

import { useState } from "react";
import { buttonClass, inputClass, labelClass } from "./form-styles";

export function ClaimDriverForm({ driverId }: { driverId: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");

    const res = await fetch(`/api/drivers/${driverId}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setState(res.ok ? "sent" : "error");
  }

  if (state === "sent") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Check your email for a link to confirm this is you.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Is this you? Claim this profile to keep track of it under your own account.
      </p>
      <label className={labelClass}>
        Your email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      {state === "error" && <p className="text-sm text-red-600">Could not send claim email. Try again.</p>}
      <button type="submit" disabled={state === "sending"} className={`self-start ${buttonClass}`}>
        {state === "sending" ? "Sending…" : "Claim this profile"}
      </button>
    </form>
  );
}
