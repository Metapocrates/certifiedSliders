// src/app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { resolveDefaultRouteForUser } from '@/lib/roles/resolveDefaultRouteForUser';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/dashboard');
  }

  // Resolve and redirect to default route
  const route = await resolveDefaultRouteForUser(user.id);
  redirect(route);
}
