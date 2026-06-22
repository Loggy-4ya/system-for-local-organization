"use client";

/**
 * @fileoverview Editor highlight toggle for a list step row (parent array field).
 *
 * @module src/components/puck/fields/ListStepHighlightField
 */

import { Sparkles } from "lucide-react";
import { EditorFlagBadge } from "@/components/global-layout/EditorFlagBadge";
import { FieldLabelRow } from "./FieldLabelRow";

/** Props passed by Puck to the list step highlight field. */
interface ListStepHighlightFieldProps {
  field: { label?: string };
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}

/**
 * Toggle editor-authored emphasis for a step label on the published page.
 *
 * @param props - Puck custom field props.
 * @returns Highlight flag badge row.
 */
export function ListStepHighlightField({
  field,
  value,
  onChange,
}: ListStepHighlightFieldProps) {
  const active = value === true;

  return (
    <div className="nexus-list-step-field nexus-sidebar-field">
      <FieldLabelRow
        label="Highlight"
        hint="Emphasize this step on the published page with accent styling."
      />
      <EditorFlagBadge
        label="Highlight"
        icon={<Sparkles size={12} aria-hidden />}
        active={active}
        activeVariant="default"
        tooltip="Emphasize this step on the published page"
        onToggle={() => onChange(!active)}
      />
    </div>
  );
}

export default ListStepHighlightField;
