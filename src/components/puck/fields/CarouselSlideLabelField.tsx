"use client";

/**
 * @fileoverview Editable carousel slide label with auto-numbered placeholder and canvas sync.
 *
 * @module src/components/puck/fields/CarouselSlideLabelField
 */

import { FieldLabel } from "@puckeditor/core";
import { formatCarouselSlideLabel } from "../lib/carouselSlideLabels";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import {
  parseArrayIndexFromFieldName,
  useStripArrayIndexSync,
} from "../lib/useStripArrayIndexSync";

/** Props passed by Puck to the carousel slide label field. */
interface CarouselSlideLabelFieldProps {
  field: { label?: string };
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Debounced slide label input — defaults to `Slide N` but remains fully editable.
 *
 * @param props - Puck custom field props.
 * @returns Labeled text input with auto-number placeholder.
 */
export function CarouselSlideLabelField({
  field,
  name,
  value,
  onChange,
}: CarouselSlideLabelFieldProps) {
  const arrayIndex = parseArrayIndexFromFieldName(name);
  const syncStripIndex = useStripArrayIndexSync(arrayIndex);

  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 400,
  });

  const placeholder =
    arrayIndex === null ? "Slide" : formatCarouselSlideLabel(arrayIndex);

  return (
    <FieldLabel label={field.label ?? "Slide"}>
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

export default CarouselSlideLabelField;
