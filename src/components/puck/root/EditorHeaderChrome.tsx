"use client";

/**
 * @fileoverview Non-interactive header chrome preview rendered inside PageRoot.
 *
 * @module src/components/puck/root/EditorHeaderChrome
 */

import { SiteHeaderBar } from "@/components/ui/SiteHeaderBar";

/** Props for the editor header chrome preview. */
export interface EditorHeaderChromeProps {
  isEditor?: boolean;
}

const PREVIEW_LINKS = [
  { href: "#", label: "News" },
  { href: "#", label: "Council Apply" },
  { href: "#", label: "Propose Activity" },
  { href: "#", label: "Create Page" },
];

/**
 * Fixed header dummy rendered at the top of every Puck page root.
 *
 * @param props - See {@link EditorHeaderChromeProps}.
 * @returns Header chrome JSX subtree.
 */
export function EditorHeaderChrome({ isEditor = false }: EditorHeaderChromeProps) {
  return (
    <header className="site-header-slot" role="banner" aria-label="Site header preview">
      <SiteHeaderBar
        links={PREVIEW_LINKS}
        preview
        previewBadge={isEditor ? "Header preview" : undefined}
      />
    </header>
  );
}

export default EditorHeaderChrome;
