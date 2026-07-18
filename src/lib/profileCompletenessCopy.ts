/**
 * @fileoverview Locale-aware profile completeness copy for web UI.
 *
 * Shared domain helpers in `userProfileCompleteness.ts` emit English labels for
 * tests, validation, and Telegram bots. Web surfaces import this module and pass
 * a `next-intl` translator scoped to `profile.completeness`.
 *
 * @module src/lib/profileCompletenessCopy
 */

import type {
  ProfileCompletenessField,
  ProfileCompletenessSlice,
  ProfileOnboardingExtraField,
} from "@shared/lib/userProfileCompleteness";
import { getMembershipApplicationRequiredFields } from "@shared/lib/userProfileCompleteness";
import { isTeacherUser } from "@shared/lib/userSociumHelpers";

/**
 * Minimal translator shape from `useTranslations` / `getTranslations`.
 *
 * Intentionally loose so next-intl's strict `Translator` remains assignable
 * under TypeScript's function parameter contravariance rules.
 */
export type ProfileCompletenessTranslator = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridge next-intl Translator
  key: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridge next-intl rich values
  values?: any,
) => string;

/**
 * Translate a stored profile field slug to a user-facing label.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param field - Canonical field key from {@link ProfileCompletenessField}.
 * @returns Localized field label.
 */
export function translateProfileCompletenessField(
  t: ProfileCompletenessTranslator,
  field: ProfileCompletenessField,
): string {
  return t(`fields.${field}`);
}

/**
 * Translate an OAuth onboarding extra requirement slug.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param field - Onboarding-only field key.
 * @returns Localized label.
 */
export function translateOnboardingExtraField(
  t: ProfileCompletenessTranslator,
  field: ProfileOnboardingExtraField,
): string {
  return t(`onboardingExtra.${field}`);
}

/**
 * Join field labels for inline requirement sentences.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param labels - Already-translated field labels.
 * @returns Comma-separated list with a locale-appropriate final conjunction.
 */
export function joinProfileFieldLabels(
  t: ProfileCompletenessTranslator,
  labels: string[],
): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) {
    return t("listTwo", { first: labels[0], second: labels[1] });
  }
  return t("listMany", {
    items: labels.slice(0, -1).join(", "),
    last: labels[labels.length - 1],
  });
}

/**
 * Translate membership profile gap keys for display lists.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param fields - Missing field keys.
 * @returns Localized labels in the same order.
 */
export function translateProfileCompletenessFields(
  t: ProfileCompletenessTranslator,
  fields: ProfileCompletenessField[],
): string[] {
  return fields.map((field) => translateProfileCompletenessField(t, field));
}

/**
 * Requirements banner for membership / teacher application flows.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param user - Profile slice determining teacher vs student field set.
 * @returns Full requirements sentence.
 */
export function membershipApplicationRequirementsCopy(
  t: ProfileCompletenessTranslator,
  user: ProfileCompletenessSlice,
): string {
  if (isTeacherUser(user.sociumRoles)) {
    return t("teacherRequirements");
  }

  const requiredKeys = getMembershipApplicationRequiredFields(user);
  const labels = requiredKeys.map((key) => translateProfileCompletenessField(t, key));
  return t("membershipRequirementsDynamic", {
    fields: joinProfileFieldLabels(t, labels),
  });
}

/**
 * Member profile maintenance hint on settings / readiness surfaces.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param user - Profile slice.
 * @returns Hint explaining required member fields.
 */
export function memberProfileMaintenanceCopy(
  t: ProfileCompletenessTranslator,
  user: ProfileCompletenessSlice,
): string {
  if (isTeacherUser(user.sociumRoles)) {
    return t("memberProfileHintTeacher");
  }

  const requiredKeys = getMembershipApplicationRequiredFields(user);
  const labels = requiredKeys.map((key) => translateProfileCompletenessField(t, key));
  return t("memberProfileHintDynamic", {
    fields: joinProfileFieldLabels(t, labels),
    telegram: translateProfileCompletenessField(t, "telegram"),
  });
}

/**
 * Avatar / signup validation error when application fields are incomplete.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param user - Profile slice.
 * @returns Error string for form-level feedback.
 */
export function membershipApplicationFieldErrorCopy(
  t: ProfileCompletenessTranslator,
  user: ProfileCompletenessSlice,
): string {
  const requiredKeys = getMembershipApplicationRequiredFields(user);
  const labels = requiredKeys.map((key) => translateProfileCompletenessField(t, key));
  return t("applicationFieldError", {
    fields: joinProfileFieldLabels(t, labels),
  });
}

/**
 * Comma-separated missing fields for compact inline display.
 *
 * @param t - Translator scoped to `profile.completeness`.
 * @param fields - Missing field keys.
 * @returns Labels joined with commas (no final conjunction).
 */
export function missingProfileFieldsInlineCopy(
  t: ProfileCompletenessTranslator,
  fields: ProfileCompletenessField[],
): string {
  return translateProfileCompletenessFields(t, fields).join(", ");
}
