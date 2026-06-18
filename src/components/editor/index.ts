/**
 * @fileoverview Public exports for the site-wide Nexus rich text editor kit.
 *
 * @module src/components/editor
 */

export { NexusRichTextEditor, type NexusRichTextEditorProps } from "./NexusRichTextEditor";
export {
  NexusMentionBadgeLink,
  NexusRichTextView,
  type NexusRichTextViewProps,
} from "./NexusRichTextView";
export { NexusMentionBadge } from "./NexusMentionBadge";
export { MentionSuggestionList } from "./MentionSuggestionList";
export { SlashCommandList } from "./SlashCommandList";
export { createNexusEditorExtensions, type NexusEditorVariant } from "./extensions/createNexusEditorExtensions";
export { NexusMentionExtension } from "./extensions/NexusMentionExtension";
export { NexusSlashCommandExtension } from "./extensions/NexusSlashCommandExtension";
export {
  DEFAULT_SLASH_COMMANDS,
  filterSlashCommands,
  type NexusSlashCommandDefinition,
  type NexusSlashCommandId,
} from "@/lib/nexusEditor/slashCommandCatalog";
