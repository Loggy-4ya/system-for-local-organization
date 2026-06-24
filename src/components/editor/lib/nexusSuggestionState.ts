/**
 * @fileoverview Helpers for detecting active TipTap `@` / `/` suggestion sessions.
 *
 * @module src/components/editor/lib/nexusSuggestionState
 */

import type { Editor } from "@tiptap/core";
import { nexusMentionPluginKey } from "../extensions/NexusMentionExtension";
import { nexusSlashCommandPluginKey } from "../extensions/NexusSlashCommandExtension";

/**
 * Whether a mention or slash suggestion popup is currently open in the editor.
 *
 * @param editor - Active TipTap editor instance.
 * @returns True when either suggestion plugin is active.
 */
export function isNexusSuggestionActive(editor: Editor): boolean {
  const mentionState = nexusMentionPluginKey.getState(editor.state);
  const slashState = nexusSlashCommandPluginKey.getState(editor.state);
  return Boolean(mentionState?.active || slashState?.active);
}
