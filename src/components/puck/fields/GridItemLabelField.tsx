"use client";

/**
 * @fileoverview Editable grid cell label with auto-numbered placeholder.
 *
 * @module src/components/puck/fields/GridItemLabelField
 */

import { FieldLabel } from "@puckeditor/core";
import { formatGridItemLabel } from "../lib/gridItemLabels";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import { parseArrayIndexFromFieldName } from "../lib/useStripArrayIndexSync";

/** Props passed by Puck to the grid cell label field. */
interface GridItemLabelFieldProps {
  field: { label?: string };
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Debounced cell label input — defaults to `Cell N` but remains fully editable.
 *
 * @param props - Puck custom field props.
 * @returns Labeled text input with auto-number placeholder.
 */
export function GridItemLabelField({
  field,
  name,
  value,
  onChange,
}: GridItemLabelFieldProps) {
  const arrayIndex = parseArrayIndexFromFieldName(name);

  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 400,
  });

  const placeholder =
    arrayIndex === null ? "Cell" : formatGridItemLabel(arrayIndex);

  return (
    <FieldLabel label={field.label ?? "Cell"}>
      <input
        type="text"
        className="nexus-puck-input"
        value={draft}
        placeholder={placeholder}
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

export default GridItemLabelField;
