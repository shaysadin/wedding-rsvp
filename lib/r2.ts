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
 * For permanent files (invitations, templates), uses long-lived signed URL (1 year)
 * @param key - The object key (path) in the bucket
 * @returns A public URL for the object
 */
export async function getPublicR2Url(key: string): Promise<string> {
  // For invitations and templates, we want long-lived URLs (1 year)
  // This is more secure than making the bucket public
  const ONE_YEAR = 365 * 24 * 60 * 60; // 1 year in seconds
  return await getSignedR2Url(key, ONE_YEAR);
}
