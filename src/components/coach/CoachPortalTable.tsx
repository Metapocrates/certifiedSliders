import StarInline from "@/components/StarInline";
import WatchlistToggleButton from "@/components/coach/WatchlistToggleButton";
import NotesButton from "@/components/coach/NotesButton";
import ExpressInterestButton from "@/components/coach/ExpressInterestButton";
import Link from "next/link";

export type CoachAthleteRow = {
  athlete_id: string;
  profile_id: string;
  full_name: string;
  class_year: number | null;
  state_code: string | null;
  school_name: string | null;
  star_tier: number | null;
  profile_verified: boolean;
  most_recent_pb_date: string | null;
  top_event: string | null;
  top_mark: string | null;
  intent: string;
  share_contact: boolean;
  interest_created_at: string;
};

type Props = {
  athletes: CoachAthleteRow[];
  watchlistIds?: string[];
  programId?: string;
  programName?: string;
  interestStatus?: Record<string, string>;
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

export default function CoachPortalTable({
  athletes,
  watchlistIds = [],
  programId,
  programName,
  interestStatus = {},
}: Props) {
  const watchlistSet = new Set(watchlistIds);

  if (!athletes?.length) {
    return (
      <div className="rounded-lg border border-border bg-muted p-8 text-center text-muted-foreground">
        No athletes have expressed interest in your program yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium">#</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
            <th className="px-4 py-3 text-left text-sm font-medium">State</th>
            <th className="px-4 py-3 text-left text-sm font-medium">School</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Stars</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
            <th className="px-4 py-3 text-left text-sm font-medium">Intent</th>
            <th className="px-4 py-3 text-center text-sm font-medium" title="Watchlist">
              <svg className="mx-auto h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </th>
            <th className="px-4 py-3 text-center text-sm font-medium" title="Notes">
              <svg className="mx-auto h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((athlete, idx) => (
            <tr key={athlete.athlete_id} className="border-t hover:bg-muted/50">
              <td className="px-4 py-3 text-sm">{idx + 1}</td>
              <td className="px-4 py-3">
                <Link
                  href={`/a/${athlete.profile_id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {athlete.full_name}
                </Link>
                {athlete.top_event && (
                  <div className="text-xs text-muted-foreground">
                    {athlete.top_event}: {athlete.top_mark || "—"}
                  </div>
                )}
              </td>
              <td className="px-4 py-3 text-sm">{athlete.class_year || "—"}</td>
              <td className="px-4 py-3 text-sm">{athlete.state_code || "—"}</td>
              <td className="px-4 py-3 text-sm">{athlete.school_name || "—"}</td>
              <td className="px-4 py-3">
                <StarInline value={athlete.star_tier} />
              </td>
              <td className="px-4 py-3">
                {athlete.profile_verified ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                    Verified
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    athlete.intent === "commit"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {athlete.intent}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                <WatchlistToggleButton
                  athleteProfileId={athlete.profile_id}
                  isOnWatchlist={watchlistSet.has(athlete.profile_id)}
                  compact
                />
              </td>
              <td className="px-4 py-3 text-center">
                <NotesButton
                  athleteProfileId={athlete.profile_id}
                  athleteName={athlete.full_name}
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/a/${athlete.profile_id}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                  {programId && programName && (
                    <ExpressInterestButton
                      athleteProfileId={athlete.profile_id}
                      athleteName={athlete.full_name}
                      programId={programId}
                      programName={programName}
                      currentStatus={interestStatus[athlete.profile_id]}
                      compact
                    />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
