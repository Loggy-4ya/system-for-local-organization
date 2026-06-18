"use client";

/**
 * @fileoverview Floating `@` suggestion list for the Nexus rich text editor.
 *
 * @module src/components/editor/MentionSuggestionList
 */

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { FileText, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NexusMentionItem } from "@shared/lib/nexusMentionTypes";

/** Row with optional pre-computed section for grouped headings. */
type MentionRow = NexusMentionItem & { section?: "users" | "pages" };

/**
 * Resolve the suggestion section for a mention row.
 *
 * @param item - Mention suggestion row.
 * @returns Section key for grouped headings.
 */
function resolveMentionSection(item: MentionRow): "users" | "pages" {
  if (item.section) return item.section;
  return item.mentionType === "page" ? "pages" : "users";
}

import type { SuggestionListHandle } from "./lib/createSuggestionPortalRenderer";

/** Props forwarded from `@tiptap/suggestion`. */
export interface MentionSuggestionListProps {
  /** Flattened suggestion rows. */
  items: MentionRow[];
  /** TipTap-provided selection callback. */
  command: (item: MentionRow) => void;
  /** Index of the keyboard-highlighted row. */
  selectedIndex: number;
}

/** Imperative handle exposed to the TipTap suggestion plugin. */
export type MentionSuggestionListHandle = SuggestionListHandle;

/**
 * Group heading labels for mention sections.
 */
const SECTION_LABELS: Record<"users" | "pages", string> = {
  users: "People",
  pages: "Pages",
};

/**
 * `@` autocomplete popup — keyboard navigable list grouped by users and pages.
 */
export const MentionSuggestionList = forwardRef<
  MentionSuggestionListHandle,
  MentionSuggestionListProps
>(function MentionSuggestionList({ items, command, selectedIndex }, ref) {
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
      <div className="nexus-mention-suggestion" role="listbox" aria-label="Mention suggestions">
        <p className="nexus-mention-suggestion__empty">No matches</p>
      </div>
    );
  }

  let lastSection: "users" | "pages" | null = null;

  return (
    <div className="nexus-mention-suggestion" role="listbox" aria-label="Mention suggestions">
      {items.map((item, index) => {
        const section = resolveMentionSection(item);
        const showHeading = section !== lastSection;
        lastSection = section;
        const isActive = index === activeIndex;

        return (
          <div key={`${section}-${item.id}`}>
            {showHeading ? (
              <div className="nexus-mention-suggestion__heading">
                {SECTION_LABELS[section]}
              </div>
            ) : null}
            <button
              type="button"
              role="option"
              aria-selected={isActive}
              className={cn(
                "nexus-mention-suggestion__item",
                isActive && "nexus-mention-suggestion__item--active",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => command(item)}
            >
              <span className="nexus-mention-suggestion__icon" aria-hidden>
                {item.mentionType === "page" ? (
                  <FileText size={14} strokeWidth={2} />
                ) : item.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatar} alt="" className="nexus-mention-suggestion__avatar" />
                ) : (
                  <UserRound size={14} strokeWidth={2} />
                )}
              </span>
              <span className="nexus-mention-suggestion__text">
                <span className="nexus-mention-suggestion__label">{item.label}</span>
                {item.subtitle ? (
                  <span className="nexus-mention-suggestion__subtitle">{item.subtitle}</span>
                ) : null}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
});
