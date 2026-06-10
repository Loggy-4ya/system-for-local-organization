"use client";

/**
 * @fileoverview Minimal collapsible chapter shell for Puck sidebar field groups.
 *
 * @module src/components/puck/fields/FieldChapter
 */

import { useState, type ReactNode } from "react";

/** Props for a sidebar field chapter. */
export interface FieldChapterProps {
  /** Chapter title shown in the header row. */
  title: string;
  /** Optional inline icon (14px SVG recommended). */
  icon?: ReactNode;
  /** Chapter body — categorized controls. */
  children: ReactNode;
  /** Whether the chapter starts expanded. */
  defaultOpen?: boolean;
}

/**
 * Compact collapsible chapter — closed by default, no borders or tree lines.
 *
 * @param props - See {@link FieldChapterProps}.
 * @returns Collapsible `<details>` section.
 */
export function FieldChapter({ title, icon, children, defaultOpen = false }: FieldChapterProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="nexus-field-chapter"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary className="nexus-field-chapter__head">
        {icon ? <span className="nexus-field-chapter__icon">{icon}</span> : null}
        <span className="nexus-field-chapter__title">{title}</span>
      </summary>
      <div className="nexus-field-chapter__body">{children}</div>
    </details>
  );
}

/** Spacing chapter icon. */
export function SpacingIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 5h12M2 11h12M5 2v12M11 2v12"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Island layout chapter icon. */
export function IslandIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="4" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M5 7h6M5 9.5h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

/** Page background chapter icon. */
export function BackgroundIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.25" />
      <path d="M8 2.5v11" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </svg>
  );
}

export default FieldChapter;
