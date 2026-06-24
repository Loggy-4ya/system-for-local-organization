"use client";

/**
 * @fileoverview Choice options editor for Puck form fields with drag-reorder and inline correct toggles.
 *
 * @module src/components/puck/fields/FormFieldOptionsField
 */

import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  MAX_FORM_FIELD_OPTIONS,
  MIN_FORM_FIELD_OPTIONS,
  type FormFieldAnswerMode,
} from "@shared/constants/formField";
import {
  answerModeToGradingParts,
  coerceFormFieldOptionsForGrading,
  createFormFieldOptionId,
  getFormFieldOptionsEditorHint,
  isQuizGradingMode,
  resolveFormFieldAnswerMode,
  type FormFieldOptionProps,
} from "@shared/lib/formFieldLogic";
import { EditorDropSlot } from "@/components/global-layout/EditorDropSlot";
import { EditorDragHandle } from "@/components/global-layout/EditorDragHandle";
import { useEditorSortableList } from "@/components/global-layout/useEditorSortableList";
import { EditorFlagBadge } from "@/components/global-layout/EditorFlagBadge";
import { cn } from "@/lib/utils";
import { useNexusPuck } from "../lib/useNexusPuck";
import { useDeferredFieldCommit } from "../lib/useDeferredFieldCommit";
import { FieldLabelRow } from "./FieldLabelRow";

/** Props passed by Puck to the options custom field. */
interface FormFieldOptionsFieldProps {
  field: { label?: string };
  value: FormFieldOptionProps[] | undefined;
  onChange: (value: FormFieldOptionProps[]) => void;
}

/**
 * Read answer mode from nested chapter props without allocating a new object (safe for Puck selectors).
 *
 * @param props - Raw selected-item props from the Puck store.
 * @returns Resolved answer mode string.
 */
function selectNexusInputAnswerMode(
  props: Record<string, unknown> | undefined,
): FormFieldAnswerMode {
  const root = props ?? {};
  const quizChapter = root.inputQuizGrading as Record<string, unknown> | undefined;

  return resolveFormFieldAnswerMode({
    answerMode: (quizChapter?.answerMode ?? root.answerMode) as FormFieldAnswerMode | undefined,
    gradingMode: (quizChapter?.gradingMode ?? root.gradingMode) as
      | "none"
      | "single"
      | "multiple"
      | undefined,
    choiceSelection: (quizChapter?.choiceSelection ?? root.choiceSelection) as
      | "single"
      | "multiple"
      | undefined,
  });
}

/**
 * Debounced label input for one option row.
 *
 * @param props - Row label value and change handler.
 * @returns Text input.
 */
function OptionLabelInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  const { draft, onTextChange, onTextBlur } = useDeferredFieldCommit({
    value,
    onChange,
    textDebounceMs: 300,
  });

  return (
    <input
      type="text"
      className="nexus-puck-input nexus-form-field-options__label-input"
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
  );
}

/**
 * Answer options list with drag-reorder, add/remove rows, and quiz correct-answer badges.
 *
 * @param props - Puck custom field props.
 * @returns Options editor UI.
 */
