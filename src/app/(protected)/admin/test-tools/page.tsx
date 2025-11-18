"use client";

import { useState } from "react";

export default function TestToolsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleResetTestData() {
    // Confirm action
    const confirmed = confirm(
      "Are you sure you want to delete all test coaches and related data for Certified Sliders Test University?\n\n" +
      "This will remove:\n" +
      "- All program memberships for test coaches\n" +
      "- All verification records for test coaches\n" +
      "- All domain challenges for test coaches\n" +
      "- All audit log entries for test coaches\n\n" +
      "This action cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/admin/reset-test-data", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset test data");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Test University Tools</h1>
        <p className="text-muted-foreground">
          Administrative tools for managing test data and test coaches.
        </p>
      </div>

      {/* Reset Test Data Card */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg
              className="h-5 w-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Reset Test University Data
          </h2>
          <p className="text-sm text-muted-foreground">
            Use this to clear test coaches and related test data for Certified Sliders Test University (TEST ONLY).
            This does not affect real programs, real athletes, or real coaches.
          </p>
        </div>

        <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <div className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
            What will be deleted:
          </div>
          <ul className="mt-2 space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
            <li>• All program memberships for test coaches</li>
            <li>• All verification records for test coaches</li>
            <li>• All domain challenges for test coaches</li>
            <li>• All audit log entries for test coaches</li>
          </ul>
          <div className="mt-3 text-sm font-medium text-yellow-900 dark:text-yellow-200">
            What will NOT be deleted:
          </div>
          <ul className="mt-2 space-y-1 text-sm text-yellow-800 dark:text-yellow-300">
            <li>• The test program itself (Certified Sliders Test University)</li>
            <li>• Athlete profiles and data</li>
            <li>• Real NCAA programs and coaches</li>
          </ul>
        </div>

        <button
          onClick={handleResetTestData}
          disabled={loading}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Resetting..." : "Reset Test University Data"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <div className="text-sm font-medium text-red-900 dark:text-red-200">Error</div>
              <div className="mt-1 text-sm text-red-800 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Success Display */}
      {result && result.success && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-900/20">
          <div className="flex items-start gap-3">
            <svg
              className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-sm font-medium text-green-900 dark:text-green-200">
                  Success
                </div>
                <div className="mt-1 text-sm text-green-800 dark:text-green-300">
                  {result.message}
                </div>
              </div>

              {result.deleted && (
                <div className="rounded-md border border-green-200 bg-green-100 p-3 dark:border-green-800 dark:bg-green-900/30">
                  <div className="text-xs font-medium text-green-900 dark:text-green-200 mb-2">
                    Deleted Records:
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-green-800 dark:text-green-300">
                    <div>Program Memberships: {result.deleted.memberships}</div>
                    <div>Verifications: {result.deleted.verifications}</div>
                    <div>Domain Challenges: {result.deleted.challenges}</div>
                    <div>Audit Logs: {result.deleted.auditLogs}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="rounded-lg border border-border bg-muted p-6 space-y-4">
        <h3 className="text-lg font-semibold">About Test University</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong>Certified Sliders Test University</strong> is a special NCAA program created for internal testing.
            It allows developers and QA testers to register as coaches using non-.edu email addresses (Gmail, iCloud, Outlook, Yahoo).
          </p>
          <p>
            When signing up as a coach, select &quot;Certified Sliders Test University Track &amp; Field&quot; from the program list.
            You&apos;ll see a &quot;(TEST ONLY)&quot; badge next to it.
          </p>
          <p>
            Test coaches are automatically verified and can access all coach portal features just like real coaches.
            A yellow banner at the top of the portal will remind you that you&apos;re in test mode.
          </p>
          <p className="font-medium">
            Use the &quot;Reset Test University Data&quot; button above to clean up test coaches and start fresh.
          </p>
        </div>
      </div>
    </div>
  );
}
