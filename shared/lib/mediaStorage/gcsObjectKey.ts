/**
 * @fileoverview GCS object key helpers and public URL parsing for media references.
 *
 * @module shared/lib/mediaStorage/gcsObjectKey
 *
 * Tests: `npm run test:upload-reference-utils`
 * Registry: `.ai/docs/testing.md`
 */

import { MEDIA_PURPOSE_POLICIES } from "@shared/constants/mediaStorage";

/** Allowed upload segment prefixes (avatars, puck-blocks, …). */
const UPLOAD_STORAGE_SEGMENTS = new Set(
  Object.values(MEDIA_PURPOSE_POLICIES).map((policy) => policy.storageSegment),
);

/** Context for resolving GCS/CDN URLs back to storage keys. */
export interface GcsMediaReferenceContext {
  /** GCS bucket name (for storage.googleapis.com URLs). */
  gcsBucket?: string;
  /** Optional CDN or public base URL prefix for bucket objects. */
  gcsPublicBaseUrl?: string;
}

/**
 * Validate and normalise a storage key (`segment/filename`).
 *
 * @param storageKey - Candidate object key.
 * @returns Normalised key or null when invalid.
 */
export function normalizeStorageKey(storageKey: string): string | null {
  const trimmed = storageKey.replace(/^\/+/, "").trim();
  const slashIndex = trimmed.indexOf("/");
  if (slashIndex <= 0) return null;

  const segment = trimmed.slice(0, slashIndex);
  const filename = trimmed.slice(slashIndex + 1);

  if (!UPLOAD_STORAGE_SEGMENTS.has(segment)) return null;
  if (!filename || filename.includes("..") || filename.includes("\\")) return null;

  return `${segment}/${filename}`;
}

/**
 * Build the public browser URL for a GCS object.
 *
 * @param storageKey - Object key (`avatars/foo.png`).
 * @param bucket - GCS bucket name.
 * @param publicBaseUrl - Optional CDN/base URL override.
 * @returns Absolute HTTPS URL.
 */
export function buildGcsPublicUrl(
  storageKey: string,
  bucket: string,
  publicBaseUrl?: string,
): string {
  const normalised = normalizeStorageKey(storageKey);
  if (!normalised) {
    throw new Error("Invalid GCS storage key.");
  }

  if (publicBaseUrl?.trim()) {
    return `${publicBaseUrl.replace(/\/+$/, "")}/${normalised}`;
  }

  return `https://storage.googleapis.com/${bucket}/${normalised}`;
}

/**
 * Parse a GCS or CDN public URL into a storage key.
 *
 * Supports:
 * - `https://storage.googleapis.com/{bucket}/{segment}/{file}`
 * - `https://storage.cloud.google.com/{bucket}/{segment}/{file}`
 * - `{GCS_MEDIA_PUBLIC_BASE_URL}/{segment}/{file}`
 *
 * @param url - Public object URL stored in MongoDB.
 * @param context - Bucket and optional CDN base from env config.
 * @returns Storage key or null when not a managed media object URL.
 */
export function gcsPublicUrlToStorageKey(
  url: string,
  context: GcsMediaReferenceContext = {},
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

  const base = context.gcsPublicBaseUrl?.trim();
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
  const isGoogleStorage =
    host === "storage.googleapis.com" || host === "storage.cloud.google.com";

  if (!isGoogleStorage) return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts.length < 3) return null;

  const [urlBucket, segment, ...rest] = parts;
  if (context.gcsBucket && urlBucket !== context.gcsBucket) return null;

  return normalizeStorageKey(`${segment}/${rest.join("/")}`);
}
