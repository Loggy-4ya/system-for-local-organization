"use client";

/**
 * @fileoverview Fixed publish-time chapter open toggle for parent steps with sub-steps.
 *
 * @module src/components/puck/fields/ListStepChapterOpenField
 */

import { FieldLabel } from "@puckeditor/core";
import { PuckSwitchField } from "./PuckSwitchField";
import { parseListStepFieldPath } from "../lib/listStepTree";
import { useNexusPuck } from "../lib/useNexusPuck";
import type { ListStepItem } from "../lib/listStepTree";

/** Props passed by Puck to the chapter open field. */
interface ListStepChapterOpenFieldProps {
  field: { label?: string };
  name?: string;
  value: "yes" | "no" | undefined;
  onChange: (value: "yes" | "no") => void;
}

/**
 * Show nested sub-steps on the published page (fixed — visitors cannot toggle).
 *
 * Hidden when the parent row has no sub-steps yet.
 *
 * @param props - Puck custom field props.
 * @returns Switch row or null when inapplicable.
 */
export function ListStepChapterOpenField({
  field,
  name,
  value,
  onChange,
}: ListStepChapterOpenFieldProps) {
  const selectedItem = useNexusPuck((state) => state.selectedItem);
  const parentIndex = parseListStepFieldPath(name)?.parentIndex ?? null;
  const items = (selectedItem?.props?.items ?? []) as ListStepItem[];
  const parent =
    parentIndex === null ? undefined : items[parentIndex];
  const childCount = Array.isArray(parent?.children) ? parent.children.length : 0;

  if (childCount === 0) {
    return null;
  }

  return (
    <FieldLabel label={field.label ?? "Chapter open on publish"}>
      <div className="nexus-list-step-field nexus-sidebar-field">
        <PuckSwitchField
          label="Chapter open on publish"
          showLabel={false}
          value={value === "no" ? "no" : "yes"}
          trueValue="yes"
          falseValue="no"
          description="When off, sub-steps are hidden on the published page."
          onChange={onChange}
        />
      </div>
    </FieldLabel>
  );
}

export default ListStepChapterOpenField;