export function FormFieldOptionsField({ field, value, onChange }: FormFieldOptionsFieldProps) {
  const answerMode = useNexusPuck((state) =>
    selectNexusInputAnswerMode(state.selectedItem?.props as Record<string, unknown> | undefined),
  );
  const { gradingMode } = answerModeToGradingParts(answerMode);

  const options = useMemo(
    () => coerceFormFieldOptionsForGrading(value, gradingMode),
    [gradingMode, value],
  );

  const showCorrectControls = isQuizGradingMode(gradingMode);
  const hint = getFormFieldOptionsEditorHint(answerMode, options);

  const commitOptions = useCallback(
    (next: FormFieldOptionProps[]) => {
      onChange(coerceFormFieldOptionsForGrading(next, gradingMode));
    },
    [gradingMode, onChange],
  );

  const sortable = useEditorSortableList({
    items: options,
    onReorder: commitOptions,
  });

  const patchOption = useCallback(
    (index: number, patch: Partial<FormFieldOptionProps>) => {
      commitOptions(options.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    },
    [commitOptions, options],
  );

  const toggleCorrect = useCallback(
    (index: number) => {
      if (!showCorrectControls) return;

      if (gradingMode === "single") {
        const target = options[index];
        const nextCorrect = target?.isCorrect === "yes" ? "no" : "yes";
        commitOptions(
          options.map((row, rowIndex) => ({
            ...row,
            isCorrect: rowIndex === index ? nextCorrect : "no",
          })),
        );
        return;
      }

      const target = options[index];
      patchOption(index, { isCorrect: target?.isCorrect === "yes" ? "no" : "yes" });
    },
    [commitOptions, gradingMode, options, patchOption, showCorrectControls],
  );

  const addOption = () => {
    if (options.length >= MAX_FORM_FIELD_OPTIONS) return;
    commitOptions([
      ...options,
      {
        id: createFormFieldOptionId(options.length),
        label: "",
        isCorrect: "no",
      },
    ]);
  };

  const removeOption = (index: number) => {
    if (options.length <= MIN_FORM_FIELD_OPTIONS) return;
    commitOptions(options.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="nexus-form-field-options nexus-sidebar-field">
      <FieldLabelRow
        label={field.label ?? "Answer Options"}
        hint="Drag rows to reorder. Quiz modes show a Correct badge on each option."
      />

      <p
        className={cn(
          "nexus-form-field-options__hint",
          hint.tone === "warning" && "nexus-form-field-options__hint--warning",
          hint.tone === "success" && "nexus-form-field-options__hint--success",
          hint.tone === "info" && "nexus-form-field-options__hint--info",
        )}
        role="status"
      >
        {hint.message}
      </p>

      <div className="nexus-form-field-options__list">
        {options.map((option, index) => {
          const placeholder = `Option ${index + 1}`;
          const label = option.label.trim() || placeholder;
          const isCorrect = option.isCorrect === "yes";

          return (
            <div key={option.id} className="nexus-form-field-options__item-wrap">
              <EditorDropSlot active={sortable.shouldShowDropSlotBefore(index)} />
              <div
                ref={(node) => sortable.registerRowRef(index, node)}
                className={sortable.getRowClassName(index, "nexus-form-field-options__row")}
              >
                <div className="nexus-form-field-options__row-head">
                  <EditorDragHandle {...sortable.getHandleProps(index)} label={`Reorder ${label}`} />
                  <OptionLabelInput
                    value={option.label}
                    placeholder={placeholder}
                    onChange={(nextLabel) => patchOption(index, { label: nextLabel })}
                  />
                  {showCorrectControls ? (
                    <EditorFlagBadge
                      label="Correct"
                      icon={<CheckCircle2 size={11} aria-hidden />}
                      active={isCorrect}
                      activeVariant="default"
                      ariaLabel={`${label} — ${isCorrect ? "marked correct" : "not correct"}`}
                      tooltip={
                        gradingMode === "single"
                          ? isCorrect
                            ? "Correct answer (click to clear)"
                            : "Mark as the only correct answer"
                          : isCorrect
                            ? "Correct answer (click to unmark)"
                            : "Mark as a correct answer"
                      }
                      onToggle={() => toggleCorrect(index)}
                    />
                  ) : null}
                  <button
                    type="button"
                    className="nexus-form-field-options__remove"
                    disabled={options.length <= MIN_FORM_FIELD_OPTIONS}
                    aria-label={`Remove ${label}`}
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 size={13} aria-hidden />
                  </button>
                </div>
              </div>
              <EditorDropSlot active={sortable.shouldShowDropSlotAfter(index)} />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="nexus-form-field-options__add"
        disabled={options.length >= MAX_FORM_FIELD_OPTIONS}
        onClick={addOption}
      >
        <Plus aria-hidden size={13} />
        Add option
      </button>
    </div>
  );
}

export default FormFieldOptionsField;
