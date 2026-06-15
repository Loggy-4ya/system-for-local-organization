"use client";

/**
 * @fileoverview Tap/click collapsible shell for Global Layout Editor cards (categories, columns).
 *
 * @module src/components/global-layout/EditorCollapsibleIsland
 */

import React, { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Props for {@link EditorCollapsibleIsland}. */
export interface EditorCollapsibleIslandProps {
  /** Card body — hidden when collapsed. */
  children: ReactNode;
  /** Header row content (drag handle, fields, actions). */
  header: ReactNode;
  /** Optional summary shown beside the toggle when collapsed. */
  summary?: ReactNode;
  /** Whether the body starts expanded. */
  defaultOpen?: boolean;
  /** Extra classes on the outer card shell. */
  className?: string;
  /** Ref for the outer card (sortable lists, drag targets). */
  outerRef?: React.Ref<HTMLDivElement>;
}

/**
 * Collapsible editor card — closed by default to fit more settings on screen.
 *
 * @param props - See {@link EditorCollapsibleIslandProps}.
 * @returns Collapsible card JSX.
 */
export function EditorCollapsibleIsland({
  children,
  header,
  summary,
  defaultOpen = false,
  className,
  outerRef,
}: EditorCollapsibleIslandProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div
      ref={outerRef}
      className={cn("global-layout-editor__collapsible global-layout-editor__card", className)}
      data-open={open ? "true" : "false"}
      {...(hydrated ? { "data-editor-collapsible-hydrated": true } : {})}
    >
      <div className="global-layout-editor__collapsible-head">
        <div className="global-layout-editor__collapsible-head-top">
          <button
            type="button"
            className="global-layout-editor__collapsible-toggle global-layout-editor__control-btn"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Collapse section" : "Expand section"}
            data-tooltip={open ? "Collapse section" : "Expand section"}
            onClick={() => setOpen((prev) => !prev)}
          >
            <ChevronDown className="global-layout-editor__collapsible-chevron" aria-hidden />
          </button>
          {!open && summary ? (
            <span className="global-layout-editor__collapsible-summary">{summary}</span>
          ) : null}
        </div>
        <div className="global-layout-editor__collapsible-head-main">{header}</div>
      </div>
      <div
        id={panelId}
        className="global-layout-editor__collapsible-collapse"
        aria-hidden={!open}
      >
        <div className="global-layout-editor__collapsible-body">{children}</div>
      </div>
    </div>
  );
}

export default EditorCollapsibleIsland;
