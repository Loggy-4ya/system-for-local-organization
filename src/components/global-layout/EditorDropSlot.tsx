"use client";

/**
 * @fileoverview Animated insertion gap shown while dragging sortable editor rows.
 *
 * @module src/components/global-layout/EditorDropSlot
 */

import React from "react";
import { cn } from "@/lib/utils";

/** Props for {@link EditorDropSlot}. */
export interface EditorDropSlotProps {
  /** Whether the slot is expanded for an active drop target. */
  active: boolean;
}

/**
 * Animated spacer that opens before/after a row during drag reorder.
 *
 * @param props - Slot visibility.
 * @returns Drop slot markup.
 */
export function EditorDropSlot({ active }: EditorDropSlotProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "global-layout-editor__drop-slot",
        active && "global-layout-editor__drop-slot--active",
      )}
    />
  );
}

export default EditorDropSlot;
