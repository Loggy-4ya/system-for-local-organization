"use client";

/**
 * @fileoverview Default chapter-open toggle for new list parent rows (Behavior chapter).
 *
 * @module src/components/puck/fields/ListDefaultExpandNestedField
 */

import { FieldLabel } from "@puckeditor/core";
import { PuckSwitchField } from "./PuckSwitchField";

/** Props passed by Puck to the default expand field. */
interface ListDefaultExpandNestedFieldProps {
  field: { label?: string };
  value: "yes" | "no" | undefined;
  onChange: (value: "yes" | "no") => void;
}

/**
 * Switch for the default `chapterOpen` value applied to newly inserted parent steps.
 *
 * @param props - Puck custom field props.
 * @returns Behavior chapter switch row.
 */
export function ListDefaultExpandNestedField({
  field,
  value,
  onChange,
}: ListDefaultExpandNestedFieldProps) {
  return (
    <FieldLabel label={field.label ?? "Default chapter open"}>
      <div className="nexus-list-step-field nexus-sidebar-field">
        <PuckSwitchField
          label="Open nested sub-steps by default"
          showLabel={false}
          value={value === "no" ? "no" : "yes"}
          trueValue="yes"
          falseValue="no"
          description="Applies to new parent steps only. Each step can override in the Steps array."
          onChange={onChange}
        />
      </div>
    </FieldLabel>
  );
}

export default ListDefaultExpandNestedField;
