// src/app/(protected)/parent/page.tsx
import { redirect } from 'next/navigation';

export default function ParentRootPage() {
  // Always redirect to dashboard
  redirect('/parent/dashboard');
}
