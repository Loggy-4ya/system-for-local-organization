/**
 * @fileoverview Unit tests for form field validation, grading, and statistics.
 *
 * Module under test: shared/lib/formFieldLogic.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:form-field-logic`
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  answerModeToGradingParts,
  buildFormFieldStatsSnapshot,
  coerceFormFieldOptionsForGrading,
  ensureFormFieldOptions,
  getCorrectOptionIds,
  getFormFieldChoiceAnswerValidationError,
  getFormFieldConfigValidationError,
  gradeFormFieldChoiceAnswer,
  isFormFieldSingleChoiceSelection,
  normalizeNexusInputProps,
  resolveFormFieldAnswerMode,
  resolveFormFieldChoiceSelection,
} from "@shared/lib/formFieldLogic";

describe("normalizeNexusInputProps", () => {
  it("migrates legacy label to question", () => {
    const props = normalizeNexusInputProps({ label: "Legacy question" });
    assert.equal(props.question, "Legacy question");
  });

  it("ensures option ids", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      options: [{ label: "A", isCorrect: "yes" }],
    });
    assert.ok(props.options[0]?.id);
    assert.equal(props.options[0]?.isCorrect, "no");
  });

  it("defaults survey choice selection to single pick", () => {
    const props = normalizeNexusInputProps({ mode: "choice", answerMode: "survey-single" });
    assert.equal(props.answerMode, "survey-single");
    assert.equal(props.choiceSelection, "single");
    assert.equal(isFormFieldSingleChoiceSelection(props.gradingMode, props.choiceSelection), true);
  });

  it("migrates legacy grading props to answerMode", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      gradingMode: "multiple",
      choiceSelection: "single",
    });
    assert.equal(props.answerMode, "quiz-multiple");
    assert.equal(props.gradingMode, "multiple");
  });
});

describe("resolveFormFieldAnswerMode", () => {
  it("maps legacy survey multiple selection", () => {
    assert.equal(
      resolveFormFieldAnswerMode({ gradingMode: "none", choiceSelection: "multiple" }),
      "survey-multiple",
    );
  });
});

describe("answerModeToGradingParts", () => {
  it("maps quiz single to grading + selection", () => {
    const parts = answerModeToGradingParts("quiz-single");
    assert.equal(parts.gradingMode, "single");
    assert.equal(parts.choiceSelection, "single");
  });
});

describe("resolveFormFieldChoiceSelection", () => {
  it("maps quiz grading modes to selection shape", () => {
    assert.equal(resolveFormFieldChoiceSelection("single"), "single");
    assert.equal(resolveFormFieldChoiceSelection("multiple"), "multiple");
    assert.equal(resolveFormFieldChoiceSelection("none", "multiple"), "multiple");
    assert.equal(resolveFormFieldChoiceSelection("none", "single"), "single");
  });
});

describe("coerceFormFieldOptionsForGrading", () => {
  it("keeps only the first correct option for single-answer quizzes", () => {
    const coerced = coerceFormFieldOptionsForGrading(
      [
        { id: "a", label: "A", isCorrect: "yes" },
        { id: "b", label: "B", isCorrect: "yes" },
      ],
      "single",
    );
    assert.equal(getCorrectOptionIds(coerced).length, 1);
    assert.equal(coerced[0]?.isCorrect, "yes");
    assert.equal(coerced[1]?.isCorrect, "no");
  });
});

describe("getFormFieldConfigValidationError", () => {
  it("requires two labeled options for choice mode", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      options: [{ id: "1", label: "Only one", isCorrect: "no" }],
    });
    assert.match(getFormFieldConfigValidationError(props) ?? "", /at least 2/i);
  });

  it("requires a correct option for single-answer quiz", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      gradingMode: "single",
      options: ensureFormFieldOptions([
        { id: "a", label: "A", isCorrect: "no" },
        { id: "b", label: "B", isCorrect: "no" },
      ]),
    });
    assert.match(getFormFieldConfigValidationError(props) ?? "", /at least one/i);
  });
});

describe("gradeFormFieldChoiceAnswer", () => {
  it("marks a perfect multiple-answer quiz as correct", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      gradingMode: "multiple",
      options: [
        { id: "a", label: "A", isCorrect: "yes" },
        { id: "b", label: "B", isCorrect: "yes" },
        { id: "c", label: "C", isCorrect: "no" },
      ],
    });
    assert.equal(gradeFormFieldChoiceAnswer(["a", "b"], props), true);
    assert.equal(gradeFormFieldChoiceAnswer(["a"], props), false);
  });
});

describe("getFormFieldChoiceAnswerValidationError", () => {
  it("rejects multiple picks in single-answer quiz mode", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      gradingMode: "single",
      options: [
        { id: "a", label: "A", isCorrect: "yes" },
        { id: "b", label: "B", isCorrect: "no" },
      ],
    });
    assert.equal(
      getFormFieldChoiceAnswerValidationError(["a", "b"], props),
      "Select only one answer.",
    );
  });

  it("rejects multiple picks in single-choice survey mode", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      gradingMode: "none",
      choiceSelection: "single",
      options: [
        { id: "a", label: "A", isCorrect: "no" },
        { id: "b", label: "B", isCorrect: "no" },
      ],
    });
    assert.equal(
      getFormFieldChoiceAnswerValidationError(["a", "b"], props),
      "Select only one answer.",
    );
  });
});

describe("buildFormFieldStatsSnapshot", () => {
  it("aggregates option counts and quiz correctness", () => {
    const props = normalizeNexusInputProps({
      mode: "choice",
      gradingMode: "single",
      options: [
        { id: "a", label: "A", isCorrect: "yes" },
        { id: "b", label: "B", isCorrect: "no" },
      ],
    });

    const snapshot = buildFormFieldStatsSnapshot(props, [
      { selectedOptionIds: ["a"], isCorrect: true },
      { selectedOptionIds: ["b"], isCorrect: false },
    ]);

    assert.equal(snapshot.totalResponses, 2);
    assert.equal(snapshot.quizCorrectCount, 1);
    assert.equal(snapshot.quizIncorrectCount, 1);
    assert.equal(snapshot.quizCorrectRate, 50);
    assert.equal(snapshot.optionStats[0]?.count, 1);
    assert.equal(snapshot.optionStats[1]?.count, 1);
  });
});
