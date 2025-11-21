/**
 * MinIO S3-Compatible Storage Service
 *
 * Uses AWS SDK for S3-compatible operations with MinIO.
 * Supports authenticated uploads with proper credentials.
 *
 * Configuration required:
 * - MINIO_ENDPOINT: MinIO server endpoint (e.g., minio.7k.ag)
 * - MINIO_ACCESS_KEY: MinIO access key
 * - MINIO_SECRET_KEY: MinIO secret key
 * - MINIO_BUCKET: Bucket name (e.g., sui-patreon)
 * - MINIO_REGION: Region (default: us-east-1)
 * - MINIO_USE_SSL: Use HTTPS (default: true)
 * - MINIO_PUBLIC_URL: Public URL for serving files (e.g., https://minio.7k.ag/sui-patreon)
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

/**
 * Allowed image MIME types for avatar uploads
 */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
] as const;

type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

/**
 * MinIO configuration interface
 */
interface MinioConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region?: string;
  useSSL?: boolean;
  publicUrl: string;
  backendUrl?: string; // Backend URL for proxy access
}

/**
 * MinIO S3-Compatible Storage
 *
 * Handles upload of avatar images using AWS S3 SDK with MinIO.
 * Files are publicly readable once uploaded.
 */
export class MinioStorage {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly backendUrl: string | null;

  /**
   * Initialize MinIO storage with S3 client
   *
   * @param config - MinIO configuration
   * @throws Error if required config is missing
   */
  constructor(config: MinioConfig) {
    const { endpoint, accessKey, secretKey, bucket, region = 'us-east-1', useSSL = true, publicUrl, backendUrl } = config;

    if (!endpoint || !accessKey || !secretKey || !bucket || !publicUrl) {
      throw new Error('Missing required MinIO configuration');
    }

    this.bucket = bucket;
    this.publicUrl = publicUrl.replace(/\/$/, ''); // Remove trailing slash
    this.backendUrl = backendUrl ? backendUrl.replace(/\/$/, '') : null; // Remove trailing slash if present

    // Initialize S3 client for MinIO
    this.s3Client = new S3Client({
      endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}`,
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    console.log('✅ MinIO Storage initialized (S3 SDK)', {
      endpoint,
      bucket,
      region,
      ssl: useSSL,
      publicUrl: this.publicUrl,
      backendUrl: this.backendUrl || '(not set - using direct MinIO URLs)',
    });
  }

  /**
   * Validate that the content type is an allowed image format
   *
   * @param contentType - MIME type to validate
   * @returns true if valid, false otherwise
   */
  private isValidImageType(contentType: string): contentType is AllowedMimeType {
    return ALLOWED_MIME_TYPES.includes(contentType as AllowedMimeType);
  }

  /**
   * Generate a unique filename for an uploaded image
   *
   * @param contentType - MIME type of the image
   * @returns Unique filename with appropriate extension
   */
  private generateUniqueFilename(contentType: AllowedMimeType): string {
    const uuid = randomUUID();
    const timestamp = Date.now();
    const extension = this.getFileExtension(contentType);

    return `${uuid}-${timestamp}.${extension}`;
  }

  /**
   * Get file extension from content type
   *
   * @param contentType - MIME type
   * @returns File extension (jpg, png)
   */
  private getFileExtension(contentType: AllowedMimeType): string {
    const extensionMap: Record<AllowedMimeType, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
    };

    return extensionMap[contentType];
  }

  /**
   * Upload an avatar image to MinIO using S3 SDK
   *
   * @param buffer - Image data as Buffer
   * @param contentType - MIME type of the image
   * @returns Promise resolving to object with filename and URL
   * @throws Error if content type is invalid or upload fails
   */
  async uploadAvatar(
    buffer: Buffer,
    contentType: string
  ): Promise<{ filename: string; url: string }> {
    // Validate content type
    if (!this.isValidImageType(contentType)) {
      throw new Error(
        `Invalid image type: ${contentType}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    const filename = this.generateUniqueFilename(contentType);
    const url = this.getAvatarUrl(filename);
    const sizeKB = (buffer.length / 1024).toFixed(2);

    console.log(`📤 MinIO upload started: ${filename} (${sizeKB} KB, type: ${contentType})`);

    try {
      // Upload using S3 SDK
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: filename,
        Body: buffer,
        ContentType: contentType,
        ContentLength: buffer.length,
        // Note: Public access controlled by bucket policy, not ACL
      });

      await this.s3Client.send(command);

      console.log(`✅ MinIO upload successful: ${filename}`);

      return { filename, url };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ MinIO upload failed (${filename}):`, {
        error: message,
        errorDetails: error,
      });
      throw new Error(`MinIO upload failed: ${message}`);
    }
  }

  /**
   * Download an avatar image from MinIO
   *
   * @param filename - The filename to download
   * @returns Promise resolving to a Buffer containing the image data
   * @throws Error if download fails or file doesn't exist
   */
  async downloadAvatar(filename: string): Promise<Buffer> {
    console.log(`📥 MinIO download started: ${filename}`);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const sizeKB = (buffer.length / 1024).toFixed(2);
      console.log(`✅ MinIO download successful: ${filename} (${sizeKB} KB)`);

      return buffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ MinIO download failed (${filename}):`, message);

