/**
 * @fileoverview Safe media URL validation for images and video sources.
 *
 * @module shared/lib/safeMediaUrl
 *
 * Tests: `npm run test:safe-href`
 * Registry: `.ai/docs/testing.md`
 */

import {
  gcsPublicUrlToStorageKey,
  type GcsMediaReferenceContext,
} from "@shared/lib/mediaStorage/gcsObjectKey";
import {
  s3PublicUrlToStorageKey,
  type S3MediaReferenceContext,
} from "@shared/lib/mediaStorage/s3ObjectKey";
import { publicUploadPathToStorageKey } from "@shared/lib/mediaStorage/uploadReferenceUtils";
import { isSafeHref } from "@shared/lib/safeHref";

/** Cloud storage context for validating managed upload URLs. */
export type CloudMediaReferenceContext = GcsMediaReferenceContext & S3MediaReferenceContext;

/**
 * Validate whether a media URL is safe for `<img src>` or `<video src>`.
 *
 * Accepts managed local/GCS/S3 upload paths and HTTPS (or same-origin) URLs.
 * Rejects `javascript:`, `data:`, and other unsafe schemes.
 *
 * @param url - Image or video source URL.
 * @param cloudContext - Optional GCS/S3/CDN context for cloud object URLs.
 * @returns True when the URL may be rendered.
 */
export function isSafeMediaUrl(
  url: string,
  cloudContext: CloudMediaReferenceContext = {},
): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;

  if (publicUploadPathToStorageKey(trimmed)) return true;
  if (gcsPublicUrlToStorageKey(trimmed, cloudContext)) return true;
  if (s3PublicUrlToStorageKey(trimmed, cloudContext)) return true;

  return isSafeHref(trimmed);
}

/**
 * Return a trimmed safe media URL or empty string when disallowed.
 *
 * @param url - Raw media source value.
 * @param cloudContext - Optional GCS/S3/CDN context.
 * @returns Safe URL for media elements or empty string.
 */
export function sanitizeMediaUrl(
  url: string | undefined | null,
  cloudContext: CloudMediaReferenceContext = {},
): string {
  if (!url?.trim()) return "";
  const trimmed = url.trim();
  return isSafeMediaUrl(trimmed, cloudContext) ? trimmed : "";
}
