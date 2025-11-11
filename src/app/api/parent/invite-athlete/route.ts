// src/app/api/parent/invite-athlete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  const body = await request.json();
  const { athleteId, note } = body;

  if (!athleteId) {
    return NextResponse.json({ error: 'Athlete ID required' }, { status: 400 });
  }

  // Check if athlete exists
  const { data: athlete } = await supabase
    .from('profiles')
    .select('id, user_type')
    .eq('id', athleteId)
    .eq('user_type', 'athlete')
    .maybeSingle();

  if (!athlete) {
    return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
  }

  // Check if link already exists
  const { data: existing } = await supabase
    .from('parent_links')
    .select('id, status')
    .eq('parent_user_id', user.id)
    .eq('athlete_id', athleteId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      error: `Link already exists with status: ${existing.status}`
    }, { status: 409 });
  }

  // Create parent link invitation
  const { data: link, error } = await supabase
    .from('parent_links')
    .insert({
      parent_user_id: user.id,
      athlete_id: athleteId,
      status: 'pending',
      invited_by: user.id,
      note: note || null
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create parent link:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }

  return NextResponse.json({ success: true, link });
}
