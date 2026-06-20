/**
 * @fileoverview Parse and collect upload references from URL strings and JSON trees.
 *
 * Supports local `/uploads/…` paths and GCS/CDN absolute URLs when a
 * {@link MediaReferenceContext} is supplied.
 *
 * @module shared/lib/mediaStorage/uploadReferenceUtils
 *
 * Tests: `npm run test:upload-reference-utils`
 * Registry: `.ai/docs/testing.md`
 */

import { MEDIA_PURPOSE_POLICIES } from "@shared/constants/mediaStorage";
import {
  gcsPublicUrlToStorageKey,
  type GcsMediaReferenceContext,
} from "@shared/lib/mediaStorage/gcsObjectKey";
import type { MediaStorageEnvConfig } from "@shared/lib/mediaStorage/types";

/** Root-relative public prefix for locally stored uploads. */
export const LOCAL_UPLOAD_PUBLIC_PREFIX = "/uploads/";

/** Allowed storage segment folder names under `public/uploads/` or GCS prefixes. */
export const UPLOAD_STORAGE_SEGMENTS = new Set(
  Object.values(MEDIA_PURPOSE_POLICIES).map((policy) => policy.storageSegment),
);

/** Optional driver context for resolving absolute cloud media URLs. */
export type MediaReferenceContext = GcsMediaReferenceContext;

/**
 * Build reference context from active media storage env config.
 *
 * @param config - Resolved media storage configuration.
 * @returns Context for {@link mediaUrlToStorageKey}.
 */
export function mediaReferenceContextFromConfig(
  config: Pick<MediaStorageEnvConfig, "gcsBucket" | "gcsPublicBaseUrl">,
): MediaReferenceContext {
  return {
    gcsBucket: config.gcsBucket,
    gcsPublicBaseUrl: config.gcsPublicBaseUrl,
  };
}

/**
 * Convert a public upload path or same-origin absolute URL into a provider storage key.
 *
 * @param pathOrUrl - e.g. `/uploads/avatars/foo.png` or `https://site/uploads/avatars/foo.png`.
 * @returns Storage key (`avatars/foo.png`) or null when not a managed local upload path.
 */
export function publicUploadPathToStorageKey(pathOrUrl: string): string | null {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      pathname = new URL(trimmed).pathname;
    } catch {
      return null;
    }
  }

  if (!pathname.startsWith(LOCAL_UPLOAD_PUBLIC_PREFIX)) {
    return null;
  }

  const relative = pathname.slice(LOCAL_UPLOAD_PUBLIC_PREFIX.length);
  const slashIndex = relative.indexOf("/");
  if (slashIndex <= 0) return null;

  const segment = relative.slice(0, slashIndex);
  const filename = relative.slice(slashIndex + 1);

  if (!UPLOAD_STORAGE_SEGMENTS.has(segment)) return null;
  if (!filename || filename.includes("..") || filename.includes("\\")) return null;

  return `${segment}/${filename}`;
}

/**
 * Resolve a stored media URL/path to a provider storage key (local or GCS).
 *
 * @param pathOrUrl - Value from MongoDB or Puck props.
 * @param context - Optional GCS bucket/CDN context for absolute cloud URLs.
 * @returns Storage key or null when unrecognised.
 */
export function mediaUrlToStorageKey(
  pathOrUrl: string,
  context?: MediaReferenceContext,
): string | null {
  return (
    publicUploadPathToStorageKey(pathOrUrl) ??
    gcsPublicUrlToStorageKey(pathOrUrl, context ?? {})
  );
}

/**
 * Collect managed upload storage keys referenced inside an arbitrary JSON-like value.
 *
 * Walks arrays/objects recursively and inspects every string for local or cloud media URLs.
 *
 * @param value - Document subtree (Puck data, profile patch, etc.).
 * @param target - Mutable set receiving discovered storage keys.
 * @param context - Optional GCS/CDN context for absolute URLs.
 */
export function collectUploadStorageKeysFromValue(
  value: unknown,
  target: Set<string>,
  context?: MediaReferenceContext,
): void {
  if (value == null) return;

  if (typeof value === "string") {
    const key = mediaUrlToStorageKey(value, context);
    if (key) target.add(key);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectUploadStorageKeysFromValue(item, target, context);
    }
    return;
  }

  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectUploadStorageKeysFromValue(nested, target, context);
    }
  }
}

/**
 * Merge multiple string/path values into a storage-key set.
 *
 * @param values - Candidate URL or path strings.
 * @param context - Optional GCS/CDN context.
 * @returns Deduped storage keys.
 */
export function storageKeysFromStrings(
  values: Iterable<string | null | undefined>,
  context?: MediaReferenceContext,
): Set<string> {
  const keys = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const key = mediaUrlToStorageKey(value, context);
    if (key) keys.add(key);
  }
  return keys;
}
