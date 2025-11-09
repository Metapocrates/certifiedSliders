import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/compat';
import { buildTusMetadata, extractUidFromLocation } from '@/lib/videos/tus-helpers';

/**
 * Tus resumable upload endpoint for large video files (>200MB)
 * Proxies to Cloudflare Stream with Direct Creator Upload
 *
 * This route handles the initial POST request from tus client.
 * Subsequent PATCH requests go directly to Cloudflare Stream.
 */

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Tighten in production
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
    },
  });
}

export async function POST(req: NextRequest) {
  const supabase = createSupabaseServer();

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get tus headers
    const uploadLength = req.headers.get('upload-length');
    const uploadMetadata = req.headers.get('upload-metadata');

    if (!uploadLength) {
      return NextResponse.json(
        { error: 'Missing Upload-Length header' },
        { status: 400 }
      );
    }

    // Build metadata if not provided by client
    const metadata = uploadMetadata || buildTusMetadata(600, 120, false);

    // Create tus upload session with Cloudflare Stream
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream?direct_user=true`;

    const cfRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': uploadLength,
        'Upload-Metadata': metadata,
      },
      cache: 'no-store',
    });

    const location = cfRes.headers.get('Location');
    if (!cfRes.ok || !location) {
      const errTxt = await cfRes.text();
      console.error('Cloudflare Stream tus error:', errTxt);
      return NextResponse.json(
        { error: errTxt || 'No Location header from Stream' },
        { status: cfRes.status || 400 }
      );
    }

    // Extract UID from location header
    const uid = extractUidFromLocation(location);
    if (!uid) {
      console.error('Failed to extract UID from location:', location);
      return NextResponse.json(
        { error: 'Invalid location header from Stream' },
        { status: 500 }
      );
    }

    // Get title/description from custom metadata if provided
    // Expected format in Upload-Metadata: title <base64>, description <base64>
    let title = 'Untitled Video';
    let description: string | null = null;

    if (uploadMetadata) {
      const pairs = uploadMetadata.split(',').map(p => p.trim());
      for (const pair of pairs) {
        const [key, value] = pair.split(' ', 2);
        if (key === 'title' && value) {
          try {
            title = atob(value);
          } catch (e) {
            // Invalid base64, ignore
          }
        }
        if (key === 'description' && value) {
          try {
            description = atob(value);
          } catch (e) {
            // Invalid base64, ignore
          }
        }
      }
    }

    // Create database record
    const { data: video, error: dbError } = await supabase
      .from('video_submissions')
      .insert({
        uploader_id: user.id,
        provider: 'stream',
        provider_asset_id: uid,
        status: 'pending',
        title,
        description,
      })
      .select('id')
      .single();

    if (dbError || !video) {
      console.error('Failed to create video record:', dbError);
      // Don't fail the upload - webhook can create record later
    }

    // Return tus-compliant response with Location header
    return new NextResponse(null, {
      status: 201,
      headers: {
        'Access-Control-Expose-Headers': 'Location',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Origin': '*', // Tighten in production
        'Location': location,
        'Tus-Resumable': '1.0.0',
        'X-Video-Id': video?.id || '', // Our internal video ID
      },
    });
  } catch (error) {
    console.error('Tus upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
