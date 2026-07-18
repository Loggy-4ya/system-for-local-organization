"use client";

/**
 * @fileoverview Nested sub-steps editor for a stepper list parent row.
 *
 * @module src/components/puck/fields/ListStepChildrenField
 */

import { ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { NexusRichTextEditor } from "@/components/editor/NexusRichTextEditor";
import { EditorFlagBadge } from "@/components/global-layout/EditorFlagBadge";
import { FieldLabelRow } from "./FieldLabelRow";
import { useNexusPuck } from "../lib/useNexusPuck";
import {
  ensureListStepChildLabels,
  formatListStepChildLabel,
  parseListStepFieldPath,
  resolveFlatStepIndex,
  type ListStepChild,
  type ListStepItem,
} from "../lib/listStepTree";
import { setStripActiveIndex } from "../lib/stripEditorState";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";

/** Props passed by Puck to the nested sub-steps field. */
interface ListStepChildrenFieldProps {
  field: { label?: string };
  name?: string;
  value: ListStepChild[] | undefined;
  onChange: (value: ListStepChild[]) => void;
}

/**
 * Collapsible nested sub-step rows with compact TipTap labels and highlight toggles.
 *
 * @param props - Puck custom field props.
 * @returns Nested sub-step editor UI.
 */
export function ListStepChildrenField({
  field,
  name,
  value,
  onChange,
}: ListStepChildrenFieldProps) {
  const t = useTranslations("puck.fieldHints");
  const selectedItem = useNexusPuck((state) => state.selectedItem);
  const componentId = selectedItem?.props?.id as string | undefined;
  const items = (selectedItem?.props?.items ?? []) as ListStepItem[];
  const parentIndex = parseListStepFieldPath(name)?.parentIndex ?? 0;

  const children = useMemo(
    () => ensureListStepChildLabels(value, parentIndex),
    [parentIndex, value],
  );

  const [openIndices, setOpenIndices] = useState<Set<number>>(() => new Set([0]));

  const syncChildIndex = useCallback(
    (childIndex: number) => {
      if (!componentId) return;
      const flatIndex = resolveFlatStepIndex(items, parentIndex, childIndex, "yes", {
        expandAll: true,
      });
      setStripActiveIndex(componentId, flatIndex);
    },
    [componentId, items, parentIndex],
  );

  const patchChild = useCallback(
    (childIndex: number, patch: Partial<ListStepChild>) => {
      const next = children.map((child, index) =>
        index === childIndex ? { ...child, ...patch } : child,
      );
      onChange(next);
    },
    [children, onChange],
  );

  const addChild = () => {
    const nextIndex = children.length;
    onChange([
      ...children,
      {
        label: formatListStepChildLabel(parentIndex, nextIndex),
        text: "",
        highlighted: false,
      },
    ]);
    setOpenIndices((previous) => new Set([...previous, nextIndex]));
  };

  const removeChild = (childIndex: number) => {
    onChange(children.filter((_, index) => index !== childIndex));
    setOpenIndices((previous) => {
      const next = new Set<number>();
      previous.forEach((index) => {
        if (index === childIndex) return;
        next.add(index > childIndex ? index - 1 : index);
      });
      return next;
    });
  };

  const toggleOpen = (childIndex: number) => {
    setOpenIndices((previous) => {
      const next = new Set(previous);
      if (next.has(childIndex)) {
        next.delete(childIndex);
      } else {
        next.add(childIndex);
      }
      return next;
    });
  };

  return (
    <div className="nexus-list-step-field nexus-sidebar-field">
      <FieldLabelRow
        label={field.label ?? "Sub-steps"}
        hint={t("listStepChildrenHint")}
      />
      <div className="nexus-list-step-children">
        {children.length === 0 ? (
          <p className="nexus-list-step-children__empty">
            {t("listStepChildrenEmpty")}
          </p>
        ) : null}

        {children.map((child, childIndex) => (
          <ListStepChildRow
            key={childIndex}
            child={child}
            childIndex={childIndex}
            parentIndex={parentIndex}
            isOpen={openIndices.has(childIndex)}
            onToggleOpen={() => toggleOpen(childIndex)}
            onRemove={() => removeChild(childIndex)}
            onPatch={(patch) => patchChild(childIndex, patch)}
            onFocus={() => syncChildIndex(childIndex)}
          />
        ))}

        <button
          type="button"
          className="nexus-list-step-children__add"
          onClick={addChild}
        >
          <Plus aria-hidden size={14} />
          {t("listStepChildrenAdd")}
        </button>
      </div>
    </div>
  );
}

/** Props for a single nested sub-step row. */
interface ListStepChildRowProps {
  child: ListStepChild;
  childIndex: number;
  parentIndex: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onRemove: () => void;
  onPatch: (patch: Partial<ListStepChild>) => void;
  onFocus: () => void;
}

/**
 * One nested sub-step row — accordion head + full-width TipTap body.
 *
 * @param props - Row state and handlers.
 * @returns Animated collapsible sub-step editor row.
 */
function ListStepChildRow({
  child,
  childIndex,
  parentIndex,
  isOpen,
  onToggleOpen,
  onRemove,
  onPatch,
  onFocus,
}: ListStepChildRowProps) {
  const t = useTranslations("puck.fieldHints");
  const panelId = useId();
  const [hydrated, setHydrated] = useState(false);
  const labelPlaceholder = formatListStepChildLabel(parentIndex, childIndex);
  const highlighted = child.highlighted === true;

  useEffect(() => {
    setHydrated(true);
  }, []);

  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value: child.label ?? "",
    onChange: (next) => onPatch({ label: next }),
    textDebounceMs: 400,
  });

  return (
    <div
      className="nexus-field-chapter nexus-list-step-children__chapter"
      data-open={isOpen ? "true" : "false"}
      {...(hydrated ? { "data-nexus-chapter-hydrated": true } : {})}
    >
      <div className="nexus-list-step-children__row-head">
        <button
          type="button"
          className="nexus-list-step-children__toggle"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggleOpen}
        >
          <ChevronDown
            size={12}
            className={isOpen ? "nexus-field-chapter__chevron--expanded" : undefined}
            aria-hidden
          />
        </button>
        <input
          type="text"
          className="nexus-puck-input nexus-list-step-children__label-input"
          value={draft}
          placeholder={labelPlaceholder}
          onChange={(event) => onTextChange(event.target.value)}
          onBlur={onTextBlur}
          onFocus={onFocus}
        />
        <button
          type="button"
          className="nexus-list-step-children__remove"
          aria-label={`Remove ${labelPlaceholder}`}
          onClick={onRemove}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="nexus-list-step-children__row-meta">
        <EditorFlagBadge
          label={t("listStepHighlightLabel")}
          icon={<Sparkles size={12} aria-hidden />}
          active={highlighted}
          activeVariant="default"
          tooltip={t("listStepChildHighlightTooltip")}
          onToggle={() => onPatch({ highlighted: !highlighted })}
        />
      </div>

      <div
        id={panelId}
        className="nexus-field-chapter__collapse nexus-list-step-children__collapse"
        aria-hidden={!isOpen}
      >
        <div
          className="nexus-field-chapter__body nexus-list-step-children__editor-wrap"
          onFocusCapture={onFocus}
        >
          <div className="nexus-list-step-field__editor-host nexus-rich-text-editor--puck-host">
            <NexusRichTextEditor
              value={child.text ?? ""}
              onChange={(html) => onPatch({ text: html })}
              variant="default"
              className="nexus-rich-text-editor--puck nexus-rich-text-editor--puck-list-step"
              placeholder={t("listStepChildTiptapPlaceholder")}
              minHeight={88}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListStepChildrenField;
