import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

interface UpdateClassYearRequest {
  class_year: number;
  admin_override?: boolean;
  reason?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: UpdateClassYearRequest = await req.json();
    const { class_year, admin_override, reason } = body;

    // Validate class year
    if (!class_year || typeof class_year !== 'number') {
      return NextResponse.json(
        { error: 'Valid class year is required' },
        { status: 400 }
      );
    }

    const currentYear = new Date().getFullYear();
    if (class_year < currentYear || class_year > currentYear + 10) {
      return NextResponse.json(
        { error: `Class year must be between ${currentYear} and ${currentYear + 10}` },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServer();

    // Check if user is admin (needed for override)
    const { data: adminCheck } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const isAdmin = Boolean(adminCheck);

    // Get current profile state
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, class_year, class_year_locked_at, full_name, username')
      .eq('id', user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Check if class year is already locked
    if (currentProfile.class_year_locked_at) {
      // If locked and not an admin override, reject
      if (!isAdmin || !admin_override) {
        return NextResponse.json(
          {
            error: 'Class year is locked and cannot be changed. Contact support for assistance.',
            locked_at: currentProfile.class_year_locked_at,
            current_value: currentProfile.class_year,
          },
          { status: 403 }
        );
      }

      // Admin override - create audit log
      if (isAdmin && admin_override) {
        await supabase.from('audit_logs').insert({
          action: 'class_year_override',
          entity_type: 'profile',
          entity_id: user.id,
          actor_id: user.id,
          old_value: { class_year: currentProfile.class_year },
          new_value: { class_year },
          reason: reason || 'Admin override',
          metadata: {
            profile_name: currentProfile.full_name || currentProfile.username,
            locked_at: currentProfile.class_year_locked_at,
          },
        });
      }
    }

    // Update the class year
    // The database trigger will handle locking if it's the first time being set
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ class_year })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating class year:', updateError);
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      class_year,
      locked: !currentProfile.class_year_locked_at, // Will be locked after this update if it wasn't before
      was_override: isAdmin && admin_override,
    });
  } catch (error: any) {
    console.error('Class year update error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check lock status
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServer();

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('class_year, class_year_locked_at')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      class_year: profile.class_year,
      is_locked: Boolean(profile.class_year_locked_at),
      locked_at: profile.class_year_locked_at,
    });
  } catch (error: any) {
    console.error('Class year status check error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
