/**
 * @fileoverview Consolidated domain for Puck form / survey / quiz field responses.
 *
 * @module shared/domains/FormFieldDomain
 *
 * Tests: `npm run test:form-field-logic`
 * Registry: `.ai/docs/testing.md`
 */

import connectDB from "@shared/lib/db";
import {
  buildFormFieldStatsSnapshot,
  findNexusInputPropsInPuckTree,
  getFormFieldChoiceAnswerValidationError,
  getFormFieldConfigValidationError,
  getFormFieldTextAnswerValidationError,
  gradeFormFieldChoiceAnswer,
  isQuizGradingMode,
  normalizeFormFieldString,
  normalizeNexusInputProps,
  type FormFieldStatsSnapshot,
} from "@shared/lib/formFieldLogic";
import { isPagePubliclyVisible } from "@shared/lib/pagePublicationLogic";
import FormFieldResponse from "@shared/models/FormFieldResponse";
import Page from "@shared/models/Page";
import { SurveyParticipation } from "@shared/models/UserEngagement";
import type { ParticipationType } from "@shared/models/UserEngagement";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { Types } from "mongoose";

/** Serializable submission result returned to clients. */
export interface FormFieldSubmitResultDto {
  /** Whether the response was stored. */
  submitted: boolean;
  /** Quiz grading outcome when applicable. */
  isCorrect: boolean | null;
  /** ISO timestamp of submission. */
  submittedAt: string;
}

/** Serializable row for "already answered" hydration. */
export interface FormFieldUserResponseDto {
  textAnswer: string | null;
  selectedOptionIds: string[];
  isCorrect: boolean | null;
  submittedAt: string;
}

/**
 * Domain-level error with HTTP status hint.
 */
export class FormFieldDomainError extends Error {
  /** Suggested HTTP status for API routes. */
  readonly httpStatus: number;

  /**
   * @param message - User-facing error message.
   * @param httpStatus - Suggested HTTP status code.
   */
  constructor(message: string, httpStatus: number) {
    super(message);
    this.name = "FormFieldDomainError";
    this.httpStatus = httpStatus;
  }
}

/**
 * Consolidated engine for form field submissions and author statistics.
 */
export class FormFieldDomain {
  /**
   * Load and normalise a form field block from a persisted page.
   *
   * @param pagePath - MongoDB page path.
   * @param fieldId - Puck block id.
   * @throws {@link FormFieldDomainError} When the page or field is missing.
   */
  public static async resolveFieldConfig(pagePath: string, fieldId: string) {
    await connectDB();
    const page = await Page.findOne({ path: pagePath }).lean();
    if (!page || !PageDomain.isPubliclyVisible(page)) {
      throw new FormFieldDomainError("Page not found.", 404);
    }

    const rawProps = findNexusInputPropsInPuckTree(page.puckData?.content, fieldId);
    if (!rawProps) {
      throw new FormFieldDomainError("Form field not found on this page.", 404);
    }

    const props = normalizeNexusInputProps(rawProps);
    const configError = getFormFieldConfigValidationError(props);
    if (configError) {
      throw new FormFieldDomainError("This form field is not configured correctly.", 500);
    }

    if (props.distribution.web !== "yes") {
      throw new FormFieldDomainError("This form field is not published on the web.", 403);
    }

    return { page, props };
  }

  /**
   * Assert the caller may read aggregate statistics for a field.
   *
   * @param pagePath - MongoDB page path.
   * @param userId - Authenticated user id.
   * @throws {@link FormFieldDomainError} When forbidden.
   */
  public static async assertCanViewStats(pagePath: string, userId: string): Promise<void> {
    await connectDB();
    const page = await Page.findOne({ path: pagePath }).lean();
    if (!page) {
      throw new FormFieldDomainError("Page not found.", 404);
    }

    const allowed = await PageDomain.canUserEditPageDoc(userId, PageDomain.toOwnershipSlice(page));
    if (!allowed) {
      throw new FormFieldDomainError("You do not have permission to view form statistics.", 403);
    }
  }

  /**
   * Fetch the current user's prior response, if any.
   *
   * @param pagePath - MongoDB page path.
   * @param fieldId - Puck block id.
   * @param userId - Authenticated user id.
   * @returns Prior response or null.
   */
  public static async getUserResponse(
    pagePath: string,
    fieldId: string,
    userId: string,
  ): Promise<FormFieldUserResponseDto | null> {
    await connectDB();
    const row = await FormFieldResponse.findOne({
      pagePath,
      fieldId,
      userId: new Types.ObjectId(userId),
    }).lean();

    if (!row) return null;

    return {
      textAnswer: row.textAnswer ?? null,
      selectedOptionIds: row.selectedOptionIds ?? [],
      isCorrect: row.isCorrect ?? null,
      submittedAt: row.submittedAt.toISOString(),
    };
  }

