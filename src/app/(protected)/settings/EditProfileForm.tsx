"use client";

import { useFormState, useFormStatus } from "react-dom";
import { updateProfileAction } from "./actions";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function SubmitButton({ children }: { children: React.ReactNode }) {
    const { pending } = useFormStatus();
    return (
        <button type="submit" className="btn" disabled={pending}>
            {pending ? "Saving…" : children}
        </button>
    );
}

type Props = {
    initial: {
        username: string;
        full_name: string;
        class_year: number | null;
        school_name: string | null;
        school_state: string | null;
    };
};

export default function EditProfileForm({ initial }: Props) {
    const router = useRouter();
    const [saved, setSaved] = useState(false);
    const [state, formAction] = useFormState(updateProfileAction, null);

    useEffect(() => {
        if (state?.ok) {
            setSaved(true);
            // Refresh server data and /me summary
            router.refresh();
            const t = setTimeout(() => setSaved(false), 1500);
            return () => clearTimeout(t);
        }
    }, [state, router]);

    const fe = state?.ok ? {} : state?.fieldErrors ?? {};
    const formError = state?.ok ? undefined : state?.formError;

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                    name="username"
                    defaultValue={initial.username || ""}
                    className="w-full rounded border px-3 py-2"
                    placeholder="e.g., jdoe"
                />
                {fe.username && <p className="text-xs text-red-600 mt-1">{fe.username}</p>}
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Full name</label>
                <input
                    name="full_name"
                    defaultValue={initial.full_name || ""}
                    className="w-full rounded border px-3 py-2"
                    placeholder="Jane Doe"
                />
                {fe.full_name && <p className="text-xs text-red-600 mt-1">{fe.full_name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                    <label className="block text-sm font-medium mb-1">Class year</label>
                    <input
                        name="class_year"
                        type="number"
                        min={2024}
                        max={2099}
                        defaultValue={initial.class_year ?? ""}
                        className="w-full rounded border px-3 py-2"
                        placeholder="2028"
                    />
                    {fe.class_year && <p className="text-xs text-red-600 mt-1">{fe.class_year}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">School</label>
                    <input
                        name="school_name"
                        defaultValue={initial.school_name || ""}
                        className="w-full rounded border px-3 py-2"
                        placeholder="High School"
                    />
                    {fe.school_name && <p className="text-xs text-red-600 mt-1">{fe.school_name}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1">State (2-letter)</label>
                    <input
                        name="school_state"
                        defaultValue={initial.school_state || ""}
                        className="w-full rounded border px-3 py-2 uppercase"
                        placeholder="CA"
                        maxLength={2}
                    />
                    {fe.school_state && <p className="text-xs text-red-600 mt-1">{fe.school_state}</p>}
                </div>
            </div>

            {formError && (
                <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {formError}
                </div>
            )}

            <div className="flex items-center gap-3">
                <SubmitButton>Save</SubmitButton>
                {saved && (
                    <span className="text-sm text-green-700">Saved!</span>
                )}
            </div>
        </form>
    );
}