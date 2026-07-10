// Shared "Pos" column rendering for results/standings tables -- P1 picks
// up the accent color, P2/P3 stay bold-but-neutral, everyone else is
// plain. `fallback` is shown for non-finishers (DNF/DNS/DSQ labels).
export function PositionCell({ position, fallback }: { position: number | null; fallback: string }) {
  if (position === null) {
    return <span className="font-medium text-zinc-500 dark:text-zinc-400">{fallback}</span>;
  }
  if (position === 1) {
    return <span className="font-semibold text-orange-600 dark:text-orange-400">{position}</span>;
  }
  if (position === 2 || position === 3) {
    return <span className="font-semibold text-black dark:text-zinc-50">{position}</span>;
  }
  return <span className="font-medium text-black dark:text-zinc-50">{position}</span>;
}
