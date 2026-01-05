// src/app/(protected)/parent/submissions/new/page.tsx
// Parent result submission is out of scope for beta - redirect to dashboard
import { redirect } from "next/navigation";

export default function ParentSubmitResultPage() {
  redirect("/parent/dashboard");
}
