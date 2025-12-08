// src/app/api/parent/respond-invitation/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServer();

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { linkId, action } = body;

    if (!linkId || !action) {
      return NextResponse.json({ error: 'Missing linkId or action' }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "accept" or "reject"' }, { status: 400 });
    }

    // Get the link to verify athlete ownership
    const { data: link, error: fetchError } = await supabase
      .from('parent_links')
      .select('id, athlete_id, status, parent_user_id')
      .eq('id', linkId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching parent link:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch invitation' }, { status: 500 });
    }

    if (!link) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Verify this user owns the athlete profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', link.athlete_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'You do not have permission to respond to this invitation' }, { status: 403 });
    }

    // Check if already responded
    if (link.status !== 'pending') {
      return NextResponse.json({ error: `Invitation already ${link.status}` }, { status: 409 });
    }

    // Update the link status
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    const { data: updatedLink, error: updateError } = await supabase
      .from('parent_links')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', linkId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating parent link:', updateError);
      return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      link: updatedLink,
      message: `Invitation ${action}ed successfully`
    });
  } catch (err) {
    console.error('Error responding to invitation:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
