/**
 * @fileoverview Pure helpers for Puck form / survey / quiz field validation and statistics.
 *
 * @module shared/lib/formFieldLogic
 *
 * Tests: `npm run test:form-field-logic`
 * Registry: `.ai/docs/testing.md`
 */

import {
  DEFAULT_FORM_FIELD_QUESTION,
  MAX_FORM_FIELD_HELPER_LENGTH,
  MAX_FORM_FIELD_OPTION_LABEL_LENGTH,
  MAX_FORM_FIELD_OPTIONS,
  MAX_FORM_FIELD_QUESTION_LENGTH,
  MAX_FORM_FIELD_TEXT_ANSWER_LENGTH,
  MIN_FORM_FIELD_OPTIONS,
  NEXUS_FORM_FIELD_BLOCK_TYPE,
  type FormFieldAnswerMode,
  type FormFieldChoiceSelection,
  type FormFieldGradingMode,
  type FormFieldInputType,
  type FormFieldMode,
  type FormFieldOptionCorrectFlag,
  type FormFieldRequiredFlag,
} from "@shared/constants/formField";

/** One author-defined choice option stored on the Puck block. */
export interface FormFieldOptionProps {
  /** Stable option id used in submissions and stats. */
  id: string;
  /** Respondent-facing label. */
  label: string;
  /** Whether this option is marked correct for quiz grading. */
  isCorrect: FormFieldOptionCorrectFlag;
}

/** Cross-platform distribution flags (future channels documented in feature spec). */
export interface FormFieldDistributionProps {
  /** Published on this Nexus web page (always recommended on). */
  web: "yes" | "no";
  /** Future: Telegram Mini App surface. */
  telegramMiniApp: "yes" | "no";
  /** Future: Telegram bot / group prompts. */
  telegramBot: "yes" | "no";
  /** Future: external embed or public API consumers. */
  externalEmbed: "yes" | "no";
}

/** Normalised Puck props slice for {@link NEXUS_FORM_FIELD_BLOCK_TYPE}. */
export interface NexusInputFieldProps {
  question?: string;
  /** @deprecated Legacy alias — migrated to `question` in resolveData. */
  label?: string;
  placeholder?: string;
  helperText?: string;
  mode?: FormFieldMode;
  inputType?: FormFieldInputType;
  required?: FormFieldRequiredFlag;
  gradingMode?: FormFieldGradingMode;
  /** Survey-only legacy field — prefer {@link FormFieldAnswerMode}. */
  choiceSelection?: FormFieldChoiceSelection;
  /** Unified choice answer mode (survey/quiz + single/multi). */
  answerMode?: FormFieldAnswerMode;
  options?: FormFieldOptionProps[];
  distribution?: FormFieldDistributionProps;
}

/** Aggregated per-option response counts for author statistics. */
export interface FormFieldOptionStatRow {
  optionId: string;
  label: string;
  count: number;
  percentage: number;
}

/** Serializable statistics payload returned to the Puck statistics chapter. */
export interface FormFieldStatsSnapshot {
  totalResponses: number;
  textAnswers: string[];
  optionStats: FormFieldOptionStatRow[];
  quizCorrectCount: number;
  quizIncorrectCount: number;
  quizCorrectRate: number | null;
}

/** Minimal Puck tree node for block lookup. */
interface PuckWalkNode {
  type: string;
  props: Record<string, unknown>;
}

/**
 * Trim and cap a string field.
 *
 * @param value - Raw input.
 * @param max - Maximum length.
 * @returns Normalised string.
 */
