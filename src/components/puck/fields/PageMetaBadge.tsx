"use client";

/**
 * @fileoverview Small square-rounded badge for read-only page metadata in Puck sidebar.
 *
 * @module src/components/puck/fields/PageMetaBadge
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Props for {@link PageMetaBadge}. */
export interface PageMetaBadgeProps {
  /** Badge content. */
  children: ReactNode;
  /** When set, renders as an internal profile link. */
  href?: string;
  /** Muted placeholder styling (e.g. “Not published yet”). */
  muted?: boolean;
  /** Optional extra class names. */
  className?: string;
}

/**
 * Compact metadata badge matching Puck category chip geometry (`radius-md`).
 *
 * @param props - Badge content and optional link target.
 * @returns Badge span or link.
 */
export function PageMetaBadge({ children, href, muted = false, className }: PageMetaBadgeProps) {
  const badgeClass = cn(
    "nexus-page-meta-badge",
    muted && "nexus-page-meta-badge--muted",
    href && "nexus-page-meta-badge--link",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={badgeClass}>
        {children}
      </Link>
    );
  }

  return <span className={badgeClass}>{children}</span>;
}

export default PageMetaBadge;
