// src/app/(protected)/me/page.tsx
import { createSupabaseServer } from "@/lib/supabase/compat";
import { ensureProfileAction, updateProfileAction } from "./actions";
import MySubmissions from "@/components/MySubmissions"; // ← NEW

export const dynamic = "force-dynamic";

const CLASS_YEARS = ["", "2026", "2027", "2028", "2029", "2030", "2031"];
const GENDERS = [
  { label: "—", value: "" },
  { label: "Boys (M)", value: "M" },
  { label: "Girls (F)", value: "F" },
];

export default async function MePage() {
  const supabase = createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">You’re not signed in</h1>
        <p className="text-sm">
          Head to <a href="/signin" className="underline underline-offset-2">/signin</a> to log in.
        </p>
      </div>
    );
  }

  const user = session.user;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, class_year, gender, school_name, school_state, bio, profile_pic_url, star_rating")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;

  // If no profile row yet — show create button
  if (!profile) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Create your athlete profile</h1>
        <p className="text-sm subtle">
          We’ll create your profile so your results can attach to your public page.
        </p>
        <form action={ensureProfileAction}>
          <button className="rounded-md px-4 py-2 bg-black text-white">Create my profile</button>
        </form>
        <div className="text-xs subtle">
          Signed in as <span className="font-mono">{user.email}</span>
        </div>
      </div>
    );
  }

  const publicLink = `/athlete/${profile.id}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">My Profile</h1>
        <a href={publicLink} className="text-sm underline underline-offset-2">View public page</a>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: avatar + meta */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {profile.profile_pic_url ? (
              <img
                src={profile.profile_pic_url}
                alt={profile.full_name || "Avatar"}
                className="h-16 w-16 rounded-full object-cover border"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-neutral-200" />
            )}
            <div>
              <div className="font-medium">{profile.full_name || "—"}</div>
              <div className="text-xs subtle">{user.email}</div>
            </div>
          </div>
          {typeof profile.star_rating === "number" ? (
            <div className="text-sm">
              Star rating: <span className="text-amber-500">{("★").repeat(profile.star_rating)}</span>
            </div>
          ) : null}
          <div className="text-xs subtle">
            Athlete ID: <span className="font-mono">{profile.id}</span>
          </div>
        </div>

        {/* Right: editable form */}
        <div className="lg:col-span-2 card p-4">
          <form action={updateProfileAction} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Username</label>
              <input
                name="username"
                defaultValue={profile.username || ""}
                required
                className="w-full border rounded-md px-3 py-2"
                placeholder="your-handle"
              />
              <div className="text-xs subtle mt-1">Used in mentions and internal tools.</div>
            </div>

            <div>
              <label className="block text-sm mb-1">Full name</label>
              <input
                name="full_name"
                defaultValue={profile.full_name || ""}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Gender</label>
              <select
                name="gender"
                defaultValue={profile.gender || ""}
                className="w-full border rounded-md px-3 py-2"
              >
                {GENDERS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Class year</label>
              <select
                name="class_year"
                defaultValue={profile.class_year?.toString() || ""}
                className="w-full border rounded-md px-3 py-2"
              >
                {CLASS_YEARS.map((y) => (
                  <option key={y || "any"} value={y}>{y || "—"}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">School name</label>
              <input
                name="school_name"
                defaultValue={profile.school_name || ""}
                className="w-full border rounded-md px-3 py-2"
                placeholder="Menlo School"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">School state</label>
              <input
                name="school_state"
                defaultValue={profile.school_state || ""}
                className="w-full border rounded-md px-3 py-2"
                placeholder="CA"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm mb-1">Bio</label>
              <textarea
                name="bio"
                defaultValue={profile.bio || ""}
                className="w-full border rounded-md px-3 py-2"
                rows={4}
                placeholder="Tell us a bit about you (optional)"
              />
            </div>

            <div className="sm:col-span-2">
              <button className="rounded-md px-4 py-2 bg-black text-white">Save</button>
            </div>
          </form>
        </div>
      </div>

      {/* Submit + pending items */}
      <div className="flex items-center justify-between mt-8">
        <h2 className="text-lg font-medium">Submit a result</h2>
        <a href="/submit-result" className="rounded-md px-3 py-1.5 border text-sm">Open form</a>
      </div>
      <MySubmissions athleteId={user.id} />

      <div className="text-xs subtle">
        Signed in as <span className="font-mono">{user.email}</span>
      </div>
    </div>
  );
}
