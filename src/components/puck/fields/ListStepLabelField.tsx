"use client";

/**
 * @fileoverview Debounced step label field that syncs the canvas stepper active dot.
 *
 * @module src/components/puck/fields/ListStepLabelField
 */

import { useGetPuck } from "@puckeditor/core";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { formatListStepLabel } from "../lib/arrayItemLabels";
import { FieldLabelRow } from "./FieldLabelRow";
import {
  parseListStepFieldPath,
  resolveFlatStepIndex,
  type ListStepItem,
} from "../lib/listStepTree";
import { setStripActiveIndex } from "../lib/stripEditorState";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import { useListStepStripSync } from "../lib/useListStepStripSync";
import { useNexusPuck } from "../lib/useNexusPuck";

/** Props passed by Puck to the step label field. */
interface ListStepLabelFieldProps {
  field: { label?: string };
  name?: string;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Debounced sidebar step label — defaults to `Step N` and syncs canvas highlight.
 *
 * @param props - Puck custom field props.
 * @returns Labeled text input matching strip editor label chrome.
 */
export function ListStepLabelField({
  field,
  name,
  value,
  onChange,
}: ListStepLabelFieldProps) {
  const t = useTranslations("puck.fieldHints");
  const getPuck = useGetPuck();
  const parsed = parseListStepFieldPath(name);
  const parentIndex = parsed?.parentIndex ?? null;

  const selectedItem = useNexusPuck((state) => state.selectedItem);
  const items = (selectedItem?.props?.items ?? []) as ListStepItem[];
  const syncStripIndex = useListStepStripSync(name, items);

  const syncParentFlatIndex = useCallback(() => {
    if (parentIndex === null) return;
    const { selectedItem } = getPuck();
    const componentId = selectedItem?.props?.id as string | undefined;
    if (!componentId) return;
    const flatIndex = resolveFlatStepIndex(items, parentIndex, null, "yes", {
      expandAll: true,
    });
    setStripActiveIndex(componentId, flatIndex);
  }, [getPuck, items, parentIndex]);

  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 400,
  });

  const placeholder =
    parentIndex === null
      ? t("listStepPlaceholder")
      : formatListStepLabel(parentIndex);

  return (
    <div className="nexus-list-step-field nexus-sidebar-field">
      <FieldLabelRow label={t("listStepSidebarLabel")} hint={t("listStepSidebarHint")} />
      <input
          type="text"
          className="nexus-puck-input"
          value={draft}
          placeholder={placeholder}
          onChange={(event) => onTextChange(event.target.value)}
          onFocus={() => {
            syncStripIndex();
            syncParentFlatIndex();
          }}
          onBlur={onTextBlur}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              (event.target as HTMLInputElement).blur();
            }
          }}
        />
    </div>
  );
}

export default ListStepLabelField;
