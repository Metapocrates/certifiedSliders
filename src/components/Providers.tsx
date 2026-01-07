"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { PortalProvider } from "@/contexts/PortalContext";

interface ProvidersProps {
  children: ReactNode;
  isAdmin?: boolean;
  userRole?: string | null;
}

export default function Providers({
  children,
  isAdmin = false,
  userRole = null,
}: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <PortalProvider isAdmin={isAdmin} initialUserRole={userRole}>
        {children}
      </PortalProvider>
    </ThemeProvider>
  );
}
