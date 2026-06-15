"use client";

/**
 * @fileoverview Site-header-style shell wrapping Puck's default header toolbar.
 *
 * Replaces the duplicate in-canvas `EditorHeaderChrome` preview with a single
 * glass-panel bar (logo + embedded Puck controls) matching `SiteHeaderBar`.
 *
 * @module src/components/puck/NexusPuckHeaderShell
 */

import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/lib/assets";

/** Props for the Puck `overrides.header` wrapper. */
export interface NexusPuckHeaderShellProps {
  /** Puck's default `<header class="PuckHeader">` subtree (title, tools, MenuBar). */
  children: React.ReactNode;
  /** Unused by Puck today — publish lives inside `children` via MenuBar. */
  actions?: React.ReactNode;
}

/**
 * Glass-panel editor header — Nexus branding plus embedded Puck toolbar.
 *
 * @param props - See {@link NexusPuckHeaderShellProps}.
 * @returns Header shell JSX.
 */
export function NexusPuckHeaderShell({ children }: NexusPuckHeaderShellProps) {
  return (
    <div className="nexus-puck-header-shell">
      <div className="nexus-puck-header-shell__inner">
        <div className="site-header-bar glass-panel nexus-puck-header-bar rounded-[var(--radius-lg)]">
          <div className="nexus-puck-header-bar__row">
            <Link
              href="/"
              aria-label="Nexus home"
              className="site-header-bar__logo nexus-puck-header-bar__logo inline-flex shrink-0 items-center gap-2 no-underline"
            >
              <span
                aria-hidden="true"
                className="site-header-bar__logo-mark inline-flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent-user)]"
              >
                <Image
                  src={BRAND.logo}
                  alt=""
                  width={16}
                  height={16}
                  className="site-header-bar__logo-mark-image"
                  priority
                  suppressHydrationWarning
                />
              </span>
              <span className="site-header-bar__wordmark text-[13px] font-semibold text-[var(--color-text-primary)]">
                Nexus
              </span>
            </Link>

            <div className="nexus-puck-header-bar__puck min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NexusPuckHeaderShell;
