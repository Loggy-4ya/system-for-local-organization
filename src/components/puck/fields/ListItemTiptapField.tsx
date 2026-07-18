"use client";

/**
 * @fileoverview Puck sidebar TipTap field for stepper list item labels (links + formatting).
 *
 * @module src/components/puck/fields/ListItemTiptapField
 */

import { FieldLabelRow } from "./FieldLabelRow";
import { useTranslations } from "next-intl";
import { NexusRichTextEditor } from "@/components/editor/NexusRichTextEditor";
import { useNexusPuck } from "../lib/useNexusPuck";
import { parseListStepFieldPath } from "../lib/listStepTree";
import { useListStepStripSync } from "../lib/useListStepStripSync";
import type { ListStepItem } from "../lib/listStepTree";

/** Props passed by Puck to the list step TipTap field renderer. */
interface ListItemTiptapFieldProps {
  field: { label?: string };
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Compact TipTap editor for a stepper row — syncs canvas active dot on focus.
 *
 * @param props - Puck custom field props.
 * @returns Rich text editor inside a {@link FieldLabel}.
 */
export function ListItemTiptapField({
  field,
  name,
  value,
  onChange,
}: ListItemTiptapFieldProps) {
  const t = useTranslations("puck.fieldHints");
  const selectedItem = useNexusPuck((state) => state.selectedItem);
  const items = (selectedItem?.props?.items ?? []) as ListStepItem[];
  const syncStripIndex = useListStepStripSync(name, items);
  const parsed = parseListStepFieldPath(name);
  const isChild = parsed?.childIndex !== null && parsed?.childIndex !== undefined;

  return (
    <div className="nexus-list-step-field nexus-sidebar-field">
      <FieldLabelRow
        label={isChild ? t("listItemSubStepLabel") : t("listItemCanvasLabel")}
        hint={t("listItemTiptapHint")}
      />
      <div
        className="nexus-rich-text-editor--puck-host nexus-list-step-field__editor-host"
        onFocusCapture={syncStripIndex}
      >
        <NexusRichTextEditor
          value={value || ""}
          onChange={onChange}
          variant="default"
          className="nexus-rich-text-editor--puck nexus-rich-text-editor--puck-list-step"
          placeholder={t("listItemTiptapPlaceholder")}
          minHeight={isChild ? 72 : 88}
        />
      </div>
    </div>
  );
}

export default ListItemTiptapField;
