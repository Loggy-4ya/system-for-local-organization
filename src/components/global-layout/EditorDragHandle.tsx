"use client";

/**
 * @fileoverview Drag grip handle for Global Layout Editor sortable rows.
 *
 * @module src/components/global-layout/EditorDragHandle
 */

import React from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Props for {@link EditorDragHandle}. */
export interface EditorDragHandleProps extends React.HTMLAttributes<HTMLButtonElement> {
  /** Accessible label for the drag control. */
  label?: string;
}

/**
 * Visible drag affordance — pointer events attach via parent `getHandleProps`.
 *
 * @param props - Handle props.
 * @returns Drag handle button JSX.
 */
export function EditorDragHandle({
  label = "Drag to reorder",
  className,
  ...props
}: EditorDragHandleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      data-tooltip={label}
      className={cn("global-layout-editor__drag-handle global-layout-editor__control-btn", className)}
      {...props}
    >
      <GripVertical size={14} aria-hidden="true" />
    </button>
  );
}

export default EditorDragHandle;
