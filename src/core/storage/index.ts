/**
 * Storage — S3-compatible client singleton (TG-S3 / Cloudflare Workers).
 *
 * Uses `@aws-sdk/client-s3` pointed at the TG-S3 endpoint.
 *
 * Exported helpers:
 *   putObject(key, body, contentType)  — upload a Buffer
 *   headObject(key)                    — check if object exists
 *   getPublicUrl(key)                  — build the public-facing URL
 */

import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "../../config/env";

/**
 * S3Client configured to the TG-S3 / Cloudflare Workers endpoint.
 */
export const storage = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: "auto",
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY,
    secretAccessKey: env.STORAGE_SECRET_KEY,
  },
  forcePathStyle: true,
});

/**
 * Upload a binary buffer to storage.
 *
 * @param key         - Object key, e.g. "chapters/one-piece-chapter-1/0.jpg"
 * @param body        - Image data as Buffer / Uint8Array
 * @param contentType - MIME type, e.g. "image/jpeg"
 */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string = "image/jpeg"
): Promise<void> {
  await storage.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

/**
 * Check whether an object already exists in storage.
 * Returns `true` if it exists, `false` if not found.
 *
 * @param key - Object key to check
 */
export async function headObject(key: string): Promise<boolean> {
  try {
    await storage.send(
      new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the public-facing URL for a stored object.
 *
 * @param key - Object key, e.g. "chapters/one-piece-chapter-1/0.jpg"
 */
export function getPublicUrl(key: string): string {
  const base = env.STORAGE_PUBLIC_URL.replace(/\/+$/, "");
  return `${base}/${key}`;
}
