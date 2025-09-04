// Server component
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/compat";

export default async function FeaturedProfileCard() {
  const supabase = createSupabaseServer();

  // Try admin-curated featured profile
  const { data: feat } = await supabase
    .from("featured_profiles")
    .select("profile_id")
    .maybeSingle();

  type Profile = {
    id: string;
    username: string | null;
    display_name: string | null;
    school_name: string | null;
    school_state: string | null;
    star_rating: number | null;
    profile_pic_url: string | null;
  };

  let profile: Profile | null = null;

  if (feat?.profile_id) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, school_name, school_state, star_rating, profile_pic_url")
      .eq("id", feat.profile_id)
      .maybeSingle();
    profile = data ?? null;
  }

  // Fallback: highest star rating, then most recently updated
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, school_name, school_state, star_rating, profile_pic_url")
      .order("star_rating", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    profile = data ?? null;
  }

  if (!profile) {
    return (
      <div className="p-4 rounded-xl border">
        <h3 className="font-semibold mb-2">Featured Profile</h3>
        <p className="text-sm text-gray-600">No profiles yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border flex gap-4 items-center">
      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {profile.profile_pic_url ? (
          <img src={profile.profile_pic_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-gray-500">🙂</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-500">Featured Profile</div>
        <div className="text-lg font-semibold truncate">{profile.display_name}</div>
        <div className="text-sm text-gray-600 truncate">
          {profile.school_name} ({profile.school_state}) · ⭐ {profile.star_rating ?? "Unrated"}
        </div>
      </div>
      {profile.username && (
        <Link href={`/athletes/${profile.username}?view=public#overview`} className="btn">
          View profile
        </Link>
      )}
    </div>
  );
}
