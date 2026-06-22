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
  createEmptyPuckSanitizeReport,
  puckSanitizeKindFromPropKey,
  recordPuckSanitizeFieldChange,
  type PuckSanitizeReport,
} from "@shared/lib/puckContentSanitizeReport";
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

/** Result of sanitizing Puck JSON with an audit report. */
export interface PuckSanitizeResult {
  /** Sanitized Puck data safe for MongoDB persistence. */
  data: unknown;
  /** Field-level diff report for audit logging. */
  report: PuckSanitizeReport;
}

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
 * Deep-walk Puck JSON, sanitize user-authored strings, and collect audit events.
 *
 * @param value - Arbitrary Puck data subtree.
 * @param gcsContext - Optional GCS/CDN context for media URL validation.
 * @param report - Mutable audit accumulator.
 * @param pathPrefix - JSON path prefix for nested props.
 * @returns Sanitized copy (objects/arrays cloned; primitives unchanged).
 */
function sanitizePuckDataNode(
  value: unknown,
  gcsContext: GcsMediaReferenceContext,
  report: PuckSanitizeReport,
  pathPrefix: string,
): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      sanitizePuckDataNode(item, gcsContext, report, `${pathPrefix}[${index}]`),
    );
  }

  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(input)) {
    const fieldPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (typeof nested === "string") {
      const sanitized = sanitizePuckStringProp(key, nested, gcsContext);
      recordPuckSanitizeFieldChange(
        report,
        fieldPath,
        puckSanitizeKindFromPropKey(key),
        nested,
        sanitized,
      );
      output[key] = sanitized;
    } else {
      output[key] = sanitizePuckDataNode(nested, gcsContext, report, fieldPath);
    }
  }

  return output;
}

/**
 * Deep-walk Puck JSON and sanitize user-authored strings with an audit report.
 *
 * @param value - Arbitrary Puck data subtree.
 * @param gcsContext - Optional GCS/CDN context for media URL validation.
 * @returns Sanitized data and field-level audit report.
 */
export function sanitizePuckDataForStorageWithReport(
  value: unknown,
  gcsContext: GcsMediaReferenceContext = {},
): PuckSanitizeResult {
  const report = createEmptyPuckSanitizeReport();
  const data = sanitizePuckDataNode(value, gcsContext, report, "");
  return { data, report };
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
  return sanitizePuckDataForStorageWithReport(value, gcsContext).data;
}
