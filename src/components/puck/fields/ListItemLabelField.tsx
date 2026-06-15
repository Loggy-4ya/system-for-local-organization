"use client";

/**
 * @fileoverview Editable list item label with auto-numbered placeholder (mirrors carousel slide label).
 *
 * @module src/components/puck/fields/ListItemLabelField
 */

import { FieldLabel } from "@puckeditor/core";
import { formatListItemLabel } from "../lib/listItemLabels";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import { parseArrayIndexFromFieldName } from "../lib/useStripArrayIndexSync";

/** Props passed by Puck to the list item label field. */
interface ListItemLabelFieldProps {
  field: { label?: string };
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Debounced list item label input — defaults to `Item N` but remains fully editable.
 *
 * @param props - Puck custom field props.
 * @returns Labeled text input matching carousel slide label chrome.
 */
export function ListItemLabelField({
  field,
  name,
  value,
  onChange,
}: ListItemLabelFieldProps) {
  const arrayIndex = parseArrayIndexFromFieldName(name);

  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 400,
  });

  const placeholder =
    arrayIndex === null ? "Item" : formatListItemLabel(arrayIndex);

  return (
    <FieldLabel label={field.label ?? "Item"}>
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

export default ListItemLabelField;
