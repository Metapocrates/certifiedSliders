// src/app/(protected)/parent/submissions/page.tsx
// Legacy route - redirect to new activity page
import { redirect } from 'next/navigation';

export default function ParentSubmissionsPage() {
  redirect('/parent/activity');
}
