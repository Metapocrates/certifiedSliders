export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}
