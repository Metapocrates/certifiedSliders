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
          username
        )
      `)
      .order('granted_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch admins:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch emails from auth.users for each admin
    const adminsWithEmails = await Promise.all(
      (admins || []).map(async (admin) => {
        const { data: { user: authUser } } = await adminSupabase.auth.admin.getUserById(admin.user_id);
        return {
          ...admin,
          profiles: admin.profiles ? {
            ...admin.profiles,
            email: authUser?.email || null,
          } : null,
        };
      })
    );

    return NextResponse.json({ admins: adminsWithEmails });
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

    // Find the user by email in auth.users
    const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers();

    if (listError) {
      console.error('Error listing users:', listError);
      return NextResponse.json({ error: 'Error finding user' }, { status: 500 });
    }

    const authUser = users?.find(u => u.email?.toLowerCase() === email.toLowerCase().trim());

    if (!authUser) {
      return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
    }

    // Get profile info
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
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
        email: authUser.email,
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
