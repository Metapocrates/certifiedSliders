import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Cloudflare R2 client (S3-compatible)
 */
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET || 'cs-video-masters';

export interface UploadResult {
  key: string;
  size: number;
  etag?: string;
}

/**
 * Upload a file to R2
 */
export async function putR2Object(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  contentType = 'application/octet-stream'
): Promise<UploadResult> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body as any,
    ContentType: contentType,
  });

  const response = await r2Client.send(command);

  return {
    key,
    size: typeof body === 'string' ? body.length : (body as any).size || (body as any).length || 0,
    etag: response.ETag,
  };
}

/**
 * Get a presigned download URL for an R2 object
 */
export async function getR2PresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Delete an object from R2
 */
export async function deleteR2Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Generate a consistent R2 key for video masters
 */
export function generateVideoMasterKey(uploaderId: string, submissionId: string, extension = 'mp4'): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `video-masters/${year}/${month}/${uploaderId}/${submissionId}.${extension}`;
}
