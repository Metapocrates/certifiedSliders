import Link from "next/link";

export default function DevLinks() {
  return (
    <div className="container max-w-xl mx-auto p-6 space-y-3">
      <h1 className="text-xl font-semibold">Dev Links</h1>
      <ul className="list-disc pl-5 space-y-2">
        <li><Link className="underline" href="/rankings">/rankings</Link></li>
        <li><Link className="underline" href="/api/athletes">/api/athletes</Link></li>
        <li><Link className="underline" href="/api/leaderboard">/api/leaderboard</Link></li>
        <li><Link className="underline" href="/api/health">/api/health</Link></li>
      </ul>
    </div>
  );
}
