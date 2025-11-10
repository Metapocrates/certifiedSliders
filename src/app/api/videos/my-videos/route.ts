import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';

/**
 * GET /api/videos/my-videos
 * Fetch current user's video submissions
 */
export async function GET(req: NextRequest) {
  const supabase = createSupabaseServer();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: videos, error } = await supabase
      .from('video_submissions')
      .select('id, title, description, status, playback_url, poster_url, duration_seconds, created_at')
      .eq('uploader_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch videos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ videos: videos || [] });
  } catch (error) {
    console.error('My videos error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
