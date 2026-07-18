"use client";

/**
 * @fileoverview Unified survey / quiz answer mode control for Puck form fields.
 *
 * Replaces separate grading + respondent-selection radios with one segmented control.
 *
 * @module src/components/puck/fields/FormFieldAnswerModeField
 */

import type { FormFieldAnswerMode } from "@shared/constants/formField";
import { useTranslations } from "next-intl";
import { FieldLabelRow } from "./FieldLabelRow";
import { SegmentedControl } from "./SegmentedControl";
import { translatePuckSidebarCopy } from "../lib/translatePuckSidebarCopy";

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

/** Rich tooltip copy for survey vs quiz (question-mark hover). */
function AnswerModeHelpContent() {
  const t = useTranslations("puck.fieldLabels");

  return (
    <div className="flex flex-col gap-2 text-left">
      <p className="m-0">
        <span className="font-semibold text-(--color-text-primary)">{t("survey_heading")}</span>
        {" — "}
        {t("survey_help")}
      </p>
      <p className="m-0">
        <span className="font-semibold text-(--color-text-primary)">{t("quiz_heading")}</span>
        {" — "}
        {t("quiz_help")}
      </p>
      <p className="m-0 text-(--color-text-secondary)">{t("pick_one_pick_any")}</p>
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
  const tLabels = useTranslations("puck.fieldLabels");
  const tOptions = useTranslations("puck.fieldOptions");

  const titleKeys = {
    "survey-single": "survey_pick_one_title",
    "survey-multiple": "survey_pick_any_title",
    "quiz-single": "quiz_one_title",
    "quiz-multiple": "quiz_multiple_title",
  } as const;

  const options = ANSWER_MODE_OPTIONS.map((opt) => ({
    label: translatePuckSidebarCopy(opt.label, tOptions),
    value: opt.value,
    title: tLabels(titleKeys[opt.value] as never),
  }));

  return (
    <div className="nexus-sidebar-field">
      <FieldLabelRow
        label={translatePuckSidebarCopy(field.label ?? "Answer mode", tLabels)}
        hint={tLabels("answer_mode_help_sr")}
        hintContent={<AnswerModeHelpContent />}
      />
      <SegmentedControl
        ariaLabel={tLabels("form_field_answer_mode")}
        options={options}
        value={current}
        onChange={onChange}
      />
    </div>
  );
}

export default FormFieldAnswerModeField;
