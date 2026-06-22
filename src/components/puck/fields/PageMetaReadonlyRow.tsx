"use client";

/**
 * @fileoverview Label + badge row for read-only page metadata in Puck sidebar.
 *
 * @module src/components/puck/fields/PageMetaReadonlyRow
 */

import type { ReactNode } from "react";

/** Props for {@link PageMetaReadonlyRow}. */
export interface PageMetaReadonlyRowProps {
  /** Uppercase-style row label. */
  label: string;
  /** Badge or linked value. */
  children: ReactNode;
}

/**
 * Single read-only metadata row — label left, badge value right.
 *
 * @param props - Row label and value slot.
 * @returns Read-only row JSX.
 */
export function PageMetaReadonlyRow({ label, children }: PageMetaReadonlyRowProps) {
  return (
    <div className="nexus-page-meta-readonly__row">
      <span className="nexus-page-meta-readonly__label">{label}</span>
      <div className="nexus-page-meta-readonly__value">{children}</div>
    </div>
  );
}

export default PageMetaReadonlyRow;
