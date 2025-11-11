"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTeamAction } from "@/app/(protected)/hs/portal/create-team/actions";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function CreateTeamForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = await createTeamAction(formData);

      if (result.success) {
        router.push("/hs/portal");
        router.refresh();
      } else {
        setError(result.error || "Failed to create team");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/20 p-4">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="school_name" className="block text-sm font-medium text-app mb-2">
          School Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="school_name"
          name="school_name"
          required
          className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
          placeholder="e.g., Lincoln High School"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-app mb-2">
            City
          </label>
          <input
            type="text"
            id="city"
            name="city"
            className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
            placeholder="e.g., Portland"
          />
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-app mb-2">
            State <span className="text-red-500">*</span>
          </label>
          <select
            id="state"
            name="state"
            required
            className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
          >
            <option value="">Select state...</option>
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="division" className="block text-sm font-medium text-app mb-2">
            Division
          </label>
          <input
            type="text"
            id="division"
            name="division"
            className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
            placeholder="e.g., D1, 6A, etc."
          />
        </div>

        <div>
          <label htmlFor="gender" className="block text-sm font-medium text-app mb-2">
            Team Gender <span className="text-red-500">*</span>
          </label>
          <select
            id="gender"
            name="gender"
            required
            className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
          >
            <option value="">Select...</option>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="coed">Coed</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="contact_email" className="block text-sm font-medium text-app mb-2">
          Contact Email
        </label>
        <input
          type="email"
          id="contact_email"
          name="contact_email"
          className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
          placeholder="team@school.edu"
        />
      </div>

      <div>
        <label htmlFor="website_url" className="block text-sm font-medium text-app mb-2">
          Website URL
        </label>
        <input
          type="url"
          id="website_url"
          name="website_url"
          className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
          placeholder="https://..."
        />
      </div>

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-app mb-2">
          Your Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          className="w-full rounded-md border border-app bg-background px-3 py-2 text-app focus:border-scarlet focus:outline-none focus:ring-1 focus:ring-scarlet"
          placeholder="e.g., Head Coach, Distance Coach"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_public"
          name="is_public"
          className="h-4 w-4 rounded border-app text-scarlet focus:ring-scarlet"
        />
        <label htmlFor="is_public" className="text-sm text-app">
          Make team page public (athletes can find and request to join)
        </label>
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-scarlet px-4 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Creating..." : "Create Team"}
        </button>
      </div>
    </form>
  );
}
