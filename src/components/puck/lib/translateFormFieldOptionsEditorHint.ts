/**
 * @fileoverview Locale-aware hint copy for the Puck form-field options editor.
 *
 * Mirrors {@link getFormFieldOptionsEditorHint} logic but resolves strings via
 * `puck.fieldHints` at render time so shared English defaults stay API-safe.
 *
 * @module src/components/puck/lib/translateFormFieldOptionsEditorHint
 */

import type { FormFieldAnswerMode } from "@shared/constants/formField";
import type { FormFieldOptionProps } from "@shared/lib/formFieldLogic";
import {
  answerModeToGradingParts,
  getCorrectOptionIds,
  isQuizGradingMode,
  resolveFormFieldChoiceSelection,
} from "@shared/lib/formFieldLogic";

/** Minimal translator for `puck.fieldHints` form-options keys. */
export type FormFieldOptionsHintTranslator = (
  key:
    | "formOptionsSurveySingle"
    | "formOptionsSurveyMultiple"
    | "formOptionsQuizSingleNone"
    | "formOptionsQuizSingleMany"
    | "formOptionsQuizSingleOk"
    | "formOptionsQuizMultipleNone"
    | "formOptionsQuizMultipleOk",
  values?: { count?: number },
) => string;

/**
 * Resolve localized status hint for the options editor (survey vs quiz modes).
 *
 * @param answerMode - Resolved answer mode from the selected NexusInput block.
 * @param options - Current option rows.
 * @param t - `useTranslations("puck.fieldHints")` callback.
 * @returns Tone + localized message for the status strip.
 */
export function translateFormFieldOptionsEditorHint(
  answerMode: FormFieldAnswerMode,
  options: FormFieldOptionProps[],
  t: FormFieldOptionsHintTranslator,
): { tone: "info" | "warning" | "success"; message: string } {
  const { gradingMode, choiceSelection } = answerModeToGradingParts(answerMode);
  const selection = resolveFormFieldChoiceSelection(gradingMode, choiceSelection);
  const filled = options.filter((row) => row.label.trim().length > 0);
  const correctCount = getCorrectOptionIds(filled).length;

  if (!isQuizGradingMode(gradingMode)) {
    return {
      tone: "info",
      message:
        selection === "single"
          ? t("formOptionsSurveySingle")
          : t("formOptionsSurveyMultiple"),
    };
  }

  if (gradingMode === "single") {
    if (correctCount === 0) {
      return { tone: "warning", message: t("formOptionsQuizSingleNone") };
    }
    if (correctCount > 1) {
      return { tone: "warning", message: t("formOptionsQuizSingleMany") };
    }
    return { tone: "success", message: t("formOptionsQuizSingleOk") };
  }

  if (correctCount === 0) {
    return { tone: "warning", message: t("formOptionsQuizMultipleNone") };
  }

  return {
    tone: "success",
    message: t("formOptionsQuizMultipleOk", { count: correctCount }),
  };
}
