"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold">Athlete</h1>
      <p className="text-red-500 mt-4">Something went wrong: {error.message}</p>
    </div>
  );
}
