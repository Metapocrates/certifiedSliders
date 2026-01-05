// src/app/(protected)/parent/page.tsx
// Parent Portal root - redirects to dashboard
import { redirect } from "next/navigation";

export default function ParentPortalRootPage() {
  redirect("/parent/dashboard");
}
