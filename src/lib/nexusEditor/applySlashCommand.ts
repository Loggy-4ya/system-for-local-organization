/**
 * @fileoverview Apply slash command mutations to a TipTap editor instance.
 *
 * @module src/lib/nexusEditor/applySlashCommand
 */

import type { Editor } from "@tiptap/core";
import type { NexusSlashCommandId } from "./slashCommandCatalog";

/** Inclusive document range replaced by a slash command (`/query` text). */
export interface SlashCommandRange {
  /** Start position of the `/` trigger (inclusive). */
  from: number;
  /** End position after the typed query (exclusive). */
  to: number;
}

/**
 * Execute a slash command — deletes the `/query` range then applies formatting.
 *
 * @param editor - Active TipTap editor.
 * @param range - Suggestion range covering `/` and typed filter text.
 * @param commandId - Selected catalog command id.
 */
export function applySlashCommand(
  editor: Editor,
  range: SlashCommandRange,
  commandId: NexusSlashCommandId,
): void {
  const chain = editor.chain().focus().deleteRange(range);

  switch (commandId) {
    case "paragraph":
      chain.setParagraph().run();
      return;
    case "heading2":
      chain.setParagraph().toggleHeading({ level: 2 }).run();
      return;
    case "heading3":
      chain.setParagraph().toggleHeading({ level: 3 }).run();
      return;
    case "bulletList":
      chain.toggleBulletList().run();
      return;
    case "orderedList":
      chain.toggleOrderedList().run();
      return;
    case "blockquote":
      chain.toggleBlockquote().run();
      return;
    case "codeBlock":
      chain.toggleCodeBlock().run();
      return;
    case "horizontalRule":
      chain.setHorizontalRule().run();
      return;
    case "bold":
      chain.toggleBold().run();
      return;
    case "italic":
      chain.toggleItalic().run();
      return;
    case "strike":
      chain.toggleStrike().run();
      return;
    default:
      chain.run();
  }
}
