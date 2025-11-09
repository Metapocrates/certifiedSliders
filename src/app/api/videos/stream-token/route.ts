import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';

/**
 * Generate signed token for Cloudflare Stream playback
 * Required when videos are uploaded with requireSignedURLs=true
 *
 * Uses JWT with HS256 algorithm
 */
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { uid, expSec = 3600 } = await req.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 });
    }

    // Check if signing is configured
    const keyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID;
    const secret = process.env.CLOUDFLARE_STREAM_SIGNING_SECRET;

    if (!keyId || !secret) {
      return NextResponse.json(
        { error: 'Signed URLs not configured on server' },
        { status: 501 }
      );
    }

    // Verify user has access to this video
    const { data: video } = await supabase
      .from('video_submissions')
      .select('id, uploader_id, status')
      .eq('provider_asset_id', uid)
      .eq('provider', 'stream')
      .maybeSingle();

    // Allow access if:
    // 1. User owns the video, OR
    // 2. Video is approved/featured and user is authenticated
    const isOwner = video?.uploader_id === user.id;
    const isPublic = video?.status === 'approved' || video?.status === 'featured';

    if (!video || (!isOwner && !isPublic)) {
      return NextResponse.json({ error: 'Video not found or access denied' }, { status: 404 });
    }

    // Create JWT token manually (avoid adding jsonwebtoken dependency)
    const header = {
      alg: 'HS256',
      typ: 'JWT',
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: uid,
      kid: keyId,
      exp: now + expSec,
      nbf: now,
    };

    // Base64url encode
    const base64url = (str: string) =>
      Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(payload));

    // Create signature
    const crypto = await import('crypto');
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const token = `${headerB64}.${payloadB64}.${signature}`;

    return NextResponse.json({
      token,
      expiresAt: new Date((now + expSec) * 1000).toISOString(),
    });
  } catch (error) {
    console.error('Token generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
