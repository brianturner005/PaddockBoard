"use client";

import { useState } from "react";
import Link from "next/link";
import { inputClass, buttonClass, labelClass } from "./form-styles";

export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!hasPassword) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Your account doesn&rsquo;t have a password yet.{" "}
        <Link href="/forgot-password" className="underline">
          Use &ldquo;Forgot password&rdquo;
        </Link>{" "}
        to set one.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(typeof data?.error === "string" ? data.error : "Could not change your password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
      <label className={labelClass}>
        Current password
        <input
          required
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        New password
        <input
          required
          type="password"
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saved && <p className="text-sm text-green-700 dark:text-green-400">Password changed.</p>}
      <button type="submit" disabled={submitting} className={`${buttonClass} self-start`}>
        {submitting ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
