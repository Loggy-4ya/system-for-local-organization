"use client";

/**
 * @fileoverview Read-only renderer for Nexus rich text HTML with mention badges.
 *
 * Page mentions expose `data-page-path` for a future hover preview card.
 * Wire {@link onPageMentionHover} when the preview component ships.
 *
 * @module src/components/editor/NexusRichTextView
 */

import { useCallback, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { normalizeNexusEditorHtmlForRender } from "@/lib/nexusEditor/nexusEditorContent";
import { useInterpolatedNexusValue } from "@/components/puck/lib/nexusPageVariablesContext";

/** Props for {@link NexusRichTextView}. */
export interface NexusRichTextViewProps {
  /** Sanitized or raw stored HTML from {@link NexusRichTextEditor}. */
  html: string;
  /** Additional wrapper class names. */
  className?: string;
  /**
   * When true, page mention anchors receive hover listeners for preview cards.
   * Preview UI is not implemented yet — hook is ready for Phase 5.
   */
  enablePagePreviews?: boolean;
  /**
   * Called when the pointer enters a page mention badge.
   * @param pagePath - Internal page path from `data-page-path`.
   * @param anchor - The hovered anchor element.
   */
  onPageMentionHover?: (pagePath: string, anchor: HTMLElement) => void;
  /**
   * Called when the pointer leaves a page mention badge.
   */
  onPageMentionLeave?: (pagePath: string, anchor: HTMLElement) => void;
}

/**
 * Read-only rich text surface — renders stored HTML with Nexus mention badge styles.
 *
 * @param props - HTML payload and optional page-preview hooks.
 * @returns Article wrapper with sanitised HTML body.
 */
export function NexusRichTextView({
  html,
  className,
  enablePagePreviews = false,
  onPageMentionHover,
  onPageMentionLeave,
}: NexusRichTextViewProps) {
  const rootRef = useRef<HTMLElement>(null);
  const interpolatedHtml = useInterpolatedNexusValue(html);

  const handlePointerOver = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enablePagePreviews) return;
      const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        "a.nexus-mention--page[data-page-path]",
      );
      if (!target) return;
      const pagePath = target.getAttribute("data-page-path");
      if (!pagePath) return;
      onPageMentionHover?.(pagePath, target);
    },
    [enablePagePreviews, onPageMentionHover],
  );

  const handlePointerOut = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!enablePagePreviews) return;
      const target = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        "a.nexus-mention--page[data-page-path]",
      );
      if (!target) return;
      const pagePath = target.getAttribute("data-page-path");
      if (!pagePath) return;
      onPageMentionLeave?.(pagePath, target);
    },
    [enablePagePreviews, onPageMentionLeave],
  );

  const safeHtml = normalizeNexusEditorHtmlForRender(interpolatedHtml);
  if (!safeHtml) return null;

  return (
    <article
      ref={rootRef}
      className={cn("nexus-rich-text-view", className)}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

/**
 * Presentational mention badge for programmatic renders outside TipTap.
 *
 * @param props - Mention fields.
 * @returns Linked badge chip.
 */
export function NexusMentionBadgeLink({
  mentionType,
  label,
  href,
  id,
}: {
  mentionType: "user" | "page";
  label: string;
  href: string;
  id: string;
}) {
  return (
    <Link
      href={href}
      className={cn("nexus-mention", `nexus-mention--${mentionType}`)}
      data-nexus-mention=""
      data-mention-type={mentionType}
      data-id={id}
      data-label={label}
      {...(mentionType === "page" ? { "data-page-path": href } : {})}
    >
      @{label}
    </Link>
  );
}
