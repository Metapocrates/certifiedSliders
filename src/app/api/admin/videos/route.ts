import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * GET /api/admin/videos
 * List video submissions for admin moderation
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check
    // For now, assume authenticated users in /admin routes are admins

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('video_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    } else {
      // Default: show pending and ready videos that need review
      query = query.in('status', ['pending', 'ready', 'approved', 'featured']);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch videos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: data || [] });
  } catch (error) {
    console.error('Video listing failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
