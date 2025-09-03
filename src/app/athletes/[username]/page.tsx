import { createSupabaseServer } from "@/lib/supabase/compat";
import { getSessionUser, isAdmin } from "@/lib/auth";
import Link from "next/link";
import AvatarUploadForm from "./parts/AvatarUploadForm";
import EditProfileForm from "./parts/EditProfileForm";
import SubmitResultForm from "./parts/SubmitResultForm";

type Props = {
  params: { username: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function AthletePage({ params, searchParams }: Props) {
  const supabase = createSupabaseServer();
  const me = await getSessionUser();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, class_year, gender, school_name, school_state, bio, profile_pic_url, star_rating"
    )
    .eq("username", params.username)
    .maybeSingle();

  if (error) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-semibold">Athlete</h1>
        <p className="text-red-500 mt-4">Error loading profile: {error.message}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container py-10">
        <h1 className="text-2xl font-semibold">Athlete</h1>
        <p className="mt-4">
          No athlete found for <span className="font-mono">@{params.username}</span>.
        </p>
      </div>
    );
  }

  const isOwner = !!me && me.id === profile.id;
  const admin = !!me && (await isAdmin(me.id));
  const viewParam = Array.isArray(searchParams?.view)
    ? searchParams?.view[0]
    : searchParams?.view;

  // Mode logic:
  // - Owner: default "edit" unless ?view=public
  // - Admin (not owner): default "public" unless ?view=edit
  // - Everyone else: "public"
  let mode: "public" | "edit" = "public";
  if (isOwner) {
    mode = viewParam === "public" ? "public" : "edit";
  } else if (admin) {
    mode = viewParam === "edit" ? "edit" : "public";
  }

  const canEdit = mode === "edit" && (isOwner || admin);
  const showPending = mode === "edit" && isOwner;

  // Verified results (visible to all)
  const { data: verified } = await supabase
    .from("results")
    .select(
      "id, event, mark, mark_seconds_adj, season, meet_name, meet_date, proof_url, status"
    )
    .eq("athlete_id", profile.id)
    .eq("status", "verified")
    .order("meet_date", { ascending: false })
    .limit(20);

  // Pending results (owner only in edit mode)
  const { data: pending } = showPending
    ? await supabase
        .from("results")
        .select("id, event, mark, season, meet_name, meet_date, proof_url, status")
        .eq("athlete_id", profile.id)
        .eq("status", "pending")
        .order("meet_date", { ascending: false })
        .limit(20)
    : { data: null as any };

  return (
    <div className="container py-8">
      {(isOwner || admin) && (
        <div className="mb-4 rounded-lg border bg-amber-50 text-amber-900 p-3 flex items-center justify-between">
          <div className="text-sm">
            {isOwner ? "You’re viewing your profile" : "Admin on someone else’s profile"}
            {mode === "public" ? " — Public view" : " — Edit mode"}
          </div>
          <div className="flex gap-2">
            {mode === "public" ? (
              <a href={`/athletes/${profile.username}?view=edit#edit`} className="btn">
                Enter edit mode
              </a>
            ) : (
              <a href={`/athletes/${profile.username}?view=public#overview`} className="btn">
                View as public
              </a>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 md:items-center">
        <div className="relative w-32 h-32 rounded-full overflow-hidden bg-gray-100">
          {profile.profile_pic_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_pic_url}
              alt={`${profile.display_name} avatar`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full grid place-items-center text-sm text-gray-500">
              No photo
            </div>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{profile.display_name}</h1>
          <div className="text-sm text-gray-500 mt-1">@{profile.username}</div>
          <div className="mt-2 text-sm">
            <span className="inline-block mr-3">⭐ {profile.star_rating ?? "Unrated"}</span>
            {profile.class_year ? (
              <span className="inline-block mr-3">Class of {profile.class_year}</span>
            ) : null}
            <span className="inline-block">
              {profile.school_name} ({profile.school_state})
            </span>
          </div>
          {profile.bio ? (
            <p className="mt-3 max-w-prose text-gray-700">{profile.bio}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-8 border-b border-gray-200 flex gap-6">
        <a href="#overview" className="py-2 text-sm font-medium">
          Overview
        </a>
        <a href="#results" className="py-2 text-sm font-medium">
          Results
        </a>
        {canEdit && (
          <a href="#edit" className="py-2 text-sm font-medium">
            Edit
          </a>
        )}
      </div>

      <section id="overview" className="mt-6">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <div className="text-sm text-gray-700">
          <p>
            This is the athlete’s public profile. Coaches and fans can see verified
            results here.
          </p>
        </div>
      </section>

      <section id="results" className="mt-10">
        <h2 className="text-xl font-semibold mb-4">Recent Results</h2>

        {showPending && pending?.length ? (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">My Submissions</span>
              <span className="text-xs rounded-full border px-2 py-0.5">Pending</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Date</th>
                    <th className="text-left py-2 pr-4">Event</th>
                    <th className="text-left py-2 pr-4">Mark</th>
                    <th className="text-left py-2 pr-4">Season</th>
                    <th className="text-left py-2 pr-4">Meet</th>
                    <th className="text-left py-2">Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {pending!.map((r: any) => (
                    <tr key={r.id} className="border-b last:border-none">
                      <td className="py-2 pr-4">{r.meet_date}</td>
                      <td className="py-2 pr-4">{r.event}</td>
                      <td className="py-2 pr-4">{r.mark}</td>
                      <td className="py-2 pr-4">{r.season}</td>
                      <td className="py-2 pr-4">{r.meet_name}</td>
                      <td className="py-2">
                        <Link href={r.proof_url} target="_blank" className="underline">
                          Link
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {!verified?.length ? (
          <div className="text-sm text-gray-500">No verified results yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 pr-4">Date</th>
                  <th className="text-left py-2 pr-4">Event</th>
                  <th className="text-left py-2 pr-4">Mark</th>
                  <th className="text-left py-2 pr-4">Season</th>
                  <th className="text-left py-2 pr-4">Meet</th>
                  <th className="text-left py-2">Proof</th>
                </tr>
              </thead>
              <tbody>
                {verified!.map((r: any) => (
                  <tr key={r.id} className="border-b last:border-none">
                    <td className="py-2 pr-4">{r.meet_date}</td>
                    <td className="py-2 pr-4">{r.event}</td>
                    <td className="py-2 pr-4">{r.mark}</td>
                    <td className="py-2 pr-4">{r.season}</td>
                    <td className="py-2 pr-4">{r.meet_name}</td>
                    <td className="py-2">
                      <Link href={r.proof_url} target="_blank" className="underline">
                        Link
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canEdit && (
        <section id="edit" className="mt-12">
          <h2 className="text-xl font-semibold mb-6">Edit Profile</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="p-4 rounded-xl border">
              <h3 className="font-medium mb-3">Profile Photo</h3>
              <AvatarUploadForm />
            </div>
            <div className="p-4 rounded-xl border">
              <h3 className="font-medium mb-3">Basic Info</h3>
              <EditProfileForm initial={profile as any} />
            </div>
          </div>

          <div className="mt-10 p-4 rounded-xl border">
            <h3 className="font-medium mb-3">Submit a Result</h3>
            <SubmitResultForm />
          </div>
        </section>
      )}
    </div>
  );
}
