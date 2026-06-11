/**
 * @fileoverview Sanitize and normalize rich text HTML for Nexus body text blocks.
 *
 * @module src/components/puck/lib/richTextContent
 */

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
 * Strip disallowed tags and event-handler attributes from HTML.
 *
 * Uses DOMParser in the browser; falls back to plain-text escape on the server.
 *
 * @param html - Raw HTML from Tiptap or legacy content.
 * @returns Sanitized HTML string.
 */
export function sanitizeRichTextHtml(html: string): string {
  if (!html || typeof html !== "string") return "";

  const trimmed = html.trim();
  if (!trimmed) return "";

  if (typeof DOMParser === "undefined") {
    return escapePlainText(trimmed);
  }

  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  const body = doc.body;

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
    if (child.nodeType === Node.ELEMENT_NODE) {
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