export function normalizeFormFieldString(value: string | undefined | null, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

/**
 * Resolve the respondent-facing question from legacy or modern props.
 *
 * @param props - Puck block props.
 * @returns Trimmed question text.
 */
export function resolveFormFieldQuestion(props: NexusInputFieldProps): string {
  const legacy = props.label?.trim();
  const modern = props.question?.trim();
  return modern || legacy || DEFAULT_FORM_FIELD_QUESTION;
}

/**
 * Default distribution flags for new blocks.
 *
 * @returns Web-only distribution defaults.
 */
export function defaultFormFieldDistribution(): FormFieldDistributionProps {
  return {
    web: "yes",
    telegramMiniApp: "no",
    telegramBot: "no",
    externalEmbed: "no",
  };
}

/**
 * Generate a stable option id for a new choice row.
 *
 * @param index - Zero-based option index.
 * @returns Option id string.
 */
export function createFormFieldOptionId(index: number): string {
  return `opt-${index + 1}-${Date.now().toString(36)}`;
}

/**
 * Ensure every choice option has an id and normalised labels.
 *
 * @param options - Raw Puck option rows.
 * @returns Sanitised options array.
 */
export function ensureFormFieldOptions(
  options: FormFieldOptionProps[] | undefined,
): FormFieldOptionProps[] {
  if (!Array.isArray(options)) return [];

  return options.map((row, index) => ({
    id: row.id?.trim() || createFormFieldOptionId(index),
    label: normalizeFormFieldString(row.label, MAX_FORM_FIELD_OPTION_LABEL_LENGTH),
    isCorrect: row.isCorrect === "yes" ? "yes" : "no",
  }));
}

const ANSWER_MODE_VALUES: FormFieldAnswerMode[] = [
  "survey-single",
  "survey-multiple",
  "quiz-single",
  "quiz-multiple",
];

/**
 * Map a unified answer mode to legacy grading + selection props.
 *
 * @param answerMode - Author answer mode.
 * @returns Grading mode and respondent selection shape.
 */
export function answerModeToGradingParts(answerMode: FormFieldAnswerMode): {
  gradingMode: FormFieldGradingMode;
  choiceSelection: FormFieldChoiceSelection;
} {
  switch (answerMode) {
    case "survey-multiple":
      return { gradingMode: "none", choiceSelection: "multiple" };
    case "quiz-single":
      return { gradingMode: "single", choiceSelection: "single" };
    case "quiz-multiple":
      return { gradingMode: "multiple", choiceSelection: "multiple" };
    default:
      return { gradingMode: "none", choiceSelection: "single" };
  }
}

/**
 * Resolve the unified answer mode from modern or legacy Puck props.
 *
 * @param props - Raw Puck props.
 * @returns Normalised answer mode.
 */
export function resolveFormFieldAnswerMode(props: NexusInputFieldProps): FormFieldAnswerMode {
  if (props.answerMode && ANSWER_MODE_VALUES.includes(props.answerMode)) {
    return props.answerMode;
  }

  if (props.gradingMode === "single") return "quiz-single";
  if (props.gradingMode === "multiple") return "quiz-multiple";
  if (props.choiceSelection === "multiple") return "survey-multiple";
  return "survey-single";
}

/**
 * Sync legacy grading props from a unified answer mode.
 *
 * @param props - Puck props to patch.
 * @returns Props with `answerMode`, `gradingMode`, and `choiceSelection` aligned.
 */
export function syncFormFieldAnswerModeProps(
  props: NexusInputFieldProps,
): NexusInputFieldProps & {
  answerMode: FormFieldAnswerMode;
  gradingMode: FormFieldGradingMode;
  choiceSelection: FormFieldChoiceSelection;
} {
  const answerMode = resolveFormFieldAnswerMode(props);
  const { gradingMode, choiceSelection } = answerModeToGradingParts(answerMode);
  return { ...props, answerMode, gradingMode, choiceSelection };
}

/**
 * Resolve how many answers a respondent may select for a choice field.
 *
 * Quiz modes always imply selection shape: `single` → one pick, `multiple` → many picks.
 * Survey mode (`none`) uses {@link FormFieldChoiceSelection}.
 *
 * @param gradingMode - Author grading mode.
 * @param choiceSelection - Survey selection mode when grading is `none`.
 * @returns `single` or `multiple`.
 */
export function resolveFormFieldChoiceSelection(
  gradingMode: FormFieldGradingMode,
  choiceSelection?: FormFieldChoiceSelection,
): FormFieldChoiceSelection {
  if (gradingMode === "single") return "single";
  if (gradingMode === "multiple") return "multiple";
  return choiceSelection === "multiple" ? "multiple" : "single";
}

/**
 * Whether respondents see radio buttons (single pick) for a choice field.
 *
 * @param gradingMode - Author grading mode.
 * @param choiceSelection - Survey selection mode when grading is `none`.
 * @returns True when only one option may be selected.
 */
export function isFormFieldSingleChoiceSelection(
  gradingMode: FormFieldGradingMode,
  choiceSelection?: FormFieldChoiceSelection,
): boolean {
  return resolveFormFieldChoiceSelection(gradingMode, choiceSelection) === "single";
}

/**
 * Coerce option `isCorrect` flags to match grading rules on load / save.
 *
 * @param options - Raw or normalised options.
 * @param gradingMode - Author grading mode.
 * @returns Options with at most one correct row in single-quiz mode; surveys clear flags.
 */
export function coerceFormFieldOptionsForGrading(
  options: FormFieldOptionProps[] | undefined,
  gradingMode: FormFieldGradingMode,
): FormFieldOptionProps[] {
  const normalized = ensureFormFieldOptions(options);

  if (gradingMode === "none") {
    return normalized.map((row) => ({ ...row, isCorrect: "no" as const }));
  }

  if (gradingMode !== "single") {
    return normalized;
  }

  const firstCorrectIndex = normalized.findIndex((row) => row.isCorrect === "yes");
  if (firstCorrectIndex < 0) {
    return normalized;
  }

  return normalized.map((row, index) => ({
    ...row,
    isCorrect: index === firstCorrectIndex ? "yes" : "no",
  }));
}

/**
 * Editor helper copy for the options chapter based on grading and selection mode.
 *
 * @param gradingMode - Author grading mode.
 * @param choiceSelection - Survey selection mode when grading is `none`.
 * @param options - Current option rows.
 * @returns Hint tone and message for the Puck sidebar.
 */
export function getFormFieldOptionsEditorHint(
  answerMode: FormFieldAnswerMode,
  options: FormFieldOptionProps[],
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
          ? "Survey — respondents pick one option (radio buttons)."
          : "Survey — respondents may select multiple options (checkboxes).",
    };
  }

  if (gradingMode === "single") {
    if (correctCount === 0) {
      return {
        tone: "warning",
        message: "Quiz — mark exactly one option as correct. Respondents pick one answer.",
      };
    }
    if (correctCount > 1) {
      return {
        tone: "warning",
        message: "Only one option can be correct for a single-answer quiz.",
      };
    }
    return {
      tone: "success",
      message: "Quiz — one correct option set. Respondents pick one answer.",
    };
  }

  if (correctCount === 0) {
    return {
      tone: "warning",
      message: "Quiz — mark every correct option. Respondents may pick multiple answers.",
    };
  }

  return {
    tone: "success",
    message: `${correctCount} correct option${correctCount === 1 ? "" : "s"} marked. Respondents may pick multiple answers.`,
  };
}

