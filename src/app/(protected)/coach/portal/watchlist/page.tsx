// NCAA Coach Portal - Watchlist Page
import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/compat";
import Link from "next/link";
import StarInline from "@/components/StarInline";
import WatchlistRemoveButton from "@/components/coach/WatchlistRemoveButton";

export default async function CoachWatchlistPage() {
  const supabase = await createSupabaseServer();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/coach/portal/watchlist");
  }

  // Check user has program membership
  const { data: membership } = await supabase
    .from("program_memberships")
    .select("id, program_id, programs(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    redirect("/coach/onboarding");
  }

  // Get watchlist with athlete details
  const { data: watchlist, error } = await supabase
    .from("coach_watchlist")
    .select(`
      id,
      created_at,
      athlete_profile_id,
      profiles:athlete_profile_id (
        id,
        full_name,
        class_year,
        state_code,
        school_name,
        profile_verified,
        star_tier
      )
    `)
    .eq("coach_user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching watchlist:", error);
  }

  const watchlistItems = watchlist || [];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/coach/portal"
              className="text-muted-foreground hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl font-bold">My Watchlist</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Athletes you're tracking for recruitment
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {watchlistItems.length} athlete{watchlistItems.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Watchlist Table */}
      {watchlistItems.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/50 p-12 text-center">
          <div className="flex justify-center">
            <svg className="h-12 w-12 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium">No athletes on watchlist</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add athletes to your watchlist from the main portal to track them here.
          </p>
          <Link
            href="/coach/portal"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Browse Athletes
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="table w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Class</th>
                <th className="px-4 py-3 text-left text-sm font-medium">State</th>
                <th className="px-4 py-3 text-left text-sm font-medium">School</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Stars</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Added</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlistItems.map((item) => {
                // Handle Supabase join return type
                const profileData = item.profiles;
                const profile = Array.isArray(profileData) ? profileData[0] : profileData;
                if (!profile) return null;

                return (
                  <tr key={item.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Link
                        href={`/a/${profile.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {profile.full_name || "Unknown"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm">{profile.class_year || "—"}</td>
                    <td className="px-4 py-3 text-sm">{profile.state_code || "—"}</td>
                    <td className="px-4 py-3 text-sm">{profile.school_name || "—"}</td>
                    <td className="px-4 py-3">
                      <StarInline value={profile.star_tier} />
                    </td>
                    <td className="px-4 py-3">
                      {profile.profile_verified ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Verified
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/a/${profile.id}`}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Profile
                        </Link>
                        <WatchlistRemoveButton
                          watchlistId={item.id}
                          athleteName={profile.full_name || "this athlete"}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
