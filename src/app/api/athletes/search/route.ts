// src/app/api/athletes/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get search query
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query must be at least 2 characters' }, { status: 400 });
  }

  // Search athletes by name or profile_id
  const { data: athletes, error } = await supabase
    .from('profiles')
    .select('id, profile_id, full_name, username, school_name, school_state, class_year')
    .eq('user_type', 'athlete')
    .eq('status', 'active')
    .or(`full_name.ilike.%${query}%,username.ilike.%${query}%,profile_id.ilike.%${query}%`)
    .order('full_name', { ascending: true })
    .limit(20);

  if (error) {
    console.error('Athlete search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }

  return NextResponse.json({ athletes: athletes || [] });
}
