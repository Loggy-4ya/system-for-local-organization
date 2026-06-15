"use client";

/**
 * @fileoverview Aligned label + optional value badge + control slot for the Global Layout Editor.
 *
 * @module src/components/global-layout/EditorField
 */

import React, { type ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Props for {@link EditorField}. */
export interface EditorFieldProps {
  /** Uppercase field label. */
  label: string;
  /** Optional helper copy below the label row. */
  hint?: string;
  /** Associated control id for accessibility. */
  htmlFor?: string;
  /** Short status tag (e.g. current spacing value). */
  valueBadge?: ReactNode;
  /** Field control(s). */
  children: ReactNode;
  /** Extra wrapper classes. */
  className?: string;
}

/**
 * Consistent editor field shell — label row, optional hint, control area.
 *
 * @param props - See {@link EditorFieldProps}.
 * @returns Field layout JSX.
 */
export function EditorField({
  label,
  hint,
  htmlFor,
  valueBadge,
  children,
  className,
}: EditorFieldProps) {
  return (
    <div className={cn("global-layout-editor__field", className)}>
      <div className="global-layout-editor__field-head">
        <Label htmlFor={htmlFor} className="global-layout-editor__field-label">
          {label}
        </Label>
        {valueBadge ? <div className="shrink-0">{valueBadge}</div> : null}
      </div>
      {hint ? <p className="global-layout-editor__field-hint">{hint}</p> : null}
      <div className="global-layout-editor__field-control">{children}</div>
    </div>
  );
}

export default EditorField;
