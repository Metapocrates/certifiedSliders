# Video Upload System

Complete implementation of Cloudflare Stream video uploads with both basic and resumable (tus) methods.

## Features

- **Basic uploads** for files ≤200 MB (single POST)
- **Resumable uploads (tus)** for large files with automatic retry
- **Direct Creator Upload** - Videos go directly to Cloudflare Stream
- **Webhook processing** - Automatic status updates when videos are ready
- **Admin moderation** - Review and approve videos before publication
- **Optional signed URLs** - Private video playback with JWT tokens
- **R2 archival** - Optional master video backup to R2 storage

## Architecture

### Upload Flow

```
┌─────────────┐
│   User      │
│  Selects    │
│   Video     │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│ Detect File Size    │
│  < 200MB: Basic     │
│  > 200MB: tus       │
└──────┬──────────────┘
       │
       ├─── Basic Upload ────┐
       │                     │
       │  1. GET /api/videos/upload-url
       │  2. POST to Stream uploadURL
       │  3. Video processing begins
       │
       └─── Tus Upload ─────┐
                            │
         1. POST /api/videos/tus-upload
         2. Uppy chunks to Stream
         3. Automatic resume on failure
         4. Video processing begins

┌─────────────────────┐
│  Stream Processes   │
│  Video & Sends      │
│  Webhook            │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│ /api/videos/webhook │
│  - Update status    │
│  - Store URLs       │
│  - Archive to R2    │
└─────────────────────┘
```

## API Routes

### POST /api/videos/upload-url
Get Direct Creator Upload URL for basic uploads (≤200 MB).

**Request:**
```json
{
  "title": "100m Dash - State Finals",
  "description": "Personal best performance"
}
```

**Response:**
```json
{
  "uploadUrl": "https://upload.videodelivery.net/...",
  "videoId": "uuid",
  "assetId": "cloudflare-uid"
}
```

**Usage:**
```javascript
// 1. Get upload URL
const { uploadUrl, videoId } = await fetch('/api/videos/upload-url', {
  method: 'POST',
  body: JSON.stringify({ title, description })
}).then(r => r.json());

// 2. Upload video
const formData = new FormData();
formData.append('file', videoFile);
await fetch(uploadUrl, { method: 'POST', body: formData });
```

### POST /api/videos/tus-upload
Initialize tus resumable upload for large files (>200 MB).

**Headers:**
- `Upload-Length`: File size in bytes
- `Upload-Metadata`: Base64 metadata (title, description, etc.)

**Response:**
- `Location` header: Stream upload endpoint for chunks
- Status 201

**Usage with Uppy:**
```javascript
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';
import { buildTusMetadata } from '@/lib/videos/tus-helpers';

const uppy = new Uppy();
uppy.use(Tus, {
  endpoint: '/api/videos/tus-upload',
  chunkSize: 150 * 1024 * 1024, // 150 MB
  onBeforeRequest: (req) => {
    if (req.getURL().endsWith('/api/videos/tus-upload')) {
      const metadata = buildTusMetadata(600, 120);
      req.setHeader('Upload-Metadata', metadata);
    }
  },
});

uppy.addFile({ data: file });
await uppy.upload();
```

### POST /api/videos/webhook
Process Cloudflare Stream webhooks (internal).

**Payload:**
```json
{
  "uid": "asset-id",
  "status": { "state": "ready" },
  "playback": { "hls": "https://..." },
  "thumbnail": "https://...",
  "duration": 45.5
}
```

### POST /api/videos/stream-token
Generate signed token for private video playback (optional).

**Request:**
```json
{
  "uid": "cloudflare-asset-id",
  "expSec": 3600
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "expiresAt": "2025-01-01T12:00:00Z"
}
```

## Configuration

### Required Environment Variables

```bash
# Cloudflare Stream credentials
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
```

