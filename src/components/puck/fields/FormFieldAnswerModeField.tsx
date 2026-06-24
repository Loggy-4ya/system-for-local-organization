"use client";

/**
 * @fileoverview Unified survey / quiz answer mode control for Puck form fields.
 *
 * Replaces separate grading + respondent-selection radios with one segmented control.
 *
 * @module src/components/puck/fields/FormFieldAnswerModeField
 */

import type { FormFieldAnswerMode } from "@shared/constants/formField";
import { FieldLabelRow } from "./FieldLabelRow";
import { SegmentedControl } from "./SegmentedControl";

/** Props passed by Puck to the answer mode custom field. */
interface FormFieldAnswerModeFieldProps {
  field: { label?: string };
  value: FormFieldAnswerMode | undefined;
  onChange: (value: FormFieldAnswerMode) => void;
}

const ANSWER_MODE_OPTIONS: Array<{ label: string; value: FormFieldAnswerMode; title: string }> = [
  {
    label: "Survey — pick one",
    value: "survey-single",
    title: "No scoring. Respondents choose one option (radio buttons).",
  },
  {
    label: "Survey — pick any",
    value: "survey-multiple",
    title: "No scoring. Respondents may select multiple options (checkboxes).",
  },
  {
    label: "Quiz — one correct",
    value: "quiz-single",
    title: "Mark one correct option. Respondents pick one answer.",
  },
  {
    label: "Quiz — multiple correct",
    value: "quiz-multiple",
    title: "Mark all correct options. Respondents may pick multiple answers.",
  },
];

const ANSWER_MODE_HELP_SR =
  "Survey collects opinions without scoring. Quiz tests knowledge with marked correct answers and Correct or Incorrect feedback. Pick one uses radio buttons; pick any uses checkboxes.";

/** Rich tooltip copy for survey vs quiz (question-mark hover). */
function AnswerModeHelpContent() {
  return (
    <div className="flex flex-col gap-2 text-left">
      <p className="m-0">
        <span className="font-semibold text-(--color-text-primary)">Survey</span>
        {" — "}
        collect opinions or preferences. There are no right or wrong answers. Statistics show how
        many people chose each option.
      </p>
      <p className="m-0">
        <span className="font-semibold text-(--color-text-primary)">Quiz</span>
        {" — "}
        test knowledge. Mark the correct option(s). After submit, respondents see Correct or
        Incorrect. Statistics include a correctness rate.
      </p>
      <p className="m-0 text-(--color-text-secondary)">
        Pick one = radio buttons. Pick any = checkboxes.
      </p>
    </div>
  );
}

/**
 * Single answer-mode picker — survey vs quiz and single vs multi selection combined.
 *
 * @param props - Puck custom field props.
 * @returns Segmented answer mode control.
 */
export function FormFieldAnswerModeField({
  field,
  value,
  onChange,
}: FormFieldAnswerModeFieldProps) {
  const current = value ?? "survey-single";

  return (
    <div className="nexus-sidebar-field">
      <FieldLabelRow
        label={field.label ?? "Answer mode"}
        hint={ANSWER_MODE_HELP_SR}
        hintContent={<AnswerModeHelpContent />}
      />
      <SegmentedControl
        ariaLabel="Form field answer mode"
        options={ANSWER_MODE_OPTIONS}
        value={current}
        onChange={onChange}
      />
    </div>
  );
}

export default FormFieldAnswerModeField;