/**
 * Migrate legacy `label` props and fill defaults on load.
 *
 * @param props - Raw Puck props.
 * @returns Props safe for render and validation.
 */
export function normalizeNexusInputProps(props: NexusInputFieldProps): Required<
  Pick<
    NexusInputFieldProps,
    | "question"
    | "placeholder"
    | "helperText"
    | "mode"
    | "inputType"
    | "required"
    | "gradingMode"
    | "choiceSelection"
    | "answerMode"
    | "options"
    | "distribution"
  >
> {
  const synced = syncFormFieldAnswerModeProps(props);
  const gradingMode = synced.gradingMode;
  const choiceSelection = synced.choiceSelection;

  return {
    question: resolveFormFieldQuestion(props),
    placeholder: normalizeFormFieldString(props.placeholder, 200) || "Enter your answer…",
    helperText: normalizeFormFieldString(props.helperText, MAX_FORM_FIELD_HELPER_LENGTH),
    mode: props.mode === "choice" ? "choice" : "text",
    inputType:
      props.inputType === "email" ||
      props.inputType === "password" ||
      props.inputType === "number"
        ? props.inputType
        : "text",
    required: props.required === "yes" ? "yes" : "no",
    gradingMode,
    choiceSelection,
    answerMode: synced.answerMode,
    options: coerceFormFieldOptionsForGrading(props.options, gradingMode),
    distribution: {
      ...defaultFormFieldDistribution(),
      ...props.distribution,
      web: props.distribution?.web === "no" ? "no" : "yes",
    },
  };
}

