import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * POST /api/profile/social-media
 * Update user's social media links
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { instagram_url, twitter_url, tiktok_url, youtube_url } = body;

    // Update social media links
    const { error } = await supabase
      .from('profiles')
      .update({
        instagram_url,
        twitter_url,
        tiktok_url,
        youtube_url,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Failed to update social media links:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Social media update failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
