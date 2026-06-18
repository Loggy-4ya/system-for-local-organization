/**
 * @fileoverview Sanitize and normalize rich text HTML for Nexus body text blocks.
 *
 * Delegates to the site-wide {@link normalizeNexusEditorHtmlForRender} sanitizer so
 * Puck body text supports mentions, slash-command blocks (`hr`, `pre`), and links.
 *
 * @module src/components/puck/lib/richTextContent
 */

export {
  isSafeHref,
  looksLikeEditorHtml as looksLikeHtml,
  normalizeNexusEditorHtmlForRender as normalizeRichTextForRender,
  sanitizeNexusEditorHtml as sanitizeRichTextHtml,
} from "@/lib/nexusEditor/nexusEditorContent";