      if (message.includes('NoSuchKey') || message.includes('NotFound')) {
        throw new Error(`Avatar not found: ${filename}`);
      }

      throw error;
    }
  }

  /**
   * Get the public URL for an avatar
   *
   * @param filename - The filename
   * @returns The public URL to access the avatar (backend proxy URL if configured, direct MinIO URL otherwise)
   */
  getAvatarUrl(filename: string): string {
    // If backend URL is configured, return proxy URL instead of direct MinIO URL
    if (this.backendUrl) {
      return `${this.backendUrl}/api/avatar/${filename}`;
    }

    // Fallback to direct MinIO URL
    return `${this.publicUrl}/${filename}`;
  }

  /**
   * Check if an avatar exists in MinIO
   *
   * @param filename - The filename to check
   * @returns Promise resolving to true if avatar exists, false otherwise
   */
  async avatarExists(filename: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: filename,
      });

      await this.s3Client.send(command);
      console.log(`🔍 MinIO avatar ${filename}: exists`);
      return true;
    } catch (error) {
      console.log(`🔍 MinIO avatar ${filename}: not found`);
      return false;
    }
  }
}

/**
 * Load MinIO configuration from environment
 *
 * @throws Error if required environment variables are not set
 */
function loadConfig(): MinioConfig {
  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKey = process.env.MINIO_ACCESS_KEY;
  const secretKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET || 'sui-patreon';
  const region = process.env.MINIO_REGION || 'us-east-1';
  const useSSL = process.env.MINIO_USE_SSL !== 'false';
  const publicUrl = process.env.MINIO_PUBLIC_URL;
  const backendUrl = process.env.BACKEND_URL; // Optional: for proxy URLs

  if (!endpoint) {
    throw new Error('Missing MINIO_ENDPOINT environment variable');
  }

  if (!accessKey) {
    throw new Error('Missing MINIO_ACCESS_KEY environment variable');
  }

  if (!secretKey) {
    throw new Error('Missing MINIO_SECRET_KEY environment variable');
  }

  if (!publicUrl) {
    throw new Error('Missing MINIO_PUBLIC_URL environment variable');
  }

  return {
    endpoint,
    accessKey,
    secretKey,
    bucket,
    region,
    useSSL,
    publicUrl,
    backendUrl,
  };
}

/**
 * Singleton instance of MinioStorage for application-wide use
 *
 * Import this instance to use MinIO storage throughout your application:
 * ```typescript
 * import { minio } from './services/minio.service';
 *
 * const result = await minio.uploadAvatar(buffer, 'image/jpeg');
 * ```
 */
export const minio = new MinioStorage(loadConfig());
