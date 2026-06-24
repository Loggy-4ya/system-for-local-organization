/**
 * @fileoverview Factory for TipTap extensions used by {@link NexusRichTextEditor}.
 *
 * @module src/components/editor/extensions/createNexusEditorExtensions
 */

import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";
import type { NexusEditorVariant } from "@/lib/nexusEditor/editorTypes";
import { NexusEditorLinkExtension } from "./NexusEditorLinkExtension";
import {
  NexusMentionExtension,
  type NexusMentionExtensionOptions,
} from "./NexusMentionExtension";
import {
  NexusSlashCommandExtension,
  type NexusSlashCommandExtensionOptions,
} from "./NexusSlashCommandExtension";

export type { NexusEditorVariant } from "@/lib/nexusEditor/editorTypes";

/** Configuration for {@link createNexusEditorExtensions}. */
export interface CreateNexusEditorExtensionsOptions {
  /** Toolbar variant — also gates slash command catalog entries. */
  variant: NexusEditorVariant;
  /** Mention suggestion wiring (required for `@` picker). */
  mention: Pick<NexusMentionExtensionOptions, "searchMentions" | "renderSuggestion">;
  /** Slash command suggestion wiring (required for `/` picker). */
  slash: Pick<NexusSlashCommandExtensionOptions, "renderSuggestion" | "extraCommands">;
}

/**
 * Build the TipTap extension stack for site-wide Nexus rich text surfaces.
 *
 * @param options - Mention and slash handlers.
 * @returns Configured TipTap extensions array.
 */
export function createNexusEditorExtensions(
  options: CreateNexusEditorExtensionsOptions,
): Extensions {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    NexusEditorLinkExtension.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
      HTMLAttributes: {
        class: "nexus-rich-text__link",
      },
    }),
    NexusMentionExtension.configure({
      searchMentions: options.mention.searchMentions,
      renderSuggestion: options.mention.renderSuggestion,
    }),
    NexusSlashCommandExtension.configure({
      variant: options.variant,
      renderSuggestion: options.slash.renderSuggestion,
      extraCommands: options.slash.extraCommands,
    }),
  ];
}
