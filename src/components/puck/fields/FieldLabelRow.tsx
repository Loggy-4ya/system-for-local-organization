"use client";

/**
 * @fileoverview Uppercase Puck sidebar category label with optional field hint icon.
 *
 * @module src/components/puck/fields/FieldLabelRow
 */

import { NexusFieldHint } from "@/components/ui/NexusFieldHint";

/** Props for {@link FieldLabelRow}. */
export interface FieldLabelRowProps {
  /** Uppercase category label text. */
  label: string;
  /** Optional helper copy surfaced via {@link NexusFieldHint}. */
  hint?: string;
  /** Accessible name for the hint trigger. */
  hintLabel?: string;
  /** Stable id for sr-only hint text (`aria-describedby` on sibling controls). */
  hintId?: string;
}

/**
 * Category label row for Puck plugin field surfaces.
 *
 * @param props - See {@link FieldLabelRowProps}.
 * @returns Label row JSX.
 */
export function FieldLabelRow({ label, hint, hintLabel, hintId }: FieldLabelRowProps) {
  return (
    <span className="nexus-field-category__label-row">
      <span className="nexus-field-category__label">{label}</span>
      {hint ? (
        <NexusFieldHint text={hint} label={hintLabel ?? `About ${label}`} hintId={hintId} size="sm" />
      ) : null}
    </span>
  );
}

export default FieldLabelRow;
