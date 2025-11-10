import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { supabaseServer } from '@/lib/supabase/server';

export const runtime = 'edge';

/**
 * GET /api/admin/admins
 * List all admin users
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const { data: isAdmin } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Use admin client to fetch all admins with profile info
    const adminSupabase = createSupabaseAdmin();

    const { data: admins, error } = await adminSupabase
      .from('admins')
      .select(`
        user_id,
        granted_at,
        notes,
        granted_by,
        profiles:user_id (
          full_name,
          email,
          username
        )
      `)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch admins:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ admins: admins || [] });
  } catch (error) {
    console.error('Admin listing failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/admins
 * Grant admin access to a user
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = supabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if current user is admin
    const { data: isAdmin } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { email, notes } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Use admin client to find user by email
    const adminSupabase = createSupabaseAdmin();

    // First, find the user by email in profiles table
    const { data: profile, error: profileError } = await adminSupabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (profileError) {
      console.error('Error finding user:', profileError);
      return NextResponse.json({ error: 'Error finding user' }, { status: 500 });
    }

    if (!profile) {
      return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
    }

    // Check if already admin
    const { data: existingAdmin } = await adminSupabase
      .from('admins')
      .select('user_id')
      .eq('user_id', profile.id)
      .maybeSingle();

    if (existingAdmin) {
      return NextResponse.json({ error: 'User is already an admin' }, { status: 400 });
    }

    // Grant admin access
    const { error: insertError } = await adminSupabase
      .from('admins')
      .insert({
        user_id: profile.id,
        granted_by: user.id,
        notes: notes || null,
      });

    if (insertError) {
      console.error('Failed to grant admin access:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      admin: {
        user_id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
      },
    });
  } catch (error) {
    console.error('Grant admin failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
