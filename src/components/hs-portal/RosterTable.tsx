"use client";

import Link from "next/link";

type RosterAthlete = {
  athlete_id: string;
  full_name: string;
  username: string | null;
  profile_id: string | null;
  school_name: string | null;
  class_year: number | null;
  gender: string | null;
  profile_pic_url: string | null;
  jersey_number: string | null;
  specialty_events: string[] | null;
  joined_at: string;
  status: string;
  total_results: number;
  verified_results: number;
  last_result_date: string | null;
};

export default function RosterTable({
  athletes,
  teamId,
}: {
  athletes: RosterAthlete[];
  teamId: string;
}) {
  return (
    <div className="rounded-xl border border-app bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted border-b border-app">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Athlete
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Class
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Events
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Results
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-app uppercase tracking-wider">
                Last Result
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-app uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app">
            {athletes.map((athlete) => (
              <tr key={athlete.athlete_id} className="hover:bg-muted/50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {athlete.profile_pic_url ? (
                      <img
                        src={athlete.profile_pic_url}
                        alt={athlete.full_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
                        {athlete.full_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-app">{athlete.full_name}</div>
                      {athlete.username && (
                        <div className="text-xs text-muted">@{athlete.username}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-app">
                    {athlete.class_year ? `'${athlete.class_year.toString().slice(-2)}` : "-"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {athlete.specialty_events && athlete.specialty_events.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {athlete.specialty_events.slice(0, 3).map((event) => (
                        <span
                          key={event}
                          className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-app"
                        >
                          {event}
                        </span>
                      ))}
                      {athlete.specialty_events.length > 3 && (
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted">
                          +{athlete.specialty_events.length - 3}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">
                    <span className="font-medium text-app">{athlete.total_results}</span>
                    <span className="text-muted"> total</span>
                  </div>
                  <div className="text-xs text-muted">
                    {athlete.verified_results} verified
                  </div>
                </td>
                <td className="px-4 py-3">
                  {athlete.last_result_date ? (
                    <span className="text-sm text-app">
                      {new Date(athlete.last_result_date).toLocaleDateString()}
                    </span>
                  ) : (
                    <span className="text-sm text-muted">No results</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {athlete.profile_id && (
                    <Link
                      href={`/athletes/${athlete.profile_id}`}
                      className="text-sm font-medium text-scarlet hover:underline"
                    >
                      View Profile →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
