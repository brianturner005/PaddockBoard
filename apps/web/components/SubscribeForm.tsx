"use client";

import { useState } from "react";
import { buttonClass, inputClass } from "./form-styles";

type Target = { classId: string } | { driverId: string };

export function SubscribeForm({ target, subscribed }: { target: Target; subscribed?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");

    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, ...target }),
    });

    setState(res.ok ? "sent" : "error");
  }

  if (subscribed === "confirmed") {
    return (
      <p className="text-sm text-green-700 dark:text-green-400">
        You&rsquo;re subscribed — you&rsquo;ll get an email when new results are published.
      </p>
    );
  }
  if (subscribed === "removed") {
    return <p className="text-sm text-zinc-600 dark:text-zinc-400">You&rsquo;ve been unsubscribed.</p>;
  }

  if (state === "sent") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Check your email to confirm the subscription.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`w-56 ${inputClass}`}
      />
      <button type="submit" disabled={state === "sending"} className={buttonClass}>
        {state === "sending" ? "Sending…" : "Email me new results"}
      </button>
      {state === "error" && <p className="w-full text-sm text-red-600">Could not subscribe. Try again.</p>}
    </form>
  );
}
