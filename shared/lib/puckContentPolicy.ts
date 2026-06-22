/**
 * @fileoverview Content-policy scan for Puck layout JSON before persistence.
 *
 * Walks the same string props as {@link module:shared/lib/puckContentSanitize},
 * skipping URL/media keys. Rich HTML props use plain-text extraction.
 *
 * @module shared/lib/puckContentPolicy
 *
 * Tests: `npm run test:puck-content-policy`
 * Registry: `.ai/docs/testing.md`
 */

import { CONTENT_POLICY_BLOCKED_WORD_MESSAGE } from "@shared/constants/contentPolicy";
import {
  getBlockedWordErrorInRichText,
  getBlockedWordErrorInStoredText,
} from "@shared/lib/contentPolicy";
import { looksLikeEditorHtml } from "@shared/lib/nexusRichTextSanitize";

/** Prop keys storing TipTap HTML. */
const RICH_TEXT_KEYS = new Set(["text", "content"]);

/** Prop keys storing URLs — excluded from language policy. */
const SKIP_CONTENT_POLICY_KEYS = new Set([
  "href",
  "image",
  "backgroundImage",
  "url",
  "avatar",
  "icon",
  "videoId",
  "embedUrl",
  "pagePath",
  "id",
  "type",
  "variant",
  "align",
  "purpose",
  "fit",
  "target",
  "rel",
  "mentionType",
]);

/** One blocked-language hit inside Puck JSON. */
export interface PuckContentPolicyViolation {
  /** JSON path to the offending field (e.g. `content[0].props.text`). */
  path: string;
  /** User-facing rejection message. */
  message: string;
}

/**
 * Scan one string prop for blocked language.
 *
 * @param key - Puck prop key.
 * @param value - Raw string value.
 * @returns Violation metadata or null when clean.
 */
function scanPuckStringProp(key: string, value: string): PuckContentPolicyViolation | null {
  if (SKIP_CONTENT_POLICY_KEYS.has(key)) return null;
  if (!value.trim()) return null;

  const message =
    RICH_TEXT_KEYS.has(key) || looksLikeEditorHtml(value)
      ? getBlockedWordErrorInRichText(value)
      : getBlockedWordErrorInStoredText(value);

  if (!message) return null;

  return { path: key, message };
}

/**
 * Deep-walk Puck JSON and collect content-policy violations.
 *
 * @param value - Arbitrary Puck data subtree.
 * @param pathPrefix - JSON path prefix for nested props.
 * @returns All violations found (empty when clean).
 */
function scanPuckDataNode(value: unknown, pathPrefix: string): PuckContentPolicyViolation[] {
  if (value == null || typeof value !== "object") return [];

  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      scanPuckDataNode(item, `${pathPrefix}[${index}]`),
    );
  }

  const violations: PuckContentPolicyViolation[] = [];

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const fieldPath = pathPrefix ? `${pathPrefix}.${key}` : key;

    if (typeof nested === "string") {
      const hit = scanPuckStringProp(key, nested);
      if (hit) {
        violations.push({ path: fieldPath, message: hit.message });
      }
    } else {
      violations.push(...scanPuckDataNode(nested, fieldPath));
    }
  }

  return violations;
}

/**
 * Scan Puck page data for blocked language.
 *
 * @param puckData - Raw Puck layout JSON.
 * @returns Violation list; empty when acceptable.
 */
export function scanPuckDataContentPolicy(puckData: unknown): PuckContentPolicyViolation[] {
  if (!puckData || typeof puckData !== "object") return [];
  return scanPuckDataNode(puckData, "");
}

/**
 * First Puck content-policy violation, or null when clean.
 *
 * @param puckData - Raw Puck layout JSON.
 * @returns First violation or null.
 */
export function getFirstPuckContentPolicyViolation(
  puckData: unknown,
): PuckContentPolicyViolation | null {
  const violations = scanPuckDataContentPolicy(puckData);
  return violations[0] ?? null;
}

/**
 * Assert Puck data passes content policy; throws with a user-facing message.
 *
 * @param puckData - Raw Puck layout JSON.
 * @throws When blocked language is detected.
 */
export function assertPuckDataContentPolicy(puckData: unknown): void {
  const violation = getFirstPuckContentPolicyViolation(puckData);
  if (violation) {
    throw new Error(violation.message || CONTENT_POLICY_BLOCKED_WORD_MESSAGE);
  }
}

/**
 * Assert a page title passes content policy.
 *
 * @param title - Page title string.
 * @throws When blocked language is detected.
 */
export function assertPageTitleContentPolicy(title: string | undefined | null): void {
  if (!title?.trim()) return;
  const message = getBlockedWordErrorInStoredText(title);
  if (message) throw new Error(message);
}
