"use client";

/**
 * @fileoverview Debounced text input for Puck array item labels.
 *
 * Reduces full canvas re-renders while typing tab/slide labels in the sidebar.
 *
 * @module src/components/puck/fields/DeferredTextInputField
 */

import { FieldLabel } from "@puckeditor/core";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";

/** Props passed by Puck to custom text field renderers. */
interface DeferredTextInputFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Text input that debounces Puck `onChange` to limit canvas thrash during typing.
 *
 * @param props - Puck custom field props.
 * @returns Labeled debounced text input.
 */
export function DeferredTextInputField({ field, value, onChange }: DeferredTextInputFieldProps) {
  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 400,
  });

  return (
    <FieldLabel label={field.label ?? "Text"}>
      <input
        type="text"
        className="nexus-puck-input"
        value={draft}
        onChange={(event) => onTextChange(event.target.value)}
        onBlur={onTextBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            (event.target as HTMLInputElement).blur();
          }
        }}
      />
    </FieldLabel>
  );
}
