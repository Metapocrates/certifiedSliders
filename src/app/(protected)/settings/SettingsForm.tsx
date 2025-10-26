// src/app/(protected)/settings/SettingsForm.tsx
"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction } from "./actions";
import { HighSchoolSelector } from "@/components/forms/HighSchoolSelector";

type Initial = {
  username: string;
  full_name: string;
  class_year: string;
  school_name: string;
  school_state: string;
  profile_pic_url: string;
  bio: string;
  email: string;
};

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string };

// Allow null as the initial form state to satisfy TS.
type FormState = ActionResult | null;

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export default function SettingsForm({ initial }: { initial: Initial }) {
  const [state, formAction] = useFormState<FormState, FormData>(
    // cast avoids mismatch between our widened FormState and action's return
    updateProfileAction as unknown as (p: FormState, f: FormData) => Promise<FormState>,
    null
  );

  const [flash, setFlash] =
    useState<null | { kind: "ok" | "err"; text: string }>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) setFlash({ kind: "ok", text: "Profile saved." });
    else if (!state.ok && state.formError)
      setFlash({ kind: "err", text: state.formError });
    else if (!state.ok && state.fieldErrors)
      setFlash({ kind: "err", text: "Please fix the highlighted fields." });
  }, [state]);

  const fe = (name: string) =>
    state && !state.ok ? state.fieldErrors?.[name] : undefined;

  return (
    <form action={formAction} className="space-y-5 rounded-xl border p-4">
      {flash ? (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${flash.kind === "ok"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-red-300 bg-red-50 text-red-800"
            }`}
        >
          {flash.text}
        </div>
      ) : null}

      <div>
        <label className="mb-1 block text-sm font-medium">Username</label>
        <input
          name="username"
          defaultValue={initial.username}
          className="w-full rounded border px-3 py-2"
          placeholder="your-handle"
          required
        />
        {fe("username") ? (
          <p className="mt-1 text-xs text-red-600">{fe("username")}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Letters, numbers, dashes and underscores.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Full name</label>
        <input
          name="full_name"
          defaultValue={initial.full_name}
          className="w-full rounded border px-3 py-2"
          placeholder="Full name"
          required
        />
        {fe("full_name") ? (
          <p className="mt-1 text-xs text-red-600">{fe("full_name")}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Class year</label>
        <input
          name="class_year"
          defaultValue={initial.class_year}
          className="w-full rounded border px-3 py-2"
          placeholder="2028"
          inputMode="numeric"
          pattern="\d{4}"
          required
        />
        {fe("class_year") ? (
          <p className="mt-1 text-xs text-red-600">{fe("class_year")}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">Enter a 4-digit year.</p>
        )}
      </div>

      <HighSchoolSelector
        defaultSchool={initial.school_name}
        defaultState={initial.school_state}
        schoolError={fe("school_name")}
        stateError={fe("school_state")}
      />

      <div>
        <label className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          name="bio"
          defaultValue={initial.bio}
          rows={4}
          className="w-full rounded border px-3 py-2"
          placeholder="Optional: achievements, goals, notes…"
        />
      </div>

      <div className="flex items-center gap-3">
        <SubmitBtn label="Save Profile" />
        <a
          href={initial.username ? `/athletes/${initial.username}` : "/me"}
          className="text-sm underline"
        >
          View public page
        </a>
      </div>

      {state && !state.ok && state.formError ? (
        <p className="text-sm text-red-700">{state.formError}</p>
      ) : null}
    </form>
  );
}
