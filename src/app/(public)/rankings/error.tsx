"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="text-red-600 font-medium">Couldn’t load rankings.</div>
      <pre className="mt-2 text-sm opacity-80 whitespace-pre-wrap">{error.message}</pre>
    </div>
  );
}
