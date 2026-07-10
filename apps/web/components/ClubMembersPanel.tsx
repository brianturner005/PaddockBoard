"use client";

import { useEffect, useState } from "react";
import { buttonClass, inputClass, labelClass } from "./form-styles";

interface Member {
  id: string;
  userId: string;
  email: string;
  role: "owner" | "editor";
}

export function ClubMembersPanel({ clubId, isOwner, currentUserId }: { clubId: string; isOwner: boolean; currentUserId: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"owner" | "editor">("editor");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function loadMembers() {
    fetch(`/api/clubs/${clubId}/members`)
      .then((res) => res.json())
      .then((data: { members: Member[] }) => setMembers(data.members));
  }

  useEffect(loadMembers, [clubId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch(`/api/clubs/${clubId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    setSubmitting(false);

    if (!res.ok) {
      setError("Could not add member. Check the email and try again.");
      return;
    }

    setEmail("");
    loadMembers();
  }

  async function handleRemove(memberId: string) {
    setError(null);
    const res = await fetch(`/api/clubs/${clubId}/members?memberId=${memberId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Could not remove member.");
      return;
    }
    loadMembers();
  }

  return (
    <section>
      <h2 className="text-lg font-medium text-black dark:text-zinc-50">Members</h2>
      {members === null ? (
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1 text-sm text-zinc-800 dark:text-zinc-200">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-2">
              <span>
                {member.email} <span className="text-zinc-500 dark:text-zinc-400">({member.role})</span>
                {member.userId === currentUserId && " — you"}
              </span>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(member.id)}
                  className="text-sm text-red-600 underline"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <form onSubmit={handleAdd} className="mt-3 flex max-w-sm flex-col gap-3">
          <label className={labelClass}>
            Add a member by email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as "owner" | "editor")} className={inputClass}>
              <option value="editor">Editor — manage club data</option>
              <option value="owner">Owner — can also manage members</option>
            </select>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={submitting} className={buttonClass}>
            {submitting ? "Adding…" : "Add member"}
          </button>
        </form>
      )}
    </section>
  );
}
