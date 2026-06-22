"use client";

/**
 * @fileoverview Reusable form field wrapper that coordinates labels, inputs, and validation errors.
 *
 * Automatically injects ARIA validation attributes into child inputs.
 *
 * @module src/components/ui/form-field
 */

import * as React from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { NexusFieldHint } from "@/components/ui/NexusFieldHint";

/** Props for {@link FormField}. */
export interface FormFieldProps {
  /** Label text. If omitted, no label is rendered. */
  label?: string;
  /** HTML id of the input control. Used for label association and error ARIA IDs. */
  htmlFor?: string;
  /** Field-specific validation error message. */
  error?: string;
  /** Optional helper text surfaced via an info icon (tooltip / popover). */
  hint?: string;
  /** The input or control element. Must be a single valid React element. */
  children: React.ReactElement;
  /** Optional container class name. */
  className?: string;
}

/**
 * FormField wraps an input control with a label and error message.
 * It injects `aria-invalid` and `aria-describedby` props into the child element.
 *
 * @param props - See {@link FormFieldProps}.
 * @returns FormField JSX.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: FormFieldProps) {
  const hintId = useId();
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const describedBy = [error ? errorId : undefined, hint ? hintId : undefined]
    .filter(Boolean)
    .join(" ") || undefined;

  // Clone the child element to inject accessibility and ID properties
  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        id: htmlFor || (children.props as any)?.id,
        "aria-invalid": error ? "true" : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label ? (
        <div className="flex items-center gap-1.5">
          <Label htmlFor={htmlFor}>{label}</Label>
          {hint ? (
            <NexusFieldHint
              text={hint}
              label={`About ${label}`}
              hintId={hintId}
              size="md"
            />
          ) : null}
        </div>
      ) : null}
      {child}
      {error && (
        <p
          id={errorId}
          className="text-xs text-(--color-danger) mt-0.5"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default FormField;
