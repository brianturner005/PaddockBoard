import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-black dark:text-zinc-50"
        >
          <span aria-hidden className="h-2 w-2 rounded-full bg-orange-600 dark:bg-orange-400" />
          PaddockBoard
        </Link>
        <Link href="/login" className="text-sm text-zinc-600 underline dark:text-zinc-400">
          Club sign-in
        </Link>
      </div>
    </header>
  );
}
