import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container max-w-xl mx-auto p-8 space-y-3">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="subtle">The page you’re looking for doesn’t exist.</p>
      <div className="flex gap-3">
        <Link href="/" className="btn">Home</Link>
        <Link href="/rankings" className="btn">Rankings</Link>
      </div>
    </div>
  );
}
