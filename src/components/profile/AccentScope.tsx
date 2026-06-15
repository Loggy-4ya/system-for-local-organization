/**
 * @fileoverview Applies user accent CSS variable from session preferences.
 *
 * @module src/components/profile/AccentScope
 */

"use client";

import type { ReactNode } from "react";
import type { AccentFamily, AccentShade } from "@shared/models/User";
import { accentStyle } from "@/lib/accentTokens";

/** Props for {@link AccentScope}. */
export interface AccentScopeProps {
  family: AccentFamily;
  shade: AccentShade;
  children: ReactNode;
}

/**
 * Wrapper that overrides `--color-accent-user` for profile subtree.
 *
 * @param props - Accent family, shade, and children.
 * @returns Scoped div with accent CSS variable.
 */
export function AccentScope({ family, shade, children }: AccentScopeProps) {
  return (
    <div
      style={accentStyle(family, shade)}
      className="flex flex-1 flex-col"
      suppressHydrationWarning
    >
      {children}
    </div>
  );
}

export default AccentScope;
