"use client";

import { useState } from "react";
import Link from "next/link";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    // Always show the same message, whether or not the email is registered.
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        If that email has an account, a reset link is on its way. It expires in 15 minutes.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Email
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      <button type="submit" disabled={status === "submitting"} className={buttonClass}>
        {status === "submitting" ? "Sending…" : "Send reset link"}
      </button>
      <Link href="/login" className="text-sm underline">
        Back to sign in
      </Link>
    </form>
  );
}