/**
 * Whether the field grades responses as a quiz.
 *
 * @param gradingMode - Author grading mode.
 * @returns True for single or multiple correct-answer modes.
 */
export function isQuizGradingMode(gradingMode: FormFieldGradingMode): boolean {
  return gradingMode === "single" || gradingMode === "multiple";
}

/**
 * Collect ids of options marked correct for quiz grading.
 *
 * @param options - Normalised options.
 * @returns Correct option ids.
 */
export function getCorrectOptionIds(options: FormFieldOptionProps[]): string[] {
  return options.filter((row) => row.isCorrect === "yes").map((row) => row.id);
}

/**
 * Validate author configuration for a form field block.
 *
 * @param props - Normalised Puck props.
 * @returns Error message or null when valid.
 */
export function getFormFieldConfigValidationError(
  props: ReturnType<typeof normalizeNexusInputProps>,
): string | null {
  if (!props.question.trim()) {
    return "Question cannot be empty.";
  }
  if (props.question.length > MAX_FORM_FIELD_QUESTION_LENGTH) {
    return `Question must be at most ${MAX_FORM_FIELD_QUESTION_LENGTH} characters.`;
  }

  if (props.mode === "choice") {
    const filled = props.options.filter((row) => row.label.trim().length > 0);
    if (filled.length < MIN_FORM_FIELD_OPTIONS) {
      return `Add at least ${MIN_FORM_FIELD_OPTIONS} options with labels.`;
    }
    if (filled.length > MAX_FORM_FIELD_OPTIONS) {
      return `At most ${MAX_FORM_FIELD_OPTIONS} options are allowed.`;
    }

    if (isQuizGradingMode(props.gradingMode)) {
      const correctIds = getCorrectOptionIds(filled);
      if (correctIds.length === 0) {
        return "Mark at least one option as correct for quiz mode.";
      }
      if (props.gradingMode === "single" && correctIds.length !== 1) {
        return "Single-answer quiz requires exactly one correct option.";
      }
    }
  }

  return null;
}

/**
 * Validate a respondent text answer.
 *
 * @param textAnswer - Raw text.
 * @param required - Whether an answer is mandatory.
 * @returns Error message or null.
 */
export function getFormFieldTextAnswerValidationError(
  textAnswer: string | undefined | null,
  required: FormFieldRequiredFlag,
): string | null {
  const normalized = normalizeFormFieldString(textAnswer, MAX_FORM_FIELD_TEXT_ANSWER_LENGTH);
  if (!normalized && required === "yes") {
    return "An answer is required.";
  }
  return null;
}

/**
 * Validate selected option ids against the field configuration.
 *
 * @param selectedOptionIds - Respondent selection.
 * @param props - Normalised field props.
 * @returns Error message or null.
 */
export function getFormFieldChoiceAnswerValidationError(
  selectedOptionIds: string[] | undefined | null,
  props: ReturnType<typeof normalizeNexusInputProps>,
): string | null {
  const ids = Array.isArray(selectedOptionIds)
    ? selectedOptionIds.map((id) => String(id).trim()).filter(Boolean)
    : [];
  const knownIds = new Set(props.options.map((row) => row.id));

  if (ids.length === 0 && props.required === "yes") {
    return "Select at least one option.";
  }

  for (const id of ids) {
    if (!knownIds.has(id)) {
      return "One or more selected options are invalid.";
    }
  }

  if (isFormFieldSingleChoiceSelection(props.gradingMode, props.choiceSelection) && ids.length > 1) {
    return "Select only one answer.";
  }

  return null;
}

/**
 * Grade a choice response for quiz modes.
 *
 * @param selectedOptionIds - Respondent selection.
 * @param props - Normalised field props.
 * @returns True when the answer matches all correct options and no incorrect ones.
 */
