"use client";

import { useState } from "react";
import Link from "next/link";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setStatus("error");
      setError(data?.error ?? "Could not create account.");
      return;
    }

    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Check your email for a link to confirm your account. It expires in 15 minutes.
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
      <label className={labelClass}>
        Password (at least 8 characters)
        <input
          required
          minLength={8}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={status === "submitting"} className={buttonClass}>
        {status === "submitting" ? "Creating account…" : "Create account"}
      </button>
      <Link href="/login" className="text-sm underline">
        Already have an account? Sign in
      </Link>
    </form>
  );
}
