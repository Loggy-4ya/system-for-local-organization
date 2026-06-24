"use client";

/**
 * @fileoverview TipTap `/` slash command extension using `@tiptap/suggestion`.
 *
 * TipTap documents slash commands as an experiment with no published package;
 * this module implements the official recommended approach on top of suggestion.
 *
 * @module src/components/editor/extensions/NexusSlashCommandExtension
 */

import { Extension } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import { PluginKey, type EditorState } from "@tiptap/pm/state";
import { applySlashCommand } from "@/lib/nexusEditor/applySlashCommand";
import type { NexusEditorVariant } from "@/lib/nexusEditor/editorTypes";
import {
  filterSlashCommands,
  type NexusSlashCommandDefinition,
} from "@/lib/nexusEditor/slashCommandCatalog";

/** TipTap plugin key for the slash command suggestion popup. */
export const nexusSlashCommandPluginKey = new PluginKey("nexusSlashCommandSuggestion");

/** Options for {@link NexusSlashCommandExtension}. */
export interface NexusSlashCommandExtensionOptions {
  /** Toolbar variant — controls which commands appear in the menu. */
  variant: NexusEditorVariant;
  /** Floating menu renderer (React portal via {@link createSuggestionPortalRenderer}). */
  renderSuggestion: SuggestionOptions<NexusSlashCommandDefinition>["render"];
  /** Extra host-provided commands merged into the default catalog. */
  extraCommands?: NexusSlashCommandDefinition[];
  /** Character that opens the slash menu. */
  suggestionChar: string;
}

/**
 * Whether `/` is allowed at the current document position (start of block or after whitespace).
 *
 * @param state - ProseMirror editor state.
 * @param range - Suggestion match range.
 * @returns True when slash commands may open.
 */
function isSlashCommandAllowed(
  state: EditorState,
  range: { from: number },
): boolean {
  const $from = state.doc.resolve(range.from);
  if (!$from.parent.type.isTextblock) return false;

  const textBefore = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 1),
    $from.parentOffset,
    undefined,
    "\ufffc",
  );

  return textBefore === "" || /\s/.test(textBefore);
}

/**
 * Slash command extension — Notion-style `/` block and inline formatting menu.
 */
export const NexusSlashCommandExtension = Extension.create<NexusSlashCommandExtensionOptions>({
  name: "nexusSlashCommand",

  addOptions() {
    return {
      variant: "default" as NexusEditorVariant,
      renderSuggestion: () => ({}),
      extraCommands: [],
      suggestionChar: "/",
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        char: this.options.suggestionChar,
        pluginKey: nexusSlashCommandPluginKey,
        shouldShow: () => this.editor.isFocused,
        command: ({ editor, range, props }) => {
          applySlashCommand(editor, range, props.id);
        },
        allow: ({ state, range }) => isSlashCommandAllowed(state, range),
        items: ({ query }) =>
          filterSlashCommands(query, this.options.variant, this.options.extraCommands),
        render: this.options.renderSuggestion,
      }),
    ];
  },
});
