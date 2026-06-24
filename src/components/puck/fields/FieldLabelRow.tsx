"use client";

/**
 * @fileoverview Uppercase Puck sidebar category label with optional field hint icon.
 *
 * @module src/components/puck/fields/FieldLabelRow
 */

import { NexusFieldHint } from "@/components/ui/NexusFieldHint";
import type { ReactNode } from "react";

/** Props for {@link FieldLabelRow}. */
export interface FieldLabelRowProps {
  /** Uppercase category label text. */
  label: string;
  /** Screen-reader + plain tooltip fallback when `hintContent` is set. */
  hint?: string;
  /** Optional rich tooltip body (question-mark hover). */
  hintContent?: ReactNode;
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
export function FieldLabelRow({
  label,
  hint,
  hintContent,
  hintLabel,
  hintId,
}: FieldLabelRowProps) {
  const showHint = Boolean(hint ?? hintContent);

  return (
    <span className="nexus-field-category__label-row">
      <span className="nexus-field-category__label">{label}</span>
      {showHint ? (
        <NexusFieldHint
          text={hint ?? String(label)}
          content={hintContent}
          label={hintLabel ?? `About ${label}`}
          hintId={hintId}
          size="sm"
        />
      ) : null}
    </span>
  );
}

export default FieldLabelRow;
