"use client";

/**
 * @fileoverview Debounced array item label field that syncs strip editor active index.
 *
 * When a carousel slide or tab item is expanded or its label is focused, the canvas
 * strip navigates to that index via `editorActiveIndex` + module strip state.
 *
 * @module src/components/puck/fields/StripArrayLabelField
 */

import { FieldLabel, useGetPuck } from "@measured/puck";
import { useCallback, useEffect } from "react";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import { setStripActiveIndex } from "../lib/stripEditorState";

/** Props passed by Puck to custom array sub-field renderers. */
interface StripArrayLabelFieldProps {
  field: { label?: string };
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Parse the array item index from a Puck field path such as `slides[2].label`.
 *
 * @param name - Puck field name.
 * @returns Zero-based index or null when not an array sub-field.
 */
function parseArrayIndexFromFieldName(name?: string): number | null {
  if (!name) return null;
  const match = /\[(\d+)\]/.exec(name);
  if (!match) return null;
  return parseInt(match[1], 10);
}

/**
 * Debounced label input for carousel slides / tabs with canvas strip sync.
 *
 * @param props - Puck custom field props.
 * @returns Labeled debounced text input.
 */
export function StripArrayLabelField({ field, name, value, onChange }: StripArrayLabelFieldProps) {
  const getPuck = useGetPuck();
  const arrayIndex = parseArrayIndexFromFieldName(name);

  const syncStripIndex = useCallback(() => {
    if (arrayIndex === null) return;

    const { appState, dispatch, selectedItem } = getPuck();
    const componentId = selectedItem?.props?.id as string | undefined;
    const itemSelector = appState.ui.itemSelector;

    if (!componentId || !selectedItem || !itemSelector) return;

    setStripActiveIndex(componentId, arrayIndex);

    const currentIndex = (selectedItem.props as { editorActiveIndex?: number })
      .editorActiveIndex;
    if (currentIndex === arrayIndex) return;

    dispatch({
      type: "replace",
      destinationIndex: itemSelector.index,
      destinationZone: itemSelector.zone ?? "",
      data: {
        ...selectedItem,
        props: {
          ...selectedItem.props,
          editorActiveIndex: arrayIndex,
        },
      },
    });
  }, [arrayIndex, getPuck]);

  useEffect(() => {
    syncStripIndex();
  }, [syncStripIndex]);

  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 400,
  });

  const handleFocus = () => {
    syncStripIndex();
  };

  return (
    <FieldLabel label={field.label ?? "Label"}>
      <input
        type="text"
        className="nexus-puck-input"
        value={draft}
        onChange={(event) => onTextChange(event.target.value)}
        onFocus={handleFocus}
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
