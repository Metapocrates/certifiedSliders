export default function Loading() {
  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-4">
      <div className="card p-4 space-y-2">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-64 rounded bg-muted animate-pulse" />
      </div>
      <div className="card p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-4 w-full rounded bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
