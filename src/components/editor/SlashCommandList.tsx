"use client";

/**
 * @fileoverview Floating `/` slash command list for the Nexus rich text editor.
 *
 * @module src/components/editor/SlashCommandList
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  Bold,
  Code,
  Heading,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Text,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SLASH_COMMAND_GROUP_LABELS,
  type NexusSlashCommandDefinition,
  type NexusSlashCommandGroup,
  type NexusSlashCommandIcon,
} from "@/lib/nexusEditor/slashCommandCatalog";
import type { SuggestionListHandle } from "./lib/createSuggestionPortalRenderer";

/** Props forwarded from `@tiptap/suggestion`. */
export interface SlashCommandListProps {
  /** Filtered slash command rows. */
  items: NexusSlashCommandDefinition[];
  /** TipTap-provided selection callback. */
  command: (item: NexusSlashCommandDefinition) => void;
  /** Index of the keyboard-highlighted row. */
  selectedIndex: number;
}

/** Map icon keys to Lucide components. */
const SLASH_ICON_MAP: Record<NexusSlashCommandIcon, LucideIcon> = {
  text: Text,
  heading: Heading,
  list: List,
  "list-ordered": ListOrdered,
  quote: Quote,
  code: Code,
  minus: Minus,
  bold: Bold,
  italic: Italic,
  strikethrough: Strikethrough,
};

/**
 * `/` slash command popup — keyboard navigable, grouped by block type.
 */
export const SlashCommandList = forwardRef<SuggestionListHandle, SlashCommandListProps>(
  function SlashCommandList({ items, command, selectedIndex }, ref) {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
      setActiveIndex(selectedIndex);
    }, [selectedIndex]);

    useImperativeHandle(ref, () => ({
      onKeyDown: (event: KeyboardEvent) => {
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setActiveIndex((index) => (index + items.length - 1) % items.length);
          return true;
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setActiveIndex((index) => (index + 1) % items.length);
          return true;
        }

        if (event.key === "Enter") {
          event.preventDefault();
          const item = items[activeIndex];
          if (item) command(item);
          return true;
        }

        return false;
      },
    }));

    if (!items.length) {
      return (
        <div className="nexus-slash-suggestion" role="listbox" aria-label="Slash commands">
          <p className="nexus-slash-suggestion__empty">No commands</p>
        </div>
      );
    }

    let lastGroup: NexusSlashCommandGroup | null = null;

    return (
      <div className="nexus-slash-suggestion" role="listbox" aria-label="Slash commands">
        {items.map((item, index) => {
          const showHeading = item.group !== lastGroup;
          lastGroup = item.group;
          const isActive = index === activeIndex;
          const Icon = SLASH_ICON_MAP[item.icon];

          return (
            <div key={item.id}>
              {showHeading ? (
                <div className="nexus-slash-suggestion__heading">
                  {SLASH_COMMAND_GROUP_LABELS[item.group]}
                </div>
              ) : null}
              <button
                type="button"
                role="option"
                aria-selected={isActive}
                className={cn(
                  "nexus-slash-suggestion__item",
                  isActive && "nexus-slash-suggestion__item--active",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => command(item)}
              >
                <span className="nexus-slash-suggestion__icon" aria-hidden>
                  <Icon size={14} strokeWidth={2} />
                </span>
                <span className="nexus-slash-suggestion__text">
                  <span className="nexus-slash-suggestion__label">{item.title}</span>
                  {item.subtitle ? (
                    <span className="nexus-slash-suggestion__subtitle">{item.subtitle}</span>
                  ) : null}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    );
  },
);
