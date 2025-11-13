"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { updateSimpleProfileAction } from "./actions";

type Initial = {
  username: string;
  full_name: string;
  bio: string;
  email: string;
};

type ActionResult =
  | { ok: true }
  | { ok: false; fieldErrors?: Record<string, string>; formError?: string };

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

export default function SimpleProfileForm({ initial }: { initial: Initial }) {
  const [state, formAction] = useFormState<FormState, FormData>(
    updateSimpleProfileAction as unknown as (p: FormState, f: FormData) => Promise<FormState>,
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
          className={`rounded-lg border px-3 py-2 text-sm ${
            flash.kind === "ok"
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
            Letters, numbers, dashes and underscores. This will be your unique identifier.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Full name</label>
        <input
          name="full_name"
          defaultValue={initial.full_name}
          className="w-full rounded border px-3 py-2"
          placeholder="Your full name"
          required
        />
        {fe("full_name") ? (
          <p className="mt-1 text-xs text-red-600">{fe("full_name")}</p>
        ) : (
          <p className="mt-1 text-xs text-gray-500">
            Your full name as you&apos;d like it displayed
          </p>
        )}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Bio</label>
        <textarea
          name="bio"
          defaultValue={initial.bio}
          rows={4}
          className="w-full rounded border px-3 py-2"
          placeholder="Tell us about yourself (optional)"
        />
        {fe("bio") ? (
          <p className="mt-1 text-xs text-red-600">{fe("bio")}</p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Email</label>
        <input
          type="email"
          value={initial.email}
          disabled
          className="w-full rounded border px-3 py-2 bg-gray-50 text-gray-700 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-gray-500">
          Email cannot be changed. Contact support if needed.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <SubmitBtn label="Save Profile" />
      </div>

      {state && !state.ok && state.formError ? (
        <p className="text-sm text-red-700">{state.formError}</p>
      ) : null}
    </form>
  );
}
