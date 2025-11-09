import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * R2 Storage client for master video archival
 * Uses S3-compatible API with Cloudflare R2
 */
export class R2VideoStorage {
  private client: S3Client;
  private bucketName: string;

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const accessKeyId = process.env.R2_ACCESS_KEY_ID || '';
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || '';
    this.bucketName = process.env.R2_BUCKET_NAME || 'video-masters';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      console.warn('R2 credentials not configured');
    }

    // R2 endpoint format: https://<account_id>.r2.cloudflarestorage.com
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

    this.client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload master video file to R2
   * @param assetId Provider's asset ID (used as key prefix)
   * @param buffer Video file buffer
   * @param contentType MIME type (e.g., 'video/mp4')
   * @returns R2 key
   */
  async uploadMaster(
    assetId: string,
    buffer: Buffer,
    contentType: string = 'video/mp4'
  ): Promise<string> {
    const key = `masters/${assetId}-${Date.now()}.mp4`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: {
        assetId,
        uploadedAt: new Date().toISOString(),
      },
    });

    await this.client.send(command);
    return key;
  }

  /**
   * Get signed URL for downloading master video (admin-only access)
   * @param r2Key R2 object key
   * @param expiresIn Expiration time in seconds (default 1 hour)
   * @returns Presigned download URL
   */
  async getDownloadUrl(r2Key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: r2Key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    return url;
  }

  /**
   * Delete master video from R2
   * @param r2Key R2 object key
   */
  async deleteMaster(r2Key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: r2Key,
    });

    await this.client.send(command);
  }

  /**
   * Download master video to stream from provider, then upload to R2
   * This is called after video is processed by Stream
   * @param assetId Stream asset ID
   * @returns R2 key and file size
   */
  async archiveFromStream(assetId: string): Promise<{ r2Key: string; bytes: number }> {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
    const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';

    // Download from Stream
    const downloadUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${assetId}/downloads`;

    const response = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download from Stream: ${await response.text()}`);
    }

    // Get default download (highest quality MP4)
    const downloads = await response.json();
    const defaultDownload = downloads.result?.default?.url;

    if (!defaultDownload) {
      throw new Error('No download URL available from Stream');
    }

    // Fetch the actual video file
    const videoResponse = await fetch(defaultDownload);
    if (!videoResponse.ok) {
      throw new Error('Failed to fetch video from download URL');
    }

    const arrayBuffer = await videoResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    const r2Key = await this.uploadMaster(assetId, buffer, 'video/mp4');

    return {
      r2Key,
      bytes: buffer.length,
    };
  }
}

// Singleton instance
let r2Instance: R2VideoStorage | null = null;

export function getR2Storage(): R2VideoStorage {
  if (!r2Instance) {
    r2Instance = new R2VideoStorage();
  }
  return r2Instance;
}
