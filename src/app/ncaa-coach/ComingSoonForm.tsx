"use client";

import { useState, useTransition } from "react";
import { submitPortalInterestAction } from "./actions";

interface ComingSoonFormProps {
  initialNotify: boolean;
  initialFeedback: string;
}

export default function ComingSoonForm({ initialNotify, initialFeedback }: ComingSoonFormProps) {
  const [notifyMe, setNotifyMe] = useState(initialNotify);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const formData = new FormData(e.currentTarget);
        await submitPortalInterestAction(formData);
        setSubmitted(true);

        // Reset submitted state after 3 seconds
        setTimeout(() => setSubmitted(false), 3000);
      } catch (error) {
        console.error("Failed to submit:", error);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-app mb-4">Stay Updated</h3>
        <p className="text-sm text-muted mb-4">
          Be the first to know when the NCAA Coach Portal launches.
        </p>
      </div>

      {/* Notify checkbox */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="notify"
          name="notify"
          checked={notifyMe}
          onChange={(e) => setNotifyMe(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-scarlet focus:ring-scarlet"
        />
        <label htmlFor="notify" className="text-sm text-muted-foreground cursor-pointer">
          Notify me when this portal launches
        </label>
      </div>

      {/* Feedback textarea */}
      <div className="space-y-2">
        <label htmlFor="feedback" className="text-sm font-medium text-app">
          What would be most helpful for you? (Optional)
        </label>
        <textarea
          id="feedback"
          name="feedback"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-app bg-background px-4 py-2 text-sm text-app placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-scarlet"
          placeholder="Tell us what features would be most valuable to you..."
        />
      </div>

      {/* Submit button */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-scarlet px-6 py-2 text-sm font-semibold text-white transition hover:bg-scarlet/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Saving..." : "Save Preferences"}
        </button>

        {submitted && (
          <p className="text-sm text-green-600 font-medium">
            ✓ Thanks! We'll keep you posted.
          </p>
        )}
      </div>
    </form>
  );
}
