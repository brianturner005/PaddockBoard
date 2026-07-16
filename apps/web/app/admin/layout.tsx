import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <header className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
        <Link
          href="/admin"
          className="flex items-center gap-2 font-semibold text-black dark:text-zinc-50"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-orange-600 dark:bg-orange-400" />
          PaddockBoard
        </Link>
        <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/admin/account" className="underline">
            {user.email}
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="underline">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-8">{children}</main>
    </div>
  );
}
