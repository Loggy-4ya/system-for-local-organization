"use client";

/**
 * @fileoverview TipTap inline mention node with `@` suggestion plugin.
 *
 * @module src/components/editor/extensions/NexusMentionExtension
 */

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { NexusMentionBadge } from "../NexusMentionBadge";
import { mentionBadgeClassName } from "@/lib/nexusEditor/nexusEditorContent";
import type { NexusMentionItem } from "@shared/lib/nexusMentionTypes";

/** TipTap plugin key for the mention suggestion popup. */
export const nexusMentionPluginKey = new PluginKey("nexusMentionSuggestion");

/** Options for {@link NexusMentionExtension}. */
export interface NexusMentionExtensionOptions {
  /**
   * Resolve mention targets for a typed query.
   * Return flat {@link NexusMentionItem} rows or section-tagged rows.
   */
  searchMentions: (query: string) => Promise<NexusMentionItem[]>;

  /**
   * Render the floating suggestion list (ReactRenderer wrapper supplied by caller).
   */
  renderSuggestion: SuggestionOptions<NexusMentionItem>["render"];

  /** Character that opens the mention picker. */
  suggestionChar: string;
}

/**
 * Inline atom node for `@user` and `@page` badge mentions.
 */
export const NexusMentionExtension = Node.create<NexusMentionExtensionOptions>({
  name: "nexusMention",

  group: "inline",

  inline: true,

  selectable: false,

  atom: true,

  addOptions() {
    return {
      searchMentions: async () => [],
      renderSuggestion: () => ({}),
      suggestionChar: "@",
    };
  },

  addAttributes() {
    return {
      mentionType: {
        default: "user",
        parseHTML: (element) => element.getAttribute("data-mention-type"),
        renderHTML: (attributes) => ({
          "data-mention-type": attributes.mentionType,
        }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-id"),
        renderHTML: (attributes) => ({
          "data-id": attributes.id,
        }),
      },
      label: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-label"),
        renderHTML: (attributes) => ({
          "data-label": attributes.label,
        }),
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute("href"),
        renderHTML: (attributes) => ({
          href: attributes.href,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-nexus-mention]',
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const mentionType = node.attrs.mentionType as string;
    const label = node.attrs.label as string;
    const pagePathAttr =
      mentionType === "page" && node.attrs.href
        ? { "data-page-path": node.attrs.href as string }
        : {};

    return [
      "a",
      mergeAttributes(HTMLAttributes, {
        "data-nexus-mention": "",
        class: mentionBadgeClassName(mentionType as "user" | "page"),
        ...pagePathAttr,
      }),
      `@${label}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NexusMentionBadge);
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: this.options.suggestionChar,
        pluginKey: nexusMentionPluginKey,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: this.name,
                attrs: {
                  mentionType: props.mentionType,
                  id: props.id,
                  label: props.label,
                  href: props.href,
                },
              },
              { type: "text", text: " " },
            ])
            .run();
        },
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const type = state.schema.nodes[this.name];
          if (!type) return false;
          return !!$from.parent.type.contentMatch.matchType(type);
        },
        items: async ({ query }) => this.options.searchMentions(query),
        render: this.options.renderSuggestion,
      }),
    ];
  },
});