  /**
   * Store a respondent answer (one per user per field).
   *
   * @param pagePath - MongoDB page path.
   * @param fieldId - Puck block id.
   * @param userId - Authenticated user id.
   * @param input - Raw answer payload.
   * @returns Submission result.
   */
  public static async submitResponse(
    pagePath: string,
    fieldId: string,
    userId: string,
    input: {
      textAnswer?: string | null;
      selectedOptionIds?: string[];
    },
  ): Promise<FormFieldSubmitResultDto> {
    const { props } = await FormFieldDomain.resolveFieldConfig(pagePath, fieldId);

    const existing = await FormFieldResponse.findOne({
      pagePath,
      fieldId,
      userId: new Types.ObjectId(userId),
    }).lean();

    if (existing) {
      throw new FormFieldDomainError("You have already answered this question.", 409);
    }

    let textAnswer: string | null = null;
    let selectedOptionIds: string[] = [];
    let isCorrect: boolean | null = null;

    if (props.mode === "text") {
      const error = getFormFieldTextAnswerValidationError(input.textAnswer, props.required);
      if (error) throw new FormFieldDomainError(error, 400);
      textAnswer = normalizeFormFieldString(input.textAnswer, 2000) || null;
    } else {
      const error = getFormFieldChoiceAnswerValidationError(input.selectedOptionIds, props);
      if (error) throw new FormFieldDomainError(error, 400);
      selectedOptionIds = (input.selectedOptionIds ?? []).map((id) => id.trim());
      isCorrect = gradeFormFieldChoiceAnswer(selectedOptionIds, props);
    }

    const submittedAt = new Date();
    await FormFieldResponse.create({
      pagePath,
      fieldId,
      userId: new Types.ObjectId(userId),
      mode: props.mode,
      gradingMode: props.gradingMode,
      textAnswer,
      selectedOptionIds,
      isCorrect,
      submittedAt,
    });

    await FormFieldDomain.ensureSurveyParticipation(
      pagePath,
      userId,
      fieldId,
      isQuizGradingMode(props.gradingMode) ? "quiz" : "survey",
      submittedAt,
    );

    return {
      submitted: true,
      isCorrect,
      submittedAt: submittedAt.toISOString(),
    };
  }

  /**
   * Aggregate author-facing statistics for a form field.
   *
   * @param pagePath - MongoDB page path.
   * @param fieldId - Puck block id.
   * @param userId - Authenticated editor user id.
   * @returns Stats snapshot for the Puck statistics chapter.
   */
  public static async getFieldStats(
    pagePath: string,
    fieldId: string,
    userId: string,
  ): Promise<FormFieldStatsSnapshot & { question: string; mode: string; gradingMode: string }> {
    await FormFieldDomain.assertCanViewStats(pagePath, userId);

    const rawProps = findNexusInputPropsInPuckTree(
      (await Page.findOne({ path: pagePath }).lean())?.puckData?.content,
      fieldId,
    );
    if (!rawProps) {
      throw new FormFieldDomainError("Form field not found on this page.", 404);
    }

    const props = normalizeNexusInputProps(rawProps);
    const rows = await FormFieldResponse.find({ pagePath, fieldId })
      .sort({ submittedAt: -1 })
      .limit(500)
      .lean();

    const snapshot = buildFormFieldStatsSnapshot(
      props,
      rows.map((row) => ({
        textAnswer: row.textAnswer,
        selectedOptionIds: row.selectedOptionIds,
        isCorrect: row.isCorrect,
      })),
    );

    return {
      ...snapshot,
      question: props.question,
      mode: props.mode,
      gradingMode: props.gradingMode,
    };
  }

  /**
   * Upsert page-level survey participation on the first field response.
   *
   * @param pagePath - Survey page path used as `surveyId`.
   * @param userId - Respondent user id.
   * @param fieldId - Field id stored in `quizId` for traceability.
   * @param participationType - Survey vs quiz discriminator.
   * @param submittedAt - Submission timestamp.
   */
  private static async ensureSurveyParticipation(
    pagePath: string,
    userId: string,
    fieldId: string,
    participationType: ParticipationType,
    submittedAt: Date,
  ): Promise<void> {
    await SurveyParticipation.updateOne(
      { userId: new Types.ObjectId(userId), surveyId: pagePath },
      {
        $setOnInsert: {
          userId: new Types.ObjectId(userId),
          surveyId: pagePath,
          quizId: fieldId,
          participationType,
          submittedAt,
        },
      },
      { upsert: true },
    );
  }
}
