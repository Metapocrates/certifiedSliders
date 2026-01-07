"use client";

import { usePortalOptional } from "@/contexts/PortalContext";
import { type PortalConfig } from "@/lib/portals/constants";

interface PortalBadgeProps {
  /** Override the portal to display (useful when context isn't available) */
  portal?: PortalConfig | null;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show status badge (beta, coming soon) */
  showStatus?: boolean;
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

const statusLabels = {
  active: null,
  beta: "Beta",
  coming_soon: "Coming Soon",
};

export default function PortalBadge({
  portal: portalProp,
  size = "md",
  showStatus = true,
  className = "",
}: PortalBadgeProps) {
  const portalContext = usePortalOptional();
  const portal = portalProp ?? portalContext?.activePortal;

  if (!portal) {
    return null;
  }

  const statusLabel = showStatus ? statusLabels[portal.status] : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border font-medium ${portal.badgeClass} ${sizeClasses[size]} ${className}`}
    >
      <span className="font-semibold">{portal.shortLabel}</span>
      {statusLabel && (
        <span className="rounded bg-current/10 px-1 py-0.5 text-[0.65em] uppercase tracking-wider opacity-75">
          {statusLabel}
        </span>
      )}
    </span>
  );
}
