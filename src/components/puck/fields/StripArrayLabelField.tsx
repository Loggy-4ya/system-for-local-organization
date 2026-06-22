"use client";

/**
 * @fileoverview Debounced array item label field that syncs strip editor active index.
 *
 * When a carousel slide or tab item is expanded or its label is focused, the canvas
 * strip navigates via {@link setStripActiveIndex} + {@link useStripActiveIndex} subscription.
 *
 * @module src/components/puck/fields/StripArrayLabelField
 */

import { FieldLabel } from "@puckeditor/core";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import { formatTabLabel } from "../lib/arrayItemLabels";
import {
  parseArrayIndexFromFieldName,
  useStripArrayIndexSync,
} from "../lib/useStripArrayIndexSync";

/** Props passed by Puck to custom array sub-field renderers. */
interface StripArrayLabelFieldProps {
  field: { label?: string };
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Debounced label input for carousel slides / tabs with canvas strip sync.
 *
 * @param props - Puck custom field props.
 * @returns Labeled debounced text input.
 */
export function StripArrayLabelField({ field, name, value, onChange }: StripArrayLabelFieldProps) {
  const arrayIndex = parseArrayIndexFromFieldName(name);
  const syncStripIndex = useStripArrayIndexSync(arrayIndex);

  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 400,
  });

  const placeholder =
    arrayIndex === null ? "Tab" : formatTabLabel(arrayIndex);

  return (
    <FieldLabel label={field.label ?? "Label"}>
      <input
        type="text"
        className="nexus-puck-input"
        value={draft}
        placeholder={placeholder}
        onChange={(event) => onTextChange(event.target.value)}
        onFocus={syncStripIndex}
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

export default StripArrayLabelField;
