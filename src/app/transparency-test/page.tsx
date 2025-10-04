// src/app/transparency-test/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Image from "next/image";

export default function TransparencyTestPage() {
  return (
    <main className="container py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Transparency Test</h1>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 font-medium">Local images via next/image</h2>

        <div className="flex flex-wrap items-center gap-4">
          {/* Example 1: square */}
          <div className="relative h-24 w-24 overflow-hidden rounded bg-gray-100">
            <Image
              src="/icon.svg"       // local asset avoids remote domains
              alt="Icon"
              fill
              sizes="96px"
              className="object-contain"
              priority
            />
          </div>

          {/* Example 2: rectangle */}
          <div className="relative h-24 w-40 overflow-hidden rounded bg-gray-100">
            <Image
              src="/icon.svg"
              alt="Icon Wide"
              fill
              sizes="160px"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-600">
          These boxes use <code>next/image</code> with <code>fill</code> inside a sized, relative container.
          Replace <code>/icon.svg</code> with any local asset to test transparency/edges without ESLint warnings.
        </p>
      </section>
    </main>
  );
}
