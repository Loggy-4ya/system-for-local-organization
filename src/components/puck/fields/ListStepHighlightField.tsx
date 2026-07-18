"use client";

/**
 * @fileoverview Editor highlight toggle for a list step row (parent array field).
 *
 * @module src/components/puck/fields/ListStepHighlightField
 */

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("puck.fieldHints");
  const active = value === true;

  return (
    <div className="nexus-list-step-field nexus-sidebar-field">
      <FieldLabelRow
        label={t("listStepHighlightLabel")}
        hint={t("listStepHighlightHint")}
      />
      <EditorFlagBadge
        label={t("listStepHighlightLabel")}
        icon={<Sparkles size={12} aria-hidden />}
        active={active}
        activeVariant="default"
        tooltip={t("listStepHighlightTooltip")}
        onToggle={() => onChange(!active)}
      />
    </div>
  );
}

export default ListStepHighlightField;
