import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="mt-12 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-500">
      <Link href="/" className="underline">
        Powered by PaddockBoard
      </Link>
    </footer>
  );
}
