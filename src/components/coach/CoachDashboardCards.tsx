// Coach Dashboard Summary Cards - Shows key metrics at a glance
import Link from "next/link";

type Props = {
  athleteCount: number;
  watchlistCount: number;
  programName: string;
  tier: number;
};

export default function CoachDashboardCards({
  athleteCount,
  watchlistCount,
  programName,
  tier,
}: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* Athletes Interested Card */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50">
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Athletes Listed</p>
            <p className="text-2xl font-bold">{athleteCount}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Athletes who expressed interest in your program
        </p>
      </div>

      {/* Watchlist Card */}
      <Link
        href="/coach/portal/watchlist"
        className="group rounded-lg border border-border bg-card p-6 shadow-sm transition hover:border-blue-300 hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
            <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Watchlist</p>
            <p className="text-2xl font-bold">{watchlistCount}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground group-hover:text-blue-600">
          Athletes you're tracking → View all
        </p>
      </Link>

      {/* Quick Actions Card */}
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/50">
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tier === 0 ? (
            <Link
              href="/coach/verify"
              className="inline-flex items-center gap-1 rounded-md bg-yellow-100 px-3 py-1.5 text-xs font-medium text-yellow-800 hover:bg-yellow-200"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Verify Account
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-3 py-1.5 text-xs font-medium text-green-800">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Verified
            </span>
          )}
          <Link
            href="/coach/portal/watchlist"
            className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-800 hover:bg-blue-200"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Watchlist
          </Link>
        </div>
      </div>
    </div>
  );
}
