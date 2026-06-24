/**
 * @fileoverview Sanitize and normalize Nexus rich text HTML (mentions + StarterKit).
 *
 * Shared between web UI, Puck persistence, and Node unit tests.
 *
 * Tests: `npm run test:nexus-editor-content`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/nexusRichTextSanitize
 */

import type { NexusMentionType } from "@shared/lib/nexusMentionTypes";
import { normalizeMentionLabel } from "@shared/lib/nexusMentionTypes";
import { isSafeHref } from "@shared/lib/safeHref";

/** Tags allowed in stored/rendered Nexus rich text (StarterKit + links + mentions). */
const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "s",
  "strike",
  "code",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "hr",
  "pre",
]);

/** Valid mention type attribute values. */
const MENTION_TYPES = new Set<NexusMentionType>(["user", "page"]);

/**
 * Whether an anchor element represents a Nexus mention badge.
 *
 * @param el - Candidate anchor element.
 * @returns True when `data-nexus-mention` is present.
 */
export function isNexusMentionElement(el: Element): boolean {
  return el.hasAttribute("data-nexus-mention");
}

/**
 * Build CSS classes for a mention badge from its type.
 *
 * @param mentionType - User or page mention.
 * @returns Space-delimited class string.
 */
export function mentionBadgeClassName(mentionType: NexusMentionType): string {
  return `nexus-mention nexus-mention--${mentionType}`;
}

/**
 * Parse and validate mention attributes from a DOM anchor.
 *
 * @param el - Mention anchor element.
 * @returns Normalised attrs or null when invalid.
 */
export function parseMentionAnchorAttributes(el: HTMLAnchorElement): {
  mentionType: NexusMentionType;
  id: string;
  label: string;
  href: string;
} | null {
  const mentionType = el.getAttribute("data-mention-type");
  if (!mentionType || !MENTION_TYPES.has(mentionType as NexusMentionType)) {
    return null;
  }

  const id = (el.getAttribute("data-id") || "").trim();
  const label = normalizeMentionLabel(
    el.getAttribute("data-label") || el.textContent || "",
  );
  const href = (el.getAttribute("href") || "").trim();

  if (!id || !label || !isSafeHref(href)) {
    return null;
  }

  return {
    mentionType: mentionType as NexusMentionType,
    id,
    label,
    href,
  };
}

/**
 * Serialise mention attrs to an HTML anchor string (SSR-safe).
 *
 * @param attrs - Mention node attributes.
 * @returns Sanitised opening anchor tag.
 */
