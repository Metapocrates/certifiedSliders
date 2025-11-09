import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseServer();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get list of followed athlete IDs
    const { data: follows } = await supabase
      .from('follows')
      .select('followed_id')
      .eq('follower_id', user.id);

    const followedIds = (follows || []).map(f => f.followed_id);

    if (followedIds.length === 0) {
      return NextResponse.json({ activities: [], hasMore: false });
    }

    // Fetch recent results from followed athletes
    const { data: results } = await supabase
      .from('results')
      .select(`
        id,
        athlete_id,
        event,
        mark,
        meet_name,
        meet_date,
        season,
        created_at,
        profiles!inner(id, full_name, username, profile_id, profile_pic_url)
      `)
      .in('athlete_id', followedIds)
      .in('status', ['verified', 'approved'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Fetch recent approved videos from followed athletes (when video system is implemented)
    // For now, we'll just show results

    // Transform results into activity items
    const activities = (results || []).map(result => ({
      id: result.id,
      type: 'result' as const,
      athleteId: result.athlete_id,
      athleteName: result.profiles.full_name || result.profiles.username,
      athleteProfileId: result.profiles.profile_id,
      athleteProfilePic: result.profiles.profile_pic_url,
      timestamp: result.created_at,
      data: {
        event: result.event,
        mark: result.mark,
        meetName: result.meet_name,
        meetDate: result.meet_date,
        season: result.season,
      },
    }));

    // Sort by timestamp
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return NextResponse.json({
      activities,
      hasMore: activities.length === limit,
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
