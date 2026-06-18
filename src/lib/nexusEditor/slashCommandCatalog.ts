/**
 * @fileoverview Slash command catalog and query filtering for the Nexus rich text editor.
 *
 * Built on the same `@tiptap/suggestion` primitive as `@` mentions — TipTap does not
 * ship a published slash-command package for v3.
 *
 * Tests: `npm run test:nexus-editor-slash` — see `tests/lib/nexusEditor/slashCommandCatalog.test.ts`
 *
 * @module src/lib/nexusEditor/slashCommandCatalog
 */

import type { NexusEditorVariant } from "./editorTypes";

/** Stable ids referenced by {@link applySlashCommand}. */
export type NexusSlashCommandId =
  | "paragraph"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule"
  | "bold"
  | "italic"
  | "strike";

/** Lucide icon keys rendered by {@link SlashCommandList}. */
export type NexusSlashCommandIcon =
  | "text"
  | "heading"
  | "list"
  | "list-ordered"
  | "quote"
  | "code"
  | "minus"
  | "bold"
  | "italic"
  | "strikethrough";

/** Slash menu section for grouped headings. */
export type NexusSlashCommandGroup = "basic" | "lists" | "blocks" | "inline";

/**
 * One `/` menu row — metadata only; editor mutations live in {@link applySlashCommand}.
 */
export interface NexusSlashCommandDefinition {
  /** Unique command id passed to TipTap suggestion `command`. */
  id: NexusSlashCommandId;
  /** Primary label in the slash menu. */
  title: string;
  /** Secondary hint (e.g. "Plain text block"). */
  subtitle?: string;
  /** Extra search tokens beyond the title. */
  keywords: string[];
  /** Menu section heading key. */
  group: NexusSlashCommandGroup;
  /** Icon key for the suggestion row. */
  icon: NexusSlashCommandIcon;
  /** Editor variants that expose this command. */
  variants: NexusEditorVariant[];
}

/** Section labels for the slash suggestion popup. */
export const SLASH_COMMAND_GROUP_LABELS: Record<NexusSlashCommandGroup, string> = {
  basic: "Basic blocks",
  lists: "Lists",
  blocks: "Blocks",
  inline: "Inline",
};

/** Default slash commands shipped with {@link NexusRichTextEditor}. */
export const DEFAULT_SLASH_COMMANDS: NexusSlashCommandDefinition[] = [
  {
    id: "paragraph",
    title: "Text",
    subtitle: "Plain paragraph",
    keywords: ["text", "paragraph", "p"],
    group: "basic",
    icon: "text",
    variants: ["minimal", "default", "full"],
  },
  {
    id: "heading2",
    title: "Heading 2",
    subtitle: "Section title",
    keywords: ["heading", "h2", "title", "section"],
    group: "basic",
    icon: "heading",
    variants: ["minimal", "default", "full"],
  },
  {
    id: "heading3",
    title: "Heading 3",
    subtitle: "Subsection title",
    keywords: ["heading", "h3", "subtitle"],
    group: "basic",
    icon: "heading",
    variants: ["default", "full"],
  },
  {
    id: "bulletList",
    title: "Bullet list",
    subtitle: "Unordered list",
    keywords: ["bullet", "list", "ul", "unordered"],
    group: "lists",
    icon: "list",
    variants: ["minimal", "default", "full"],
  },
  {
    id: "orderedList",
    title: "Numbered list",
    subtitle: "Ordered list",
    keywords: ["numbered", "ordered", "list", "ol"],
    group: "lists",
    icon: "list-ordered",
    variants: ["default", "full"],
  },
  {
    id: "blockquote",
    title: "Quote",
    subtitle: "Indented quotation",
    keywords: ["quote", "blockquote", "citation"],
    group: "blocks",
    icon: "quote",
    variants: ["minimal", "default", "full"],
  },
  {
    id: "codeBlock",
    title: "Code block",
    subtitle: "Monospace code",
    keywords: ["code", "snippet", "pre"],
    group: "blocks",
    icon: "code",
    variants: ["default", "full"],
  },
  {
    id: "horizontalRule",
    title: "Divider",
    subtitle: "Horizontal line",
    keywords: ["divider", "hr", "line", "separator", "rule"],
    group: "blocks",
    icon: "minus",
    variants: ["full"],
  },
  {
    id: "bold",
    title: "Bold",
    subtitle: "Strong emphasis",
    keywords: ["bold", "strong", "b"],
    group: "inline",
    icon: "bold",
    variants: ["full"],
  },
  {
    id: "italic",
    title: "Italic",
    subtitle: "Emphasis",
    keywords: ["italic", "emphasis", "i"],
    group: "inline",
    icon: "italic",
    variants: ["full"],
  },
  {
    id: "strike",
    title: "Strikethrough",
    subtitle: "Cross out text",
    keywords: ["strike", "strikethrough", "s"],
    group: "inline",
    icon: "strikethrough",
    variants: ["full"],
  },
];

/**
 * Normalise a slash query string for token matching.
 *
 * @param query - Raw query after `/`.
 * @returns Lowercase trimmed query.
 */
export function normalizeSlashQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Score how well a command matches a slash query (higher = better).
 *
 * @param command - Candidate command definition.
 * @param query - Normalised query string.
 * @returns Match score, or 0 when no match.
 */
export function scoreSlashCommandMatch(
  command: NexusSlashCommandDefinition,
  query: string,
): number {
  if (!query) return 1;

  const haystack = [command.title, ...command.keywords, command.subtitle ?? ""]
    .join(" ")
    .toLowerCase();

  if (command.title.toLowerCase().startsWith(query)) return 100;
  if (haystack.includes(query)) return 50;

  const tokens = query.split(/\s+/).filter(Boolean);
  if (tokens.every((token) => haystack.includes(token))) return 25;

  return 0;
}

/**
 * Filter slash commands for the active editor variant and typed query.
 *
 * @param query - Partial text after `/`.
 * @param variant - Active editor toolbar variant.
 * @param extraCommands - Optional host-provided commands appended to defaults.
 * @returns Ordered matching commands (best matches first).
 */
export function filterSlashCommands(
  query: string,
  variant: NexusEditorVariant,
  extraCommands: NexusSlashCommandDefinition[] = [],
): NexusSlashCommandDefinition[] {
  const normalized = normalizeSlashQuery(query);
  const catalog = [...DEFAULT_SLASH_COMMANDS, ...extraCommands].filter((command) =>
    command.variants.includes(variant),
  );

  return catalog
    .map((command) => ({
      command,
      score: scoreSlashCommandMatch(command, normalized),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title))
    .map((entry) => entry.command);
}