export function serializeMentionAnchor(attrs: {
  mentionType: NexusMentionType;
  id: string;
  label: string;
  href: string;
}): string {
  if (!attrs.id || !attrs.label || !isSafeHref(attrs.href)) {
    return "";
  }

  const normalizedLabel = normalizeMentionLabel(attrs.label);
  if (!normalizedLabel) {
    return "";
  }

  const safeHref = attrs.href.replace(/"/g, "&quot;");
  const safeLabel = normalizedLabel.replace(/"/g, "&quot;");
  const safeId = attrs.id.replace(/"/g, "&quot;");
  const pagePathAttr =
    attrs.mentionType === "page"
      ? ` data-page-path="${safeHref.replace(/"/g, "&quot;")}"`
      : "";

  return `<a href="${safeHref}" data-nexus-mention="" data-mention-type="${attrs.mentionType}" data-id="${safeId}" data-label="${safeLabel}"${pagePathAttr} class="${mentionBadgeClassName(attrs.mentionType)}">@${safeLabel}</a>`;
}

/**
 * Sanitize HTML on the server without DOM APIs.
 *
 * @param html - Raw HTML fragment.
 * @returns Sanitized HTML string.
 */
function sanitizeNexusEditorHtmlServer(html: string): string {
  let out = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "");

  out = out.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (full, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    const isClose = full.startsWith("</");

    if (isClose) {
      return ALLOWED_TAGS.has(tag) ? `</${tag}>` : "";
    }

    if (!ALLOWED_TAGS.has(tag)) {
      return "";
    }

    const attrs = rawAttrs ?? "";

    if (tag === "a") {
      const isMention = /\bdata-nexus-mention\b/i.test(attrs);
      const hrefMatch = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const href = (hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || "").trim();

      if (isMention) {
        const typeMatch = /data-mention-type\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const idMatch = /data-id\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const labelMatch = /data-label\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
        const mentionType = (typeMatch?.[2] || typeMatch?.[3] || typeMatch?.[4] || "").trim();
        const id = (idMatch?.[2] || idMatch?.[3] || idMatch?.[4] || "").trim();
        const label = (labelMatch?.[2] || labelMatch?.[3] || labelMatch?.[4] || "").trim();

        if (!MENTION_TYPES.has(mentionType as NexusMentionType)) {
          return "";
        }

        const fullAnchor = serializeMentionAnchor({
          mentionType: mentionType as NexusMentionType,
          id,
          label,
          href,
        });
        if (!fullAnchor) {
          return "";
        }

        // Opening-tag pass only — inner `@label` text and `</a>` are processed separately.
        return fullAnchor.replace(/>@[^<]*<\/a>$/i, ">");
      }

      if (!isSafeHref(href)) {
        return "";
      }

      const isExternal =
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:");
      const target = isExternal ? ' target="_blank"' : "";
      const rel = isExternal ? ' rel="noopener noreferrer"' : "";
      const safeHref = href.replace(/"/g, "&quot;");
      return `<a href="${safeHref}" class="nexus-rich-text__link"${target}${rel}>`;
    }

    if (tag === "br") {
      return "<br>";
    }

    return `<${tag}>`;
  });

  return out.trim();
}

/**
 * Repair legacy mention HTML corrupted by link/mention parse collisions.
 *
 * - Removes orphan `@` characters left immediately before mention anchors.
 * - Removes duplicate `@label` plaintext tails after mention anchors.
 *
 * @param html - Raw or sanitized HTML fragment.
 * @returns Repaired HTML safe to load into TipTap.
 */
export function repairLegacyMentionHtml(html: string): string {
  if (!html) return "";

  let out = html;
  out = out.replace(/@\s*(<a\b[^>]*\bdata-nexus-mention\b)/gi, "$1");
  out = out.replace(
    /(<a\b[^>]*\bdata-nexus-mention\b[^>]*\bdata-label="([^"]*)"[^>]*>@\2<\/a>)@\2/gi,
    "$1",
  );
  return out;
}

/**
 * Strip disallowed tags and unsafe attributes from Nexus editor HTML.
 *
 * Always uses the regex SSR path so read-only renders produce identical markup
 * during Next.js hydration. A former DOMParser branch kept attrs such as TipTap
 * `dir="auto"` that the server path removed.
 *
 * @param html - Raw HTML from TipTap or legacy content.
 * @returns Sanitized HTML string.
 */
export function sanitizeNexusEditorHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  const trimmed = html.trim();
  if (!trimmed) return "";

  return sanitizeNexusEditorHtmlServer(repairLegacyMentionHtml(trimmed));
}

/**
 * Detect whether a string contains HTML markup.
 *
 * @param text - Stored rich text value.
 * @returns True when angle-bracket tags are present.
 */
export function looksLikeEditorHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Normalize stored rich text for read-only render.
 *
 * @param text - Stored HTML or legacy plain string.
 * @returns Safe HTML for `dangerouslySetInnerHTML`.
 */
export function normalizeNexusEditorHtmlForRender(text: string | undefined): string {
  if (!text) return "";

  if (looksLikeEditorHtml(text)) {
    return sanitizeNexusEditorHtml(text);
  }

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  if (escaped.includes("\n")) {
    return escaped
      .split("\n")
      .map((line) => `<p>${line || "<br>"}</p>`)
      .join("");
  }

  return `<p>${escaped}</p>`;
}
