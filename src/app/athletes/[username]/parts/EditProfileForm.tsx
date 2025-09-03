"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "@/app/athletes/actions";

type Profile = {
  username: string;
  display_name: string;
  class_year: number | null;
  gender: string | null;
  school_name: string;
  school_state: string;
  bio: string | null;
};

export default function EditProfileForm({ initial }: { initial: Profile }) {
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        setMsg("");
        startTransition(async () => {
          const res = await updateProfile(fd);
          setMsg(res.message);
        });
      }}
      className="grid gap-3"
    >
      <label className="grid gap-1">
        <span className="text-sm font-medium">Username</span>
        <input name="username" defaultValue={initial.username} className="input" required />
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Display name</span>
        <input name="display_name" defaultValue={initial.display_name} className="input" required />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Class year</span>
          <input name="class_year" defaultValue={initial.class_year ?? ""} className="input" type="number" />
        </label>

        <label className="grid gap-1">
          <span className="text-sm font-medium">Gender</span>
          <select name="gender" defaultValue={initial.gender ?? ""} className="input">
            <option value="">—</option>
            <option value="M">M</option>
            <option value="F">F</option>
            <option value="Other">Other</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">School</span>
          <input name="school_name" defaultValue={initial.school_name} className="input" required />
        </label>
        <label className="grid gap-1">
          <span className="text-sm font-medium">State</span>
          <input name="school_state" defaultValue={initial.school_state} className="input uppercase" maxLength={2} required />
        </label>
      </div>

      <label className="grid gap-1">
        <span className="text-sm font-medium">Bio</span>
        <textarea name="bio" defaultValue={initial.bio ?? ""} className="input min-h-[120px]" />
      </label>

      <button type="submit" disabled={isPending} className="btn">
        {isPending ? "Saving..." : "Save changes"}
      </button>
      {msg && <div className="text-sm mt-1">{msg}</div>}
    </form>
  );
}
