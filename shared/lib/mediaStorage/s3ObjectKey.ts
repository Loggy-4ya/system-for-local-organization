/**
 * @fileoverview S3 object key helpers and public URL parsing for media references.
 *
 * @module shared/lib/mediaStorage/s3ObjectKey
 *
 * Tests: `npm run test:upload-reference-utils`
 * Registry: `.ai/docs/testing.md`
 */

import { normalizeStorageKey } from "@shared/lib/mediaStorage/storageObjectKey";

/** Context for resolving S3/CDN URLs back to storage keys. */
export interface S3MediaReferenceContext {
  /** S3 bucket name (for virtual-hosted and path-style URLs). */
  s3Bucket?: string;
  /** AWS region used when building default public URLs. */
  s3Region?: string;
  /** Optional CDN or public base URL prefix for bucket objects. */
  s3PublicBaseUrl?: string;
}

/**
 * Build the public browser URL for an S3 object.
 *
 * @param storageKey - Object key (`avatars/foo.png`).
 * @param bucket - S3 bucket name.
 * @param region - AWS region for virtual-hosted-style URLs.
 * @param publicBaseUrl - Optional CDN/base URL override.
 * @returns Absolute HTTPS URL.
 */
export function buildS3PublicUrl(
  storageKey: string,
  bucket: string,
  region: string,
  publicBaseUrl?: string,
): string {
  const normalised = normalizeStorageKey(storageKey);
  if (!normalised) {
    throw new Error("Invalid S3 storage key.");
  }

  if (publicBaseUrl?.trim()) {
    return `${publicBaseUrl.replace(/\/+$/, "")}/${normalised}`;
  }

  const host =
    region === "us-east-1"
      ? `${bucket}.s3.amazonaws.com`
      : `${bucket}.s3.${region}.amazonaws.com`;

  return `https://${host}/${normalised}`;
}

/**
 * Parse an S3 or CDN public URL into a storage key.
 *
 * Supports:
 * - `https://{bucket}.s3.{region}.amazonaws.com/{segment}/{file}`
 * - `https://{bucket}.s3.amazonaws.com/{segment}/{file}`
 * - `https://s3.{region}.amazonaws.com/{bucket}/{segment}/{file}`
 * - `https://s3.amazonaws.com/{bucket}/{segment}/{file}`
 * - `{S3_MEDIA_PUBLIC_BASE_URL}/{segment}/{file}`
 *
 * @param url - Public object URL stored in MongoDB.
 * @param context - Bucket, region, and optional CDN base from env config.
 * @returns Storage key or null when not a managed media object URL.
 */
export function s3PublicUrlToStorageKey(
  url: string,
  context: S3MediaReferenceContext = {},
): string | null {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  const base = context.s3PublicBaseUrl?.trim();
  if (base) {
    try {
      const baseUrl = new URL(base);
      if (
        parsed.origin === baseUrl.origin &&
        parsed.pathname.startsWith(baseUrl.pathname.replace(/\/+$/, "") || "/")
      ) {
        const basePath = baseUrl.pathname.replace(/\/+$/, "");
        const relativePath = parsed.pathname
          .slice(basePath.length)
          .replace(/^\/+/, "");
        const key = normalizeStorageKey(relativePath);
        if (key) return key;
      }
    } catch {
      // ignore malformed base URL
    }
  }

  const host = parsed.hostname.toLowerCase();
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const virtualHostedMatch = host.match(/^(.+)\.s3(?:\.([a-z0-9-]+))?\.amazonaws\.com$/);
  if (virtualHostedMatch) {
    const urlBucket = virtualHostedMatch[1];
    if (context.s3Bucket && urlBucket !== context.s3Bucket) return null;
    return normalizeStorageKey(parts.join("/"));
  }

  if (host === "s3.amazonaws.com" || host.startsWith("s3.") && host.endsWith(".amazonaws.com")) {
    const [urlBucket, segment, ...rest] = parts;
    if (context.s3Bucket && urlBucket !== context.s3Bucket) return null;
    return normalizeStorageKey(`${segment}/${rest.join("/")}`);
  }

  return null;
}
