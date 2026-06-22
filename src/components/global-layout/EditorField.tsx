"use client";

/**
 * @fileoverview Aligned label + optional value badge + control slot for the Global Layout Editor.
 *
 * @module src/components/global-layout/EditorField
 */

import React, { type ReactNode, useId } from "react";
import { Label } from "@/components/ui/label";
import { NexusFieldHint } from "@/components/ui/NexusFieldHint";
import { cn } from "@/lib/utils";

/** Props for {@link EditorField}. */
export interface EditorFieldProps {
  /** Uppercase field label. */
  label: string;
  /** Optional helper copy surfaced via an info icon (tooltip / popover). */
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
  const hintId = useId();

  return (
    <div className={cn("global-layout-editor__field", className)}>
      <div className="global-layout-editor__field-head">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Label htmlFor={htmlFor} className="global-layout-editor__field-label">
            {label}
          </Label>
          {hint ? (
            <NexusFieldHint
              text={hint}
              label={`About ${label}`}
              hintId={hintId}
              size="md"
            />
          ) : null}
        </div>
        {valueBadge ? <div className="shrink-0">{valueBadge}</div> : null}
      </div>
      <div
        className="global-layout-editor__field-control"
        {...(hint && htmlFor ? { "data-hint-id": hintId } : {})}
      >
        {children}
      </div>
    </div>
  );
}

export default EditorField;
