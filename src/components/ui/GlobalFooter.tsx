"use client";

/**
 * @fileoverview Contained GlobalFooter component for Project Nexus.
 *
 * @module src/components/ui/GlobalFooter
 */

import { usePathname } from "next/navigation";
import { SiteFooterBar } from "@/components/ui/SiteFooterBar";
import { GLOBAL_LAYOUT_FOOTER_SLOT_CLASS } from "@/components/puck/lib/contentWidthTokens";
import { type FooterConfig } from "@shared/constants/globalLayout";

/** Props accepted by `GlobalFooter`. */
export interface GlobalFooterProps {
  /** Configurable footer settings. */
  footer: FooterConfig;
  /** Content width preset. */
  contentWidth?: string;
}

/**
 * Global site footer — rendered inside the root layout below all page content.
 *
 * @param props - See `GlobalFooterProps`.
 * @returns The full footer JSX subtree.
 */
export function GlobalFooter({ footer, contentWidth = "lg" }: GlobalFooterProps) {
  const pathname = usePathname();
  const isEditing = pathname === "/edit" || pathname.endsWith("/edit");
  if (isEditing) return null;

  return (
    <footer className={`${GLOBAL_LAYOUT_FOOTER_SLOT_CLASS} w-full`} role="contentinfo">
      <SiteFooterBar footer={footer} contentWidth={contentWidth} />
    </footer>
  );
}

export default GlobalFooter;
