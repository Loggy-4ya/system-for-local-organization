"use client";

/**
 * @fileoverview Minimal collapsible chapter shell for Puck sidebar field groups.
 *
 * @module src/components/puck/fields/FieldChapter
 */

import { Box, Grid3x3, Palette, Settings2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { puckIcon } from "../lib/puckIcons";

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
  return puckIcon(Grid3x3);
}

/** Island layout chapter icon. */
export function IslandIcon() {
  return puckIcon(Box);
}

/** Page background chapter icon. */
export function BackgroundIcon() {
  return puckIcon(Palette);
}

/** Generic settings chapter icon. */
export function SettingsIcon() {
  return puckIcon(Settings2);
}

export default FieldChapter;
