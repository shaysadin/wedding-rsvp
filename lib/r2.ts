import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "@/env.mjs";

const R2_ACCOUNT_ID = env.CLOUDFLARE_R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = env.CLOUDFLARE_R2_BUCKET_NAME;

// Check if R2 is configured
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// Create R2 client (S3-compatible)
function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "Cloudflare R2 is not configured. Please set CLOUDFLARE_R2_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY environment variables."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Upload data to R2 storage
 * @param key - The object key (path) in the bucket
 * @param data - The data to upload (string or Buffer)
 * @param contentType - The content type (default: application/json)
 * @returns The key and size of the uploaded object
 */
export async function uploadToR2(
  key: string,
  data: string | Buffer,
  contentType: string = "application/json"
): Promise<{ key: string; size: number }> {
  const client = getR2Client();
  const body = typeof data === "string" ? Buffer.from(data, "utf-8") : data;

  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return { key, size: body.length };
}

/**
 * Get data from R2 storage
 * @param key - The object key (path) in the bucket
 * @returns The object data as a string
 */
export async function getFromR2(key: string): Promise<string> {
  const client = getR2Client();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`Object not found: ${key}`);
  }

  return await response.Body.transformToString();
}

/**
 * Generate a signed URL for temporary access to an object
 * @param key - The object key (path) in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
 * @returns A signed URL for the object
 */
export async function getSignedR2Url(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const client = getR2Client();

  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(client, command, { expiresIn });
}

/**
 * Delete an object from R2 storage
 * @param key - The object key (path) to delete
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

/**
 * Get public URL for an R2 object
 * Uses the R2 public domain for permanent URLs (no expiration)
 *
 * Requires CLOUDFLARE_R2_PUBLIC_DOMAIN env variable to be set.
 * To get this:
 * 1. Go to Cloudflare Dashboard > R2 > Your Bucket > Settings
 * 2. Under "Public Access", click "Allow Access"
 * 3. Copy the public URL (e.g., https://pub-xxx.r2.dev)
 * 4. Set CLOUDFLARE_R2_PUBLIC_DOMAIN=https://pub-xxx.r2.dev in your .env
 *
 * @param key - The object key (path) in the bucket
 * @returns A permanent public URL for the object
 */
export async function getPublicR2Url(key: string): Promise<string> {
  const publicDomain = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN;

  if (publicDomain) {
    // Use permanent public URL (no expiration)
    // Remove trailing slash if present
    const domain = publicDomain.replace(/\/$/, "");
    return `${domain}/${key}`;
  }

  // Fallback to signed URL (7 days max)
  // This is a temporary solution until public access is configured
  console.warn(
    "[R2] CLOUDFLARE_R2_PUBLIC_DOMAIN not set. Using signed URL (expires in 7 days). " +
    "For permanent URLs, enable public access on your R2 bucket."
  );
  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  return await getSignedR2Url(key, SEVEN_DAYS);
}