export function gradeFormFieldChoiceAnswer(
  selectedOptionIds: readonly string[],
  props: ReturnType<typeof normalizeNexusInputProps>,
): boolean | null {
  if (!isQuizGradingMode(props.gradingMode)) return null;

  const selected = new Set(selectedOptionIds);
  const correct = new Set(getCorrectOptionIds(props.options));

  if (selected.size !== correct.size) return false;
  for (const id of correct) {
    if (!selected.has(id)) return false;
  }
  return true;
}

/**
 * Walk a Puck document tree and locate a form field block by id.
 *
 * @param content - Root content array from `puckData.content`.
 * @param fieldId - Puck `props.id` of the target block.
 * @returns Matching block props or null.
 */
export function findNexusInputPropsInPuckTree(
  content: unknown,
  fieldId: string,
): NexusInputFieldProps | null {
  if (!Array.isArray(content)) return null;

  let found: NexusInputFieldProps | null = null;

  const visit = (nodes: PuckWalkNode[]): void => {
    for (const node of nodes) {
      if (node.type === NEXUS_FORM_FIELD_BLOCK_TYPE && node.props?.id === fieldId) {
        found = node.props as NexusInputFieldProps;
      }

      for (const value of Object.values(node.props ?? {})) {
        if (Array.isArray(value)) {
          const nested = value.filter(
            (item): item is PuckWalkNode =>
              Boolean(item) &&
              typeof item === "object" &&
              typeof (item as PuckWalkNode).type === "string",
          );
          if (nested.length > 0) visit(nested);
        }
      }
    }
  };

  visit(content as PuckWalkNode[]);
  return found;
}

/**
 * Aggregate option pick counts for author statistics.
 *
 * @param optionRows - Configured options with labels.
 * @param responses - Stored responses with `selectedOptionIds`.
 * @returns Per-option counts and percentages.
 */
export function buildFormFieldOptionStats(
  optionRows: FormFieldOptionProps[],
  responses: ReadonlyArray<{ selectedOptionIds?: string[] | null }>,
): FormFieldOptionStatRow[] {
  const counts = new Map<string, number>();
  for (const row of optionRows) {
    counts.set(row.id, 0);
  }

  let totalPicks = 0;
  for (const response of responses) {
    for (const id of response.selectedOptionIds ?? []) {
      if (!counts.has(id)) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
      totalPicks += 1;
    }
  }

  const denominator = totalPicks > 0 ? totalPicks : 1;
  return optionRows.map((row) => {
    const count = counts.get(row.id) ?? 0;
    return {
      optionId: row.id,
      label: row.label || "Untitled option",
      count,
      percentage: totalPicks > 0 ? Math.round((count / denominator) * 100) : 0,
    };
  });
}

/**
 * Build a statistics snapshot for the editor statistics chapter.
 *
 * @param props - Normalised field configuration.
 * @param responses - All stored responses for the field.
 * @returns Aggregated stats DTO.
 */
export function buildFormFieldStatsSnapshot(
  props: ReturnType<typeof normalizeNexusInputProps>,
  responses: ReadonlyArray<{
    textAnswer?: string | null;
    selectedOptionIds?: string[] | null;
    isCorrect?: boolean | null;
  }>,
): FormFieldStatsSnapshot {
  const totalResponses = responses.length;
  const textAnswers = responses
    .map((row) => row.textAnswer?.trim())
    .filter((value): value is string => Boolean(value));

  const graded = responses.filter((row) => row.isCorrect !== null && row.isCorrect !== undefined);
  const quizCorrectCount = graded.filter((row) => row.isCorrect === true).length;
  const quizIncorrectCount = graded.filter((row) => row.isCorrect === false).length;
  const quizCorrectRate =
    graded.length > 0 ? Math.round((quizCorrectCount / graded.length) * 100) : null;

  return {
    totalResponses,
    textAnswers: props.mode === "text" ? textAnswers : [],
    optionStats:
      props.mode === "choice" ? buildFormFieldOptionStats(props.options, responses) : [],
    quizCorrectCount,
    quizIncorrectCount,
    quizCorrectRate,
  };
}
