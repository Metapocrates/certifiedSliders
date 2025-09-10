"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  class_year: number | null;
  gender: string | null;
  school_name: string | null;
  school_state: string | null;
  bio: string | null;
  profile_pic_url: string | null;
};

export default function SettingsForm({
  userId,
  initialProfile,
}: {
  userId: string;
  initialProfile: Profile;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setErr(null);

    const fd = new FormData(e.currentTarget);
    const payload: Omit<Profile, "id"> = {
      username: (fd.get("username") as string) || null,
      full_name: (fd.get("full_name") as string) || null,
      class_year: fd.get("class_year")
        ? Number(fd.get("class_year"))
        : null,
      gender: (fd.get("gender") as string) || null,
      school_name: (fd.get("school_name") as string) || null,
      school_state: (fd.get("school_state") as string) || null,
      bio: (fd.get("bio") as string) || null,
      profile_pic_url: (fd.get("profile_pic_url") as string) || null,
    };

    // Ensure row exists; update() will no-op if none. You can switch to upsert if desired.
    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (error) {
      setErr(error.message);
    } else {
      setMsg("Saved!");
      router.refresh(); // refresh server data on the page
    }

    setSaving(false);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-1">
        <label className="text-sm font-medium">Username</label>
        <input
          name="username"
          defaultValue={initialProfile.username ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium">Full name</label>
        <input
          name="full_name"
          defaultValue={initialProfile.full_name ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium">Class year</label>
        <input
          name="class_year"
          type="number"
          inputMode="numeric"
          defaultValue={initialProfile.class_year ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium">Gender</label>
        <input
          name="gender"
          defaultValue={initialProfile.gender ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium">School name</label>
        <input
          name="school_name"
          defaultValue={initialProfile.school_name ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium">School state</label>
        <input
          name="school_state"
          defaultValue={initialProfile.school_state ?? ""}
          className="input"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium">Bio</label>
        <textarea
          name="bio"
          defaultValue={initialProfile.bio ?? ""}
          className="input min-h-[120px]"
        />
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-medium">Profile photo URL</label>
        <input
          name="profile_pic_url"
          defaultValue={initialProfile.profile_pic_url ?? ""}
          className="input"
        />
      </div>

      <button type="submit" className="btn" disabled={saving}>
        {saving ? "Saving..." : "Save changes"}
      </button>

      {msg && <p className="text-sm text-green-700">{msg}</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
