"use client";

/**
 * @fileoverview Section toolbar row (label + action) for Global Layout Editor chapters.
 *
 * @module src/components/global-layout/EditorSectionHeader
 */

import React, { type ReactNode } from "react";

/** Props for {@link EditorSectionHeader}. */
export interface EditorSectionHeaderProps {
  /** Section title. */
  label: string;
  /** Trailing action (e.g. Add button). */
  action?: ReactNode;
}

/**
 * Aligned section header with optional trailing action button.
 *
 * @param props - See {@link EditorSectionHeaderProps}.
 * @returns Section header JSX.
 */
export function EditorSectionHeader({ label, action }: EditorSectionHeaderProps) {
  return (
    <div className="global-layout-editor__section-head">
      <span className="global-layout-editor__section-label">{label}</span>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export default EditorSectionHeader;
