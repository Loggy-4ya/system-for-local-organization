/**
 * @fileoverview Shared object-key validation for local and S3 media storage.
 *
 * @module shared/lib/mediaStorage/storageObjectKey
 *
 * Tests: `npm run test:upload-reference-utils`
 * Registry: `.ai/docs/testing.md`
 */

import { MEDIA_PURPOSE_POLICIES } from "@shared/constants/mediaStorage";

/** Allowed upload segment prefixes (avatars, puck-blocks, …). */
const UPLOAD_STORAGE_SEGMENTS = new Set(
  Object.values(MEDIA_PURPOSE_POLICIES).map((policy) => policy.storageSegment),
);

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
