/**
 * @fileoverview Shared static-page shell — gutter outside, content width inside.
 *
 * Matches global layout chrome (`GLOBAL_LAYOUT_HEADER_SLOT_CLASS` + `contentWidthContainerStyle`)
 * so `/pages`, `/admin`, `/profile`, and other non-Puck routes align with global chrome.
 *
 * @module src/components/ui/StaticPageShell
 */

import type { CSSProperties, ReactNode } from "react";
import {
  contentWidthContainerStyle,
  DEFAULT_CONTENT_WIDTH,
  GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS,
  type ContentWidthToken,
} from "@/components/puck/lib/contentWidthTokens";
import { cn } from "@/lib/utils";

/** Props for {@link StaticPageShell}. */
export interface StaticPageShellProps {
  /** Page body. */
  children: ReactNode;
  /** Max-width preset — must match `resolveStaticRouteContentWidth()` for this route. */
  contentWidth?: ContentWidthToken;
  /** Classes on the outer gutter slot. */
  className?: string;
  /** Classes on the inner width-constrained column. */
  innerClassName?: string;
  /** Optional inline styles on the inner column. */
  innerStyle?: CSSProperties;
}

/**
 * Static route page shell with the same width model as global header/footer chrome.
 *
 * @param props - See {@link StaticPageShellProps}.
 * @returns Width-aligned page shell JSX.
 */
export function StaticPageShell({
  children,
  contentWidth = DEFAULT_CONTENT_WIDTH,
  className,
  innerClassName,
  innerStyle,
}: StaticPageShellProps) {
  return (
    <div className={cn(`${GLOBAL_LAYOUT_PAGE_CONTENT_SLOT_CLASS} flex flex-1 flex-col`, className)}>
      <div
        className={cn("mx-auto flex w-full min-w-0 flex-col", innerClassName)}
        style={{ ...contentWidthContainerStyle(contentWidth), ...innerStyle }}
      >
        {children}
      </div>
    </div>
  );
}

export default StaticPageShell;
