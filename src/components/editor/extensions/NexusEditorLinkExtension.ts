/**
 * @fileoverview TipTap link mark that ignores Nexus mention badge anchors.
 *
 * The stock {@link Link} extension parses every `a[href]`, which causes
 * `data-nexus-mention` atoms to round-trip as `nexus-rich-text__link` marks with
 * duplicated `@label` text when {@link NexusRichTextEditor} reloads stored HTML.
 *
 * @module src/components/editor/extensions/NexusEditorLinkExtension
 */

import Link from "@tiptap/extension-link";
import { isSafeHref } from "@/lib/nexusEditor/nexusEditorContent";

/**
 * Hyperlink mark for user-authored links — excludes mention badge anchors.
 */
export const NexusEditorLinkExtension = Link.extend({
  parseHTML() {
    return [
      {
        tag: 'a[href]:not([data-nexus-mention])',
        getAttrs: (dom) => {
          const href = (dom as HTMLElement).getAttribute("href");
          if (!href || !isSafeHref(href)) {
            return false;
          }
          return null;
        },
      },
    ];
  },
});
