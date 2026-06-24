/**
 * @fileoverview Constants for Puck {@link NexusInput} survey and quiz form fields.
 *
 * @module shared/constants/formField
 */

/** Puck block registry key for form / survey / quiz fields. */
export const NEXUS_FORM_FIELD_BLOCK_TYPE = "NexusInput" as const;

/** How the answer is captured on the published page. */
export type FormFieldMode = "text" | "choice";

/** Text input subtype when {@link FormFieldMode} is `text`. */
export type FormFieldInputType = "text" | "email" | "password" | "number";

/** Puck radio encoding for required flag. */
export type FormFieldRequiredFlag = "yes" | "no";

/** Survey vs quiz grading for choice fields. */
export type FormFieldGradingMode = "none" | "single" | "multiple";

/** How many options a respondent may pick in survey (`gradingMode: none`) choice fields. */
export type FormFieldChoiceSelection = "single" | "multiple";

/**
 * Unified author-facing answer mode for choice fields.
 * Maps to {@link FormFieldGradingMode} + {@link FormFieldChoiceSelection} on persist.
 */
export type FormFieldAnswerMode =
  | "survey-single"
  | "survey-multiple"
  | "quiz-single"
  | "quiz-multiple";

/** Puck radio encoding for whether an option is a correct quiz answer. */
export type FormFieldOptionCorrectFlag = "yes" | "no";

/** Maximum question length shown to respondents. */
export const MAX_FORM_FIELD_QUESTION_LENGTH = 500;

/** Maximum helper text length. */
export const MAX_FORM_FIELD_HELPER_LENGTH = 500;

/** Maximum text answer length. */
export const MAX_FORM_FIELD_TEXT_ANSWER_LENGTH = 2000;

/** Maximum option label length. */
export const MAX_FORM_FIELD_OPTION_LABEL_LENGTH = 300;

/** Minimum options for choice mode. */
export const MIN_FORM_FIELD_OPTIONS = 2;

/** Maximum options for choice mode. */
export const MAX_FORM_FIELD_OPTIONS = 12;

/** Default placeholder for text mode. */
export const DEFAULT_FORM_FIELD_PLACEHOLDER = "Enter your answer…";

/** Default question for new blocks. */
export const DEFAULT_FORM_FIELD_QUESTION = "What is your answer?";
