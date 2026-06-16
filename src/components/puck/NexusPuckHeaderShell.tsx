"use client";

/**
 * @fileoverview Site-header-style shell wrapping Puck's default header toolbar.
 *
 * Replaces the duplicate in-canvas `EditorHeaderChrome` preview with a single
 * glass-panel bar (Nexus wordmark home link + embedded Puck controls).
 *
 * @module src/components/puck/NexusPuckHeaderShell
 */

import Link from "next/link";
import { NexusHistoryHeaderToolbar } from "@/components/puck/NexusHistoryToolbar";
import { usePuckMobileEditorChrome } from "@/components/puck/usePuckMobileEditorChrome";

/** Props for the Puck `overrides.header` wrapper. */
export interface NexusPuckHeaderShellProps {
  /** Puck's default `<header class="PuckHeader">` subtree (title, tools, MenuBar). */
  children: React.ReactNode;
  /** Unused by Puck today — publish lives inside `children` via MenuBar. */
  actions?: React.ReactNode;
}

/**
 * Glass-panel editor header — Nexus wordmark home link plus embedded Puck toolbar.
 *
 * @param props - See {@link NexusPuckHeaderShellProps}.
 * @returns Header shell JSX.
 */
export function NexusPuckHeaderShell({ children }: NexusPuckHeaderShellProps) {
  const isCompactEditor = usePuckMobileEditorChrome();

  return (
    <div className="nexus-puck-header-shell">
      <div className="nexus-puck-header-shell__inner">
        <div className="site-header-bar glass-panel nexus-puck-header-bar rounded-[var(--radius-lg)]">
          <div className="nexus-puck-header-bar__row">
            <Link
              href="/"
              aria-label="Nexus home"
              className="site-header-bar__logo nexus-puck-header-bar__logo inline-flex shrink-0 items-center no-underline"
            >
              <span className="site-header-bar__wordmark">
                Nexus
              </span>
            </Link>

            {!isCompactEditor ? <NexusHistoryHeaderToolbar /> : null}

            <div className="nexus-puck-header-bar__puck min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NexusPuckHeaderShell;