**How to get:**
1. Go to [dash.cloudflare.com/stream](https://dash.cloudflare.com/stream)
2. Copy Account ID from URL or dashboard
3. Create API Token:
   - Profile → API Tokens → Create Token
   - Use "Edit Cloudflare Stream" template
   - Copy token (shown once)

### Optional Environment Variables

```bash
# R2 master video archival (backup)
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_BUCKET_NAME=video-masters

# Signed URL playback (private videos)
CLOUDFLARE_STREAM_SIGNING_KEY_ID=your_key_id
CLOUDFLARE_STREAM_SIGNING_SECRET=your_secret
```

## Database Schema

### video_submissions

```sql
CREATE TABLE video_submissions (
  id uuid PRIMARY KEY,
  uploader_id uuid REFERENCES auth.users,
  provider video_provider NOT NULL, -- 'stream' | 'bunny'
  provider_asset_id text NOT NULL,
  status video_status NOT NULL, -- 'pending' | 'processing' | 'ready' | 'approved' | 'featured' | 'rejected'
  title text NOT NULL,
  description text,
  duration_seconds integer,
  master_bytes bigint,
  master_r2_key text,
  playback_url text,
  mp4_fallback_url text,
  poster_url text,
  flags jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Components

### VideoUploader

Client component for uploading videos with automatic method selection.

```tsx
import VideoUploader from '@/components/videos/VideoUploader';

<VideoUploader
  onUploadComplete={(videoId) => {
    console.log('Video uploaded:', videoId);
  }}
/>
```

**Features:**
- Automatic basic/tus selection based on file size
- Progress tracking
- Upload resume on connection failure (tus)
- Validation (type, size)
- Error handling

### VideoPlayer

Display component for playback.

```tsx
import VideoPlayer from '@/components/videos/VideoPlayer';

<VideoPlayer
  playbackUrl="https://customer-xxx.cloudflarestream.com/xxx/manifest/video.m3u8"
  posterUrl="https://..."
  title="100m Dash"
/>
```

## Admin Features

### Moderation Dashboard

URL: `/admin/videos`

**Features:**
- List pending/ready videos
- Preview before approval
- Approve, feature, or reject
- Filter by status

## File Size Thresholds

- **Basic upload**: Files ≤ 200 MB
  - Single POST request
  - No resume capability
  - Faster for small files

- **Tus upload**: Files > 200 MB
  - Chunked upload (150 MB chunks)
  - Automatic resume on failure
  - Better for large files / slow connections

**Threshold defined in:** `src/lib/videos/tus-helpers.ts`

```typescript
export const UPLOAD_SIZE_THRESHOLD = 200 * 1024 * 1024; // 200 MB
```

## Testing

### Basic Upload (≤200 MB)

```bash
# Get upload URL
curl -X POST http://localhost:3000/api/videos/upload-url \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Video", "description": "Test"}' \
  | jq .

# Upload video
curl -F "file=@small-video.mp4" "<uploadURL>"
```

### Tus Upload (>200 MB)

Using tus CLI:

```bash
tus-upload \
  --chunk-size 157286400 \
  --header "Upload-Metadata: maxDurationSeconds NjAw" \
  bigfile.mp4 \
  http://localhost:3000/api/videos/tus-upload
```

Using Uppy in browser - see VideoUploader component source.

## Webhook Setup

Configure Cloudflare Stream webhooks:

1. Go to Stream → Settings → Webhooks
2. Add webhook URL: `https://your-domain.com/api/videos/webhook`
3. Select events: `video.upload.complete`
4. (Optional) Add secret for verification

## Security

### RLS Policies

```sql
-- Users can upload their own videos
CREATE POLICY "Users can upload own videos"
  ON video_submissions FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

-- Users can view own videos (any status)
CREATE POLICY "Users can view own videos"
  ON video_submissions FOR SELECT
  USING (auth.uid() = uploader_id);

-- Public can view approved videos
CREATE POLICY "Public can view approved videos"
  ON video_submissions FOR SELECT
  USING (status IN ('approved', 'featured'));

-- Admins can manage all videos
CREATE POLICY "Admins can manage videos"
  ON video_submissions FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admins));
```

### Rate Limiting

Add rate limiting on upload routes:

```typescript
// Recommended: 5 uploads per hour per user
// Implement with middleware or edge function
```

## Troubleshooting

### Upload fails with "No credentials"

**Cause:** Missing `CLOUDFLARE_ACCOUNT_ID` or `CLOUDFLARE_API_TOKEN`

**Fix:** Add credentials to `.env.local`

### Tus upload gets stuck

**Cause:** Browser blocking cross-origin requests

**Fix:** Ensure CORS headers are set in `/api/videos/tus-upload`

### Video stuck in "processing" state

**Cause:** Webhook not received or failed

**Fix:**
1. Check webhook configuration in Stream dashboard
2. Check webhook logs: `/api/videos/webhook`
3. Manually trigger webhook or update status in database

### R2 archival fails

**Cause:** Missing R2 credentials or Stream download API error

**Fix:**
1. Check R2 credentials in `.env.local`
2. Check Stream download API permissions
3. Archival is optional - videos still work without it

## Cost Estimation

### Cloudflare Stream Pricing

- **Storage**: $5/TB/month
- **Encoding**: Free
- **Delivery**: $1/1000 minutes delivered

**Example:**
- 100 videos × 2 minutes each = 200 minutes storage
- 1000 views × 2 minutes = 2000 minutes delivery
- Cost: ~$5/month storage + $2 delivery = $7/month

### R2 Pricing (Optional)

- **Storage**: $0.015/GB/month
- **Class A operations**: $4.50/million (writes)
- **Class B operations**: $0.36/million (reads)

**Example:**
- 100 videos × 500 MB = 50 GB
- Cost: ~$0.75/month

## Future Enhancements

- [ ] Thumbnail upload
- [ ] Video trimming/editing
- [ ] Automatic captioning
- [ ] Multi-track audio
- [ ] Live streaming
- [ ] Analytics dashboard
- [ ] Batch upload
- [ ] Video compression before upload
- [ ] Preview before publish
