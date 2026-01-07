"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type PortalKey,
  type PortalConfig,
  type AdminPreviewState,
  PORTALS,
  ADMIN_PREVIEW_COOKIE,
  DEFAULT_ADMIN_PREVIEW_STATE,
  getPortalForRole,
  IMPERSONATION_ENABLED,
} from "@/lib/portals/constants";

interface PortalContextValue {
  // Current active portal (resolved from override or user role)
  activePortal: PortalConfig | null;
  activePortalKey: PortalKey | null;

  // User's natural portal based on their role
  userPortal: PortalConfig | null;

  // Admin preview state
  adminPreview: AdminPreviewState;
  isAdminPreviewActive: boolean;
  isImpersonating: boolean;

  // Admin status
  isAdmin: boolean;

  // Actions
  setPortalOverride: (portalKey: PortalKey | null) => Promise<void>;
  startImpersonation: (userId: string, userName: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  exitPreview: () => Promise<void>;

  // Loading state
  isLoading: boolean;
}

const PortalContext = createContext<PortalContextValue | null>(null);

interface PortalProviderProps {
  children: ReactNode;
  initialUserRole?: string | null;
  isAdmin?: boolean;
  initialPreviewState?: AdminPreviewState | null;
}

export function PortalProvider({
  children,
  initialUserRole = null,
  isAdmin = false,
  initialPreviewState = null,
}: PortalProviderProps) {
  const [adminPreview, setAdminPreview] = useState<AdminPreviewState>(
    initialPreviewState || DEFAULT_ADMIN_PREVIEW_STATE
  );
  const [isLoading, setIsLoading] = useState(false);

  // Derive user's natural portal from their role
  const userPortal = initialUserRole ? getPortalForRole(initialUserRole) : null;

  // Resolve active portal based on admin preview or user role
  const activePortalKey = adminPreview.enabled && adminPreview.portalKey
    ? adminPreview.portalKey
    : (userPortal?.key || null);

  const activePortal = activePortalKey ? PORTALS[activePortalKey] : null;

  const isAdminPreviewActive = adminPreview.enabled && adminPreview.mode === "portal_override";
  const isImpersonating = adminPreview.enabled && adminPreview.mode === "impersonation";

  // Load preview state from cookie on mount
  useEffect(() => {
    if (!isAdmin) return;

    try {
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${ADMIN_PREVIEW_COOKIE}=`));

      if (cookieValue) {
        const value = cookieValue.split("=")[1];
        const parsed = JSON.parse(decodeURIComponent(value)) as AdminPreviewState;
        setAdminPreview(parsed);
      }
    } catch {
      // Invalid cookie, ignore
    }
  }, [isAdmin]);

  // Persist preview state to cookie
  const persistPreviewState = useCallback((state: AdminPreviewState) => {
    const value = encodeURIComponent(JSON.stringify(state));
    // Set cookie with 24h expiry, httpOnly false so we can read it client-side
    document.cookie = `${ADMIN_PREVIEW_COOKIE}=${value}; path=/; max-age=86400; samesite=lax`;
  }, []);

  // Log admin action
  const logAdminAction = useCallback(async (
    action: string,
    portalKey?: PortalKey | null,
    impersonatedUserId?: string | null
  ) => {
    try {
      await fetch("/api/admin/audit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          portalKey,
          impersonatedUserId,
          meta: {
            userAgent: navigator.userAgent,
          },
        }),
      });
    } catch {
      // Don't block on audit log failure
      console.error("Failed to log admin action");
    }
  }, []);

  // Set portal override (admin preview mode)
  const setPortalOverride = useCallback(async (portalKey: PortalKey | null) => {
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const newState: AdminPreviewState = portalKey
        ? {
            mode: "portal_override",
            portalKey,
            impersonatedUserId: null,
            impersonatedUserName: null,
            enabled: true,
            updatedAt: new Date().toISOString(),
          }
        : DEFAULT_ADMIN_PREVIEW_STATE;

      setAdminPreview(newState);
      persistPreviewState(newState);

      await logAdminAction(
        portalKey ? "SET_PORTAL_OVERRIDE" : "CLEAR_PORTAL_OVERRIDE",
        portalKey
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, persistPreviewState, logAdminAction]);

  // Start impersonation
  const startImpersonation = useCallback(async (userId: string, userName: string) => {
    if (!isAdmin || !IMPERSONATION_ENABLED) return;

    setIsLoading(true);
    try {
      const newState: AdminPreviewState = {
        mode: "impersonation",
        portalKey: adminPreview.portalKey,
        impersonatedUserId: userId,
        impersonatedUserName: userName,
        enabled: true,
        updatedAt: new Date().toISOString(),
      };

      setAdminPreview(newState);
      persistPreviewState(newState);

      await logAdminAction("START_IMPERSONATION", adminPreview.portalKey, userId);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, adminPreview.portalKey, persistPreviewState, logAdminAction]);

  // Stop impersonation
  const stopImpersonation = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const newState: AdminPreviewState = {
        ...adminPreview,
        mode: adminPreview.portalKey ? "portal_override" : "normal",
        impersonatedUserId: null,
        impersonatedUserName: null,
        enabled: !!adminPreview.portalKey,
        updatedAt: new Date().toISOString(),
      };

      setAdminPreview(newState);
      persistPreviewState(newState);

      await logAdminAction("STOP_IMPERSONATION", adminPreview.portalKey, adminPreview.impersonatedUserId);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, adminPreview, persistPreviewState, logAdminAction]);

  // Exit all preview modes
  const exitPreview = useCallback(async () => {
    if (!isAdmin) return;

    setIsLoading(true);
    try {
      const prevState = adminPreview;
      setAdminPreview(DEFAULT_ADMIN_PREVIEW_STATE);
      persistPreviewState(DEFAULT_ADMIN_PREVIEW_STATE);

      // Clear the cookie
      document.cookie = `${ADMIN_PREVIEW_COOKIE}=; path=/; max-age=0`;

      await logAdminAction(
        prevState.impersonatedUserId ? "STOP_IMPERSONATION" : "CLEAR_PORTAL_OVERRIDE",
        prevState.portalKey,
        prevState.impersonatedUserId
      );
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, adminPreview, persistPreviewState, logAdminAction]);

  const value: PortalContextValue = {
    activePortal,
    activePortalKey,
    userPortal,
    adminPreview,
    isAdminPreviewActive,
    isImpersonating,
    isAdmin,
    setPortalOverride,
    startImpersonation,
    stopImpersonation,
    exitPreview,
    isLoading,
  };

  return (
    <PortalContext.Provider value={value}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortal() {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortal must be used within a PortalProvider");
  }
  return context;
}

/**
 * Optional hook that doesn't throw if context is missing
 * Useful for components that might render outside the provider
 */
export function usePortalOptional() {
  return useContext(PortalContext);
}
