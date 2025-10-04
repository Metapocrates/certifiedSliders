// src/app/page.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  return (
    <main className="container py-8">
      <h1 className="text-2xl font-semibold mb-3">Certified Sliders</h1>
      <p className="text-gray-600 mb-6">
        Welcome. Jump into the verified rankings or browse athlete profiles.
      </p>
      <div className="flex gap-3">
        <Link href="/rankings" className="rounded-md border px-4 py-2 hover:opacity-90">
          View Rankings
        </Link>
        <Link href="/athletes" className="rounded-md border px-4 py-2 hover:opacity-90">
          Find Athletes
        </Link>
      </div>
    </main>
  );
}
