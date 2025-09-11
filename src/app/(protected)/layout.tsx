export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

// src/app/(protected)/layout.tsx
export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No auth checks or redirects here — let pages decide.
  return <>{children}</>;
}


