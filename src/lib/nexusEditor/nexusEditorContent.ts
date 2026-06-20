/**
 * @fileoverview Re-export shared rich text sanitizer for the web app layer.
 *
 * @module src/lib/nexusEditor/nexusEditorContent
 *
 * Tests: `npm run test:nexus-editor-content`
 */

export { isSafeHref, sanitizeUserHref } from "@shared/lib/safeHref";
export {
  isNexusMentionElement,
  looksLikeEditorHtml,
  mentionBadgeClassName,
  normalizeNexusEditorHtmlForRender,
  parseMentionAnchorAttributes,
  sanitizeNexusEditorHtml,
  serializeMentionAnchor,
} from "@shared/lib/nexusRichTextSanitize";
