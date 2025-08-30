"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container max-w-3xl mx-auto p-6 space-y-3">
      <h1 className="text-xl font-semibold">Athlete</h1>
      <p className="subtle">Something went wrong: {error.message}</p>
      <button className="btn" onClick={reset}>Try again</button>
    </div>
  );
}
