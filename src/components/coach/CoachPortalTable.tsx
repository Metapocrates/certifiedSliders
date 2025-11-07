import StarInline from "@/components/StarInline";

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
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString();
}

export default function CoachPortalTable({ athletes }: Props) {
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
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Profile ID</th>
            <th className="px-4 py-3 text-left">Class</th>
            <th className="px-4 py-3 text-left">State</th>
            <th className="px-4 py-3 text-left">School</th>
            <th className="px-4 py-3 text-left">Stars</th>
            <th className="px-4 py-3 text-left">Verified</th>
            <th className="px-4 py-3 text-left">Recent PB</th>
            <th className="px-4 py-3 text-left">Intent</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {athletes.map((athlete, idx) => (
            <tr key={athlete.athlete_id} className="border-t hover:bg-muted/50">
              <td className="px-4 py-3">{idx + 1}</td>
              <td className="px-4 py-3">
                <div className="font-medium">{athlete.full_name}</div>
                {athlete.top_event && (
                  <div className="text-xs text-muted-foreground">
                    {athlete.top_event}: {athlete.top_mark || "—"}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {athlete.profile_id}
                </code>
              </td>
              <td className="px-4 py-3">{athlete.class_year || "—"}</td>
              <td className="px-4 py-3">{athlete.state_code || "—"}</td>
              <td className="px-4 py-3">{athlete.school_name || "—"}</td>
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
              <td className="px-4 py-3 text-sm">
                {formatDate(athlete.most_recent_pb_date)}
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
              <td className="px-4 py-3">
                <a
                  href={`/coach/portal/athletes/${athlete.profile_id}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
