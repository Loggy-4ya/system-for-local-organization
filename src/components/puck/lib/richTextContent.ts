/**
 * @fileoverview Sanitize and normalize rich text HTML for Nexus body text blocks.
 *
 * @module src/components/puck/lib/richTextContent
 */

/** DOM node type for elements (`Node.ELEMENT_NODE`). */
const ELEMENT_NODE = 1;

/** Tags allowed in stored/rendered rich text (StarterKit + links). */
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
]);

/** Safe URL protocols for inline links. */
const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Validate whether a hyperlink target is safe to render.
 *
 * @param href - Raw href attribute.
 * @returns True when the URL is allowed.
 */
export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;

  try {
    const url = new URL(trimmed, "https://example.com");
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize HTML on the server without DOM APIs (matches browser allowlist output).
 *
 * @param html - Raw HTML fragment.
 * @returns Sanitized HTML string.
 */
function sanitizeRichTextHtmlServer(html: string): string {
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
      const hrefMatch = /href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
      const href = (hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || "").trim();
      if (!isSafeHref(href)) {
        return "";
      }

      const isExternal =
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:");
      const target = isExternal ? " target=\"_blank\"" : "";
      const rel = isExternal ? " rel=\"noopener noreferrer\"" : "";
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
 * Parse HTML into a body element for sanitization (browser only).
 *
 * @param html - Raw HTML fragment.
 * @returns Document body containing the fragment.
 */
function parseRichTextBody(html: string): HTMLElement {
  return new DOMParser().parseFromString(html, "text/html").body;
}

/**
 * Strip disallowed tags and event-handler attributes from HTML.
 *
 * Uses DOMParser in the browser; a matching string sanitizer during SSR (no linkedom).
 *
 * @param html - Raw HTML from Tiptap or legacy content.
 * @returns Sanitized HTML string.
 */
export function sanitizeRichTextHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  const trimmed = html.trim();
  if (!trimmed) return "";

  if (typeof DOMParser === "undefined") {
    return sanitizeRichTextHtmlServer(trimmed);
  }

  const body = parseRichTextBody(trimmed);
  sanitizeNode(body);

  return body.innerHTML.trim();
}

/**
 * Unwrap an element — move children to parent and remove the element.
 *
 * @param el - Element to unwrap.
 * @param parent - Parent node.
 */
function unwrapElement(el: HTMLElement, parent: Node): void {
  while (el.firstChild) {
    parent.insertBefore(el.firstChild, el);
  }
  parent.removeChild(el);
}

/**
 * Sanitize anchor attributes and drop unsafe links.
 *
 * @param el - Anchor element.
 * @param parent - Parent for unwrap fallback.
 */
function sanitizeAnchor(el: HTMLAnchorElement, parent: Node): void {
  const href = el.getAttribute("href") || "";
  if (!isSafeHref(href)) {
    unwrapElement(el, parent);
    return;
  }

  const attrs = Array.from(el.attributes);
  for (const attr of attrs) {
    el.removeAttribute(attr.name);
  }

  el.setAttribute("href", href.trim());

  const isExternal =
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:");

  if (isExternal) {
    el.setAttribute("target", "_blank");
    el.setAttribute("rel", "noopener noreferrer");
  }

  el.setAttribute("class", "nexus-rich-text__link");
  sanitizeNode(el);
}

/**
 * Recursively sanitize a DOM node tree.
 *
 * @param node - Node to sanitize in place.
 */
function sanitizeNode(node: Node): void {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === "a") {
        sanitizeAnchor(el as HTMLAnchorElement, node);
        continue;
      }

      if (!ALLOWED_TAGS.has(tag)) {
        unwrapElement(el, node);
        continue;
      }

      for (const attr of Array.from(el.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith("on") || name === "style" || name === "class" || name === "id") {
          el.removeAttribute(attr.name);
        }
      }

      sanitizeNode(el);
    }
  }
}

/**
 * Escape plain text for safe HTML insertion.
 *
 * @param text - Raw plain text.
 * @returns HTML-escaped string wrapped in a paragraph when multiline.
 */
export function escapePlainText(text: string): string {
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

/**
 * Detect whether a string contains HTML markup.
 *
 * @param text - Stored body text value.
 * @returns True when angle-bracket tags are present.
 */
export function looksLikeHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

/**
 * Normalize stored text for canvas/published render.
 *
 * Legacy plain strings are wrapped; HTML is sanitized.
 *
 * @param text - Stored Puck prop value.
 * @returns Safe HTML for `dangerouslySetInnerHTML`.
 */
export function normalizeRichTextForRender(text: string | undefined): string {
  if (!text) return "";

  if (looksLikeHtml(text)) {
    return sanitizeRichTextHtml(text);
  }

  return escapePlainText(text);
}
