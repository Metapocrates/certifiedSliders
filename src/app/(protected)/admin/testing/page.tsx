"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type PortalKey,
  PORTALS,
  PORTAL_KEYS,
  ADMIN_PREVIEW_COOKIE,
  IMPERSONATION_ENABLED,
  type AdminPreviewState,
  DEFAULT_ADMIN_PREVIEW_STATE,
} from "@/lib/portals/constants";
import PortalBadge from "@/components/portals/PortalBadge";
import { usePortalOptional } from "@/contexts/PortalContext";

interface TestUser {
  id: string;
  email: string | null;
  full_name: string | null;
  user_type: string | null;
  is_test_account: boolean;
}

interface AuditLogEntry {
  id: string;
  admin_id: string;
  action: string;
  portal_key: string | null;
  impersonated_user_id: string | null;
  created_at: string;
  meta: Record<string, unknown> | null;
}

export default function AdminTestingPage() {
  const router = useRouter();
  const portalContext = usePortalOptional();
  const [selectedPortal, setSelectedPortal] = useState<PortalKey | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TestUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get preview state from context (single source of truth)
  const previewState = portalContext?.adminPreview ?? DEFAULT_ADMIN_PREVIEW_STATE;

  // Sync selected portal with context state
  useEffect(() => {
    if (previewState.portalKey) {
      setSelectedPortal(previewState.portalKey);
    }
  }, [previewState.portalKey]);

  // Load audit logs
  useEffect(() => {
    loadAuditLogs();
  }, []);

  async function loadAuditLogs() {
    setIsLoadingLogs(true);
    try {
      const response = await fetch("/api/admin/portal-audit-logs");
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || []);
      }
    } catch {
      // Ignore errors loading logs
    } finally {
      setIsLoadingLogs(false);
    }
  }

  async function searchUsers() {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/search-users?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) {
        throw new Error("Failed to search users");
      }
      const data = await response.json();
      setSearchResults(data.users || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  }

  async function enablePortalPreview() {
    if (!selectedPortal || !portalContext) return;

    setError(null);
    try {
      // Use context method - this updates state AND persists to cookie
      await portalContext.setPortalOverride(selectedPortal);
      loadAuditLogs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to enable preview");
    }
  }

  async function startImpersonation(user: TestUser) {
    if (!IMPERSONATION_ENABLED || !portalContext) {
      setError("Impersonation is disabled in this environment");
      return;
    }

    setError(null);
    try {
      // Use context method - this updates state AND persists to cookie
      await portalContext.startImpersonation(
        user.id,
        user.full_name || user.email || user.id
      );
      loadAuditLogs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start impersonation");
    }
  }

  async function exitPreview() {
    if (!portalContext) return;

    setError(null);
    try {
      // Use context method - this clears state AND cookie
      await portalContext.exitPreview();
      setSelectedPortal("");
      loadAuditLogs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to exit preview");
    }
  }

  function goToPortal() {
    if (selectedPortal) {
      router.push(PORTALS[selectedPortal].basePath);
    }
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Portal Testing Tools</h1>
        <p className="text-muted-foreground">
          Admin-only tools for testing different portal views and user impersonation.
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/20">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-800 dark:text-red-300">{error}</div>
          </div>
        </div>
      )}

      {/* Current Status */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-xl font-semibold">Current Status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Mode</div>
            <div className="flex items-center gap-2">
              {!previewState.enabled && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  Normal
                </span>
              )}
              {previewState.mode === "portal_override" && previewState.enabled && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                  Portal Preview
                </span>
              )}
              {previewState.mode === "impersonation" && previewState.enabled && (
                <span className="inline-flex items-center rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                  Impersonating
                </span>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-sm font-medium text-muted-foreground">Active Portal</div>
            {previewState.portalKey ? (
              <PortalBadge portal={PORTALS[previewState.portalKey]} />
            ) : (
              <span className="text-sm text-muted-foreground">None selected</span>
            )}
          </div>

          {previewState.impersonatedUserId && (
            <div className="space-y-1 sm:col-span-2">
              <div className="text-sm font-medium text-muted-foreground">Impersonated User</div>
              <div className="text-sm">
                {previewState.impersonatedUserName || previewState.impersonatedUserId}
              </div>
            </div>
          )}
        </div>

        {previewState.enabled && (
          <button
            onClick={exitPreview}
            className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
          >
            Exit Preview Mode
          </button>
        )}
      </div>

      {/* Portal Preview */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Portal Preview
          </h2>
          <p className="text-sm text-muted-foreground">
            View the app as if you were using a different portal. UI will show the selected portal&apos;s layout and navigation.
            Server-side authorization still uses your admin account unless impersonation is active.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Select Portal</label>
            <select
              value={selectedPortal}
              onChange={(e) => setSelectedPortal(e.target.value as PortalKey | "")}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Choose a portal...</option>
              {PORTAL_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PORTALS[key].label} ({PORTALS[key].status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={enablePortalPreview}
              disabled={!selectedPortal}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enable Preview
            </button>
            <button
              onClick={goToPortal}
              disabled={!selectedPortal}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go to Portal
            </button>
          </div>
        </div>

        {/* Portal Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {PORTAL_KEYS.map((key) => {
            const portal = PORTALS[key];
            const isSelected = selectedPortal === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedPortal(key)}
                className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
                  isSelected
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                    : "border-border hover:border-muted-foreground/30"
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{portal.label}</span>
                    {portal.status !== "active" && (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {portal.status === "beta" ? "Beta" : "Coming Soon"}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">{portal.basePath}</div>
                </div>
                {isSelected && (
                  <svg className="h-5 w-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Impersonation */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            User Impersonation
            {!IMPERSONATION_ENABLED && (
              <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
                Disabled
              </span>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            {IMPERSONATION_ENABLED
              ? "Act as another user to test authorization and user-specific features. All actions are logged."
              : "Impersonation is disabled in this environment. Set NEXT_PUBLIC_ENABLE_ADMIN_IMPERSONATION=true to enable."}
          </p>
        </div>

        {IMPERSONATION_ENABLED && (
          <>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                placeholder="Search by email or name..."
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={searchUsers}
                disabled={isSearching || !searchQuery.trim()}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">{searchResults.length} user(s) found</div>
                <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between border-b border-border p-3 last:border-b-0"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.full_name || "No name"}</span>
                          {user.is_test_account && (
                            <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200">
                              Test
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email} • {user.user_type || "No type"}
                        </div>
                      </div>
                      <button
                        onClick={() => startImpersonation(user)}
                        className="rounded-md bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
                      >
                        Impersonate
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Audit Log */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Audit Log</h2>
          <button
            onClick={loadAuditLogs}
            disabled={isLoadingLogs}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isLoadingLogs ? "Loading..." : "Refresh"}
          </button>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent portal testing actions logged.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{log.action}</td>
                    <td className="px-3 py-2">
                      {log.portal_key && <span className="mr-2">Portal: {log.portal_key}</span>}
                      {log.impersonated_user_id && (
                        <span className="text-orange-600">User: {log.impersonated_user_id.slice(0, 8)}...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help */}
      <div className="rounded-lg border border-border bg-muted p-6 space-y-4">
        <h3 className="text-lg font-semibold">How It Works</h3>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong className="text-foreground">Portal Preview Mode:</strong> Changes the UI to show
            a different portal&apos;s layout, navigation, and styling. You&apos;ll see a yellow
            banner at the top indicating you&apos;re in preview mode. Server-side actions still
            authenticate as your admin account.
          </div>
          <div>
            <strong className="text-foreground">Impersonation Mode:</strong> Acts as another user
            for both UI and server-side authorization. You&apos;ll see an orange banner showing
            who you&apos;re impersonating. All actions are logged for audit purposes.
          </div>
          <div>
            <strong className="text-foreground">Test Accounts:</strong> Look for users tagged with
            &quot;Test&quot; in the search results - these are designated test accounts that are
            safe to impersonate without affecting real user data.
          </div>
        </div>
      </div>
    </div>
  );
}
