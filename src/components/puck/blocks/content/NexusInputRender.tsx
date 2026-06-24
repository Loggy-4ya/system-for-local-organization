"use client";

/**
 * @fileoverview Interactive runtime for Puck form / survey / quiz fields.
 *
 * @module src/components/puck/blocks/content/NexusInputRender
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  isFormFieldSingleChoiceSelection,
  isQuizGradingMode,
  normalizeNexusInputProps,
  type FormFieldOptionProps,
  type NexusInputFieldProps,
} from "@shared/lib/formFieldLogic";
import {
  fetchMyFormFieldResponse,
  submitFormFieldAnswer,
} from "@/lib/formFieldClient";
import { usePageEditorMeta } from "../../lib/pageEditorMetaContext";
import { useInsidePuckEditorShell } from "../../lib/useInsidePuckEditorShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link NexusInputRender}. */
export interface NexusInputRenderProps extends NexusInputFieldProps {
  /** Puck block id. */
  id: string;
  /** True inside the Puck editor canvas. */
  isEditing?: boolean;
}

/**
 * Published-page form field with optional quiz grading feedback.
 *
 * @param props - Normalised field configuration and editor flags.
 * @returns Question + answer UI.
 */
export function NexusInputRender(props: NexusInputRenderProps) {
  const { id, isEditing = false, ...rawProps } = props;
  const config = useMemo(() => normalizeNexusInputProps(rawProps), [rawProps]);
  const meta = usePageEditorMeta();
  const insideEditorShell = useInsidePuckEditorShell();
  const preview = isEditing || insideEditorShell;
  const { data: session } = useSession();

  const [textDraft, setTextDraft] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quizCorrect, setQuizCorrect] = useState<boolean | null>(null);

  const pagePath = meta.path;
  const canSubmit = Boolean(pagePath && meta.isPersisted && !preview && session?.user?.id);

  useEffect(() => {
    if (preview || !pagePath || !id || !meta.isPersisted) return;

    let cancelled = false;
    void fetchMyFormFieldResponse(pagePath, id).then((existing) => {
      if (cancelled || !existing) return;
      setSubmitted(true);
      setQuizCorrect(existing.isCorrect);
      if (existing.textAnswer) setTextDraft(existing.textAnswer);
      if (existing.selectedOptionIds.length > 0) setSelectedIds(existing.selectedOptionIds);
    });

    return () => {
      cancelled = true;
    };
  }, [preview, pagePath, id, meta.isPersisted]);

  const toggleOption = useCallback(
    (optionId: string) => {
      if (submitted || preview) return;

      if (isFormFieldSingleChoiceSelection(config.gradingMode, config.choiceSelection)) {
        setSelectedIds([optionId]);
        return;
      }

      setSelectedIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    },
    [config.choiceSelection, config.gradingMode, preview, submitted],
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || submitting || submitted) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await submitFormFieldAnswer(pagePath, id, {
        textAnswer: config.mode === "text" ? textDraft : undefined,
        selectedOptionIds: config.mode === "choice" ? selectedIds : undefined,
      });
      setSubmitted(true);
      setQuizCorrect(result.isCorrect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, submitting, submitted, pagePath, id, config.mode, textDraft, selectedIds]);

  const inputDisabled = preview || submitted || !canSubmit;

  return (
    <div
      className="glass-panel w-full rounded-md border border-border bg-(--color-bg-panel) p-4 text-left"
      data-form-field-id={id}
    >
      <div className="mb-3 flex flex-col gap-1">
        <p className="m-0 text-sm font-semibold text-(--color-text-primary)">
          {config.question}
          {config.required === "yes" ? (
            <span className="ml-1 text-(--color-danger)" aria-hidden>
              *
            </span>
          ) : null}
        </p>
        {config.helperText ? (
          <p className="m-0 text-xs text-(--color-text-secondary)">{config.helperText}</p>
        ) : null}
      </div>

      {config.mode === "text" ? (
        <input
          type={config.inputType}
          value={textDraft}
          placeholder={config.placeholder}
          disabled={inputDisabled}
          onChange={(event) => setTextDraft(event.target.value)}
          className="w-full rounded-md border border-border bg-(--color-bg-cell) px-3 py-2.5 text-sm text-(--color-text-primary) outline-none disabled:cursor-not-allowed"
        />
      ) : (
        <ChoiceOptionsList
          options={config.options}
          gradingMode={config.gradingMode}
          choiceSelection={config.choiceSelection}
          selectedIds={selectedIds}
          disabled={inputDisabled}
          onToggle={toggleOption}
        />
      )}

      {!preview && !session?.user?.id ? (
        <p className="m-0 mt-3 text-xs text-(--color-text-secondary)">
          Sign in to submit your answer.
        </p>
      ) : null}

      {error ? <p className="m-0 mt-3 text-xs text-(--color-danger)">{error}</p> : null}

      {submitted ? (
        <p className="m-0 mt-3 text-xs text-(--color-text-secondary)">
          {isQuizGradingMode(config.gradingMode) && quizCorrect !== null
            ? quizCorrect
              ? "Correct — your answer was recorded."
              : "Incorrect — your answer was recorded."
            : "Thank you — your answer was recorded."}
        </p>
      ) : canSubmit ? (
        <div className="mt-3">
          <Button type="button" size="sm" disabled={submitting} onClick={() => void handleSubmit()}>
            {submitting ? "Submitting…" : "Submit answer"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** Internal choice list renderer. */
function ChoiceOptionsList({
  options,
  gradingMode,
  choiceSelection,
  selectedIds,
  disabled,
  onToggle,
}: {
  options: FormFieldOptionProps[];
  gradingMode: string;
  choiceSelection: string;
  selectedIds: string[];
  disabled: boolean;
  onToggle: (optionId: string) => void;
}) {
  const singlePick = isFormFieldSingleChoiceSelection(
    gradingMode as "none" | "single" | "multiple",
    choiceSelection as "single" | "multiple",
  );
  const inputType = singlePick ? "radio" : "checkbox";

  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {options.map((option) => {
        const checked = selectedIds.includes(option.id);
        const label = option.label.trim() || "Untitled option";

        return (
          <li key={option.id}>
            <label
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-md border border-border bg-(--color-bg-cell) px-3 py-2 text-sm",
                disabled && "cursor-not-allowed opacity-70",
                checked && "border-primary",
              )}
            >
              <input
                type={inputType}
                name={inputType === "radio" ? "form-field-choice" : option.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(option.id)}
                className="accent-primary"
              />
              <span className="text-(--color-text-primary)">{label}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

export default NexusInputRender;
