import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { getSessionUser } from '@/lib/auth';

export const runtime = 'nodejs';

interface AcceptToSRequest {
  action_type: 'submit_result' | 'link_account' | 'general';
  tos_version: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: AcceptToSRequest = await req.json();
    const { action_type, tos_version } = body;

    if (!action_type || !tos_version) {
      return NextResponse.json(
        { error: 'action_type and tos_version are required' },
        { status: 400 }
      );
    }

    // Validate action_type
    const validActions = ['submit_result', 'link_account', 'general'];
    if (!validActions.includes(action_type)) {
      return NextResponse.json(
        { error: 'Invalid action_type' },
        { status: 400 }
      );
    }

    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServer();

    // Get IP address and user agent for audit trail
    const ip_address = req.headers.get('x-forwarded-for')?.split(',')[0] ||
                      req.headers.get('x-real-ip') ||
                      null;
    const user_agent = req.headers.get('user-agent') || null;

    // Record the ToS acceptance
    // UNIQUE constraint prevents duplicates
    const { error: insertError } = await supabase
      .from('tos_acceptances')
      .insert({
        user_id: user.id,
        action_type,
        tos_version,
        ip_address,
        user_agent,
      });

    // Ignore unique constraint violations (user already accepted this version)
    if (insertError && !insertError.message.includes('duplicate key')) {
      console.error('Error recording ToS acceptance:', insertError);
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      );
    }

    // Update general ToS acceptance on profile if not a specific action
    if (action_type === 'general') {
      await supabase
        .from('profiles')
        .update({
          tos_accepted_at: new Date().toISOString(),
          tos_version,
        })
        .eq('id', user.id);
    }

    return NextResponse.json({
      ok: true,
      action_type,
      tos_version,
    });
  } catch (error: any) {
    console.error('ToS acceptance error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user has accepted ToS for an action
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action_type = searchParams.get('action_type');
    const min_version = searchParams.get('min_version') || '1.0';

    if (!action_type) {
      return NextResponse.json(
        { error: 'action_type parameter is required' },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    // Check if user has accepted
    const { data, error } = await supabase
      .from('tos_acceptances')
      .select('id, tos_version, accepted_at')
      .eq('user_id', user.id)
      .eq('action_type', action_type)
      .gte('tos_version', min_version)
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      accepted: Boolean(data),
      acceptance: data || null,
    });
  } catch (error: any) {
    console.error('ToS check error:', error);
    return NextResponse.json(
      { error: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
