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
  class_year_locked_at: string | null;
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

  const [showClassYearConfirm, setShowClassYearConfirm] = useState(false);
  const [pendingClassYear, setPendingClassYear] = useState("");

  const isClassYearLocked = Boolean(initial.class_year_locked_at);
  const hasClassYear = Boolean(initial.class_year);

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
        <label className="mb-1 block text-sm font-medium">
          Full name
          <span className="ml-2 text-xs font-normal text-gray-500">(Synced from Athletic.net)</span>
        </label>
        <input
          name="full_name"
          defaultValue={initial.full_name}
          className="w-full rounded border px-3 py-2 bg-gray-50 text-gray-700 cursor-not-allowed"
          placeholder="Full name"
          required
          readOnly
          disabled
        />
        <p className="mt-1 text-xs text-gray-500 flex items-start gap-1">
          <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            Your name is locked to match your Athletic.net profile for verification purposes. Use nicknames/aliases below if needed.
          </span>
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Class year
          {isClassYearLocked && (
            <span className="ml-2 text-xs font-normal text-gray-500">(Locked)</span>
          )}
        </label>
        <input
          name="class_year"
          defaultValue={initial.class_year}
          className="w-full rounded border px-3 py-2 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
          placeholder="2028"
          inputMode="numeric"
          pattern="\d{4}"
          required
          disabled={isClassYearLocked}
          readOnly={isClassYearLocked}
        />
        {isClassYearLocked ? (
          <p className="mt-1 text-xs text-amber-600 flex items-start gap-1">
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            <span>
              Your graduation year is locked and cannot be changed. Contact support if you need assistance.
            </span>
          </p>
        ) : fe("class_year") ? (
          <p className="mt-1 text-xs text-red-600">{fe("class_year")}</p>
        ) : !hasClassYear ? (
          <p className="mt-1 text-xs text-amber-600 flex items-start gap-1">
            <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>
              Once you set your graduation year, it will be locked and cannot be changed.
            </span>
          </p>
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
