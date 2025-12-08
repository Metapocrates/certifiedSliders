// src/app/api/roles/set-preference/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  const body = await request.json();
  const { role } = body;

  // Validate role
  const validRoles = ['athlete', 'parent', 'hs_coach', 'ncaa_coach'];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Map role to default route
  const routeMap: Record<string, string> = {
    athlete: '/me',
    parent: '/parent/dashboard',
    hs_coach: '/hs/portal',
    ncaa_coach: '/coach/portal'
  };

  // Update profile
  const { error } = await supabase
    .from('profiles')
    .update({
      role_preference: role,
      default_home_route: routeMap[role]
    })
    .eq('id', user.id);

  if (error) {
    console.error('Failed to set role preference:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }

  return NextResponse.json({ success: true, role, route: routeMap[role] });
}
