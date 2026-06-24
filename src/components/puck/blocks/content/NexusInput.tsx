"use client";

/**
 * @fileoverview Puck block for survey, quiz, and open-text form fields.
 *
 * Maps to Figma Input/Default with question + answer modes (text or choice).
 *
 * @module src/components/puck/blocks/content/NexusInput
 */

import {
  DEFAULT_FORM_FIELD_PLACEHOLDER,
  DEFAULT_FORM_FIELD_QUESTION,
} from "@shared/constants/formField";
import {
  defaultFormFieldDistribution,
  coerceFormFieldOptionsForGrading,
  ensureFormFieldOptions,
  normalizeNexusInputProps,
  resolveFormFieldQuestion,
  syncFormFieldAnswerModeProps,
  type NexusInputFieldProps,
} from "@shared/lib/formFieldLogic";
import { FormFieldAnswerModeField } from "../../fields/FormFieldAnswerModeField";
import { FormFieldDistributionField } from "../../fields/FormFieldDistributionField";
import { FormFieldOptionsField } from "../../fields/FormFieldOptionsField";
import { FormFieldStatsPanelField } from "../../fields/FormFieldStatsPanelField";
import { NexusInputRender } from "./NexusInputRender";

/**
 * Puck form field — question with text answer or choice / quiz options.
 */
export const NexusInput = {
  label: "Form Input",
  fields: {
    question: {
      type: "text" as const,
      label: "Question",
    },
    mode: {
      type: "radio" as const,
      label: "Answer Type",
      options: [
        { label: "Open text", value: "text" },
        { label: "Choice (survey / quiz)", value: "choice" },
      ],
    },
    options: {
      type: "custom" as const,
      label: "Answer Options",
      render: FormFieldOptionsField as never,
    },
    placeholder: {
      type: "text" as const,
      label: "Placeholder Text",
    },
    helperText: {
      type: "text" as const,
      label: "Helper / Description Text",
    },
    inputType: {
      type: "select" as const,
      label: "Input Type",
      options: [
        { label: "Text", value: "text" },
        { label: "Email", value: "email" },
        { label: "Password", value: "password" },
        { label: "Number", value: "number" },
      ],
    },
    required: {
      type: "radio" as const,
      label: "Required Field",
      options: [
        { label: "No", value: "no" },
        { label: "Yes", value: "yes" },
      ],
    },
    answerMode: {
      type: "custom" as const,
      label: "Answer Mode",
      render: FormFieldAnswerModeField as never,
    },
    distribution: {
      type: "custom" as const,
      label: "Distribution",
      render: FormFieldDistributionField as never,
    },
    statsPanel: {
      type: "custom" as const,
      label: "Response Statistics",
      render: FormFieldStatsPanelField as never,
    },
  },
  defaultProps: {
    question: DEFAULT_FORM_FIELD_QUESTION,
    mode: "text" as const,
    options: [
      { id: "opt-1", label: "Option A", isCorrect: "no" as const },
      { id: "opt-2", label: "Option B", isCorrect: "no" as const },
    ],
    placeholder: DEFAULT_FORM_FIELD_PLACEHOLDER,
    helperText: "",
    inputType: "text" as const,
    required: "no" as const,
    answerMode: "survey-single" as const,
    gradingMode: "none" as const,
    choiceSelection: "single" as const,
    distribution: defaultFormFieldDistribution(),
    statsPanel: "",
  },
  resolveData: ({ props }: { props: NexusInputFieldProps & { statsPanel?: string } }) => {
    const synced = syncFormFieldAnswerModeProps(props);
    const question = resolveFormFieldQuestion(synced);
    const options = coerceFormFieldOptionsForGrading(
      ensureFormFieldOptions(synced.options),
      synced.gradingMode,
    );

    return {
      props: {
        ...synced,
        question,
        options,
        distribution: {
          ...defaultFormFieldDistribution(),
          ...synced.distribution,
          web: "yes" as const,
        },
      },
    };
  },
  render({
    id,
    puck,
    ...rawProps
  }: NexusInputFieldProps & {
    id: string;
    puck?: { isEditing?: boolean };
    statsPanel?: string;
  }) {
    const props = normalizeNexusInputProps(rawProps);

    return (
      <NexusInputRender
        id={id}
        isEditing={puck?.isEditing}
        question={props.question}
        placeholder={props.placeholder}
        helperText={props.helperText}
        mode={props.mode}
        inputType={props.inputType}
        required={props.required}
        gradingMode={props.gradingMode}
        choiceSelection={props.choiceSelection}
        options={props.options}
        distribution={props.distribution}
      />
    );
  },
};

export default NexusInput;
