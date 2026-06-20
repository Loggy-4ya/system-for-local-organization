/**
 * @fileoverview Sanitize Puck layout JSON before MongoDB persistence.
 *
 * @module shared/lib/puckContentSanitize
 *
 * Tests: `npm run test:puck-content-sanitize`
 * Registry: `.ai/docs/testing.md`
 */

import type { GcsMediaReferenceContext } from "@shared/lib/mediaStorage/gcsObjectKey";
import {
  looksLikeEditorHtml,
  sanitizeNexusEditorHtml,
} from "@shared/lib/nexusRichTextSanitize";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import { sanitizeUserHref } from "@shared/lib/safeHref";

/** Prop keys that store rich HTML from TipTap. */
const RICH_TEXT_KEYS = new Set(["text", "content"]);

/** Prop keys that store navigation hyperlinks. */
const HREF_KEYS = new Set(["href"]);

/** Prop keys that store image/media source URLs. */
const MEDIA_URL_KEYS = new Set(["image", "backgroundImage"]);

/** Prop keys that store video or generic media URLs. */
const MEDIA_OR_LINK_URL_KEYS = new Set(["url"]);

/**
 * Sanitize one string prop based on its field key name.
 *
 * @param key - Puck prop key.
 * @param value - Raw string value.
 * @param gcsContext - GCS/CDN context for cloud media URLs.
 * @returns Sanitized string.
 */
function sanitizePuckStringProp(
  key: string,
  value: string,
  gcsContext: GcsMediaReferenceContext,
): string {
  if (HREF_KEYS.has(key)) {
    return sanitizeUserHref(value);
  }

  if (MEDIA_URL_KEYS.has(key)) {
    return sanitizeMediaUrl(value, gcsContext);
  }

  if (MEDIA_OR_LINK_URL_KEYS.has(key)) {
    return sanitizeUserHref(value) || sanitizeMediaUrl(value, gcsContext);
  }

  if (RICH_TEXT_KEYS.has(key)) {
    if (looksLikeEditorHtml(value)) {
      return sanitizeNexusEditorHtml(value);
    }
    return value;
  }

  return value;
}

/**
 * Deep-walk Puck JSON and sanitize user-authored strings.
 *
 * @param value - Arbitrary Puck data subtree.
 * @param gcsContext - Optional GCS/CDN context for media URL validation.
 * @returns Sanitized copy (objects/arrays cloned; primitives unchanged).
 */
export function sanitizePuckDataForStorage(
  value: unknown,
  gcsContext: GcsMediaReferenceContext = {},
): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizePuckDataForStorage(item, gcsContext));
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(input)) {
    if (typeof nested === "string") {
      output[key] = sanitizePuckStringProp(key, nested, gcsContext);
    } else {
      output[key] = sanitizePuckDataForStorage(nested, gcsContext);
    }
  }

  return output;
}
