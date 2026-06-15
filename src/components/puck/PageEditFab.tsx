"use client";

/**
 * @fileoverview Floating action button that opens Puck edit mode for a CMS page.
 *
 * Shown on published Puck CMS routes for Admin and Student Council editors.
 *
 * @module src/components/puck/PageEditFab
 */

import Link from "next/link";
import { Pencil } from "lucide-react";

/** Props for {@link PageEditFab}. */
export interface PageEditFabProps {
  /** Absolute page path (e.g. `/news`). */
  pagePath: string;
}

/**
 * Fixed bottom-right control that navigates to `/<slug>/edit`.
 *
 * @param props - See {@link PageEditFabProps}.
 * @returns Floating edit link or null when `pagePath` is empty.
 */
export function PageEditFab({ pagePath }: PageEditFabProps) {
  if (!pagePath || pagePath === "/") {
    return null;
  }

  const editHref = `${pagePath}/edit`;

  return (
    <Link
      href={editHref}
      className="nexus-page-edit-fab"
      aria-label="Edit this page"
      title="Edit this page"
    >
      <span className="nexus-page-edit-fab__icon" aria-hidden="true">
        <Pencil size={18} strokeWidth={2.25} />
      </span>
      <span className="nexus-page-edit-fab__label">Edit</span>
    </Link>
  );
}

export default PageEditFab;
