"use client";

import { usePortalOptional } from "@/contexts/PortalContext";
import { PORTALS } from "@/lib/portals/constants";

/**
 * Banner that displays when admin is in preview or impersonation mode
 * Should be rendered at the top of the page layout
 */
export default function AdminPreviewBanner() {
  const portalContext = usePortalOptional();

  // Don't render if no context or not in preview mode
  if (!portalContext || !portalContext.isAdmin) {
    return null;
  }

  const { adminPreview, isAdminPreviewActive, isImpersonating, exitPreview, isLoading } = portalContext;

  // Not in any preview mode
  if (!adminPreview.enabled) {
    return null;
  }

  const portalLabel = adminPreview.portalKey
    ? PORTALS[adminPreview.portalKey].label
    : "Unknown Portal";

  if (isImpersonating) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-md">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span>
            <strong>IMPERSONATING:</strong>{" "}
            {adminPreview.impersonatedUserName || adminPreview.impersonatedUserId}
            {adminPreview.portalKey && (
              <span className="ml-2 opacity-75">({portalLabel})</span>
            )}
          </span>
        </div>
        <button
          onClick={() => exitPreview()}
          disabled={isLoading}
          className="rounded bg-white/20 px-3 py-1 text-xs font-semibold transition hover:bg-white/30 disabled:opacity-50"
        >
          {isLoading ? "..." : "Exit"}
        </button>
      </div>
    );
  }

  if (isAdminPreviewActive) {
    return (
      <div className="sticky top-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-sm font-medium text-white shadow-md">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span>
            <strong>ADMIN PREVIEW MODE:</strong> {portalLabel}
          </span>
        </div>
        <button
          onClick={() => exitPreview()}
          disabled={isLoading}
          className="rounded bg-white/20 px-3 py-1 text-xs font-semibold transition hover:bg-white/30 disabled:opacity-50"
        >
          {isLoading ? "..." : "Exit"}
        </button>
      </div>
    );
  }

  return null;
}
