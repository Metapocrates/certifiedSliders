import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'edge';

type ProfileStatus = 'active' | 'archived' | 'deleted' | 'suspended';

/**
 * POST /api/admin/profiles/status
 * Update profile status (archive, delete, suspend, reactivate)
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Add admin role check

    const body = await req.json();
    const { profileId, status, reason } = body;

    if (!profileId || !status) {
      return NextResponse.json({ error: 'Missing profileId or status' }, { status: 400 });
    }

    const validStatuses: ProfileStatus[] = ['active', 'archived', 'deleted', 'suspended'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Use admin client to bypass RLS
    const adminSupabase = createSupabaseAdmin();

    const { error } = await adminSupabase
      .from('profiles')
      .update({
        status,
        status_changed_at: new Date().toISOString(),
        status_changed_by: user.id,
        status_reason: reason || null,
      })
      .eq('id', profileId);

    if (error) {
      console.error('Failed to update profile status:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If status is 'deleted', consider cascading to related data
    // For now, we'll keep results/videos but just hide the profile

    return NextResponse.json({ ok: true, status });
  } catch (error) {
    console.error('Status update failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
