export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-lg font-medium text-black dark:text-zinc-50">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
