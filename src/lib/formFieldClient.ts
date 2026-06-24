/**
 * @fileoverview Browser client for Puck form / survey / quiz field APIs.
 *
 * @module src/lib/formFieldClient
 */

import type { FormFieldStatsSnapshot } from "@shared/lib/formFieldLogic";
import type {
  FormFieldSubmitResultDto,
  FormFieldUserResponseDto,
} from "@shared/domains/FormFieldDomain";

/** Extended stats payload from the author API. */
export interface FormFieldStatsResult extends FormFieldStatsSnapshot {
  question: string;
  mode: string;
  gradingMode: string;
}

/**
 * Submit an answer to a form field on a published page.
 *
 * @param pagePath - MongoDB page path.
 * @param fieldId - Puck block id.
 * @param payload - Text or choice answer.
 * @returns Submission result.
 */
export async function submitFormFieldAnswer(
  pagePath: string,
  fieldId: string,
  payload: {
    textAnswer?: string | null;
    selectedOptionIds?: string[];
  },
): Promise<FormFieldSubmitResultDto> {
  const res = await fetch("/api/pages/form-fields/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: pagePath,
      fieldId,
      ...payload,
    }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to submit your answer.");
  }

  return (await res.json()) as FormFieldSubmitResultDto;
}

/**
 * Load the current user's prior answer for a field.
 *
 * @param pagePath - MongoDB page path.
 * @param fieldId - Puck block id.
 * @returns Stored response or null.
 */
export async function fetchMyFormFieldResponse(
  pagePath: string,
  fieldId: string,
): Promise<FormFieldUserResponseDto | null> {
  const params = new URLSearchParams({ path: pagePath, fieldId });
  const res = await fetch(`/api/pages/form-fields/mine?${params.toString()}`);
  if (!res.ok) {
    return null;
  }
  const payload = (await res.json()) as { response?: FormFieldUserResponseDto | null };
  return payload.response ?? null;
}

/**
 * Load author statistics for a form field (editors only).
 *
 * @param pagePath - MongoDB page path.
 * @param fieldId - Puck block id.
 * @returns Aggregate stats snapshot.
 */
export async function fetchFormFieldStats(
  pagePath: string,
  fieldId: string,
): Promise<FormFieldStatsResult> {
  const params = new URLSearchParams({ path: pagePath, fieldId });
  const res = await fetch(`/api/pages/form-fields/stats?${params.toString()}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Failed to load form statistics.");
  }
  const payload = (await res.json()) as { stats: FormFieldStatsResult };
  return payload.stats;
}
