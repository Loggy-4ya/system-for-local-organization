/**
 * @fileoverview Profile completeness checks for self-government membership gating.
 *
 * Before applying for self-government membership, users must complete all
 * required profile fields (including phone).
 *
 * Tests: `tests/shared/lib/userProfileCompleteness.test.ts` — `npm run test:profile-completeness`
 *
 * Also powers the OAuth onboarding gate (`userNeedsProfileOnboarding`).
 *
 * @module shared/lib/userProfileCompleteness
 */

import { isSelfGovernmentMember } from "@shared/lib/userSociumHelpers";
import type { IUserSociumRole } from "@shared/models/userTypes";

/** Profile field keys tracked for membership readiness. */
export type ProfileCompletenessField =
  | "surname"
  | "phone"
  | "specialty"
  | "group";

/** Additional onboarding-only requirement (consent checkbox, not a stored string field). */
export type ProfileOnboardingExtraField = "personalDataConsent";

/** All tracked gaps for OAuth / Telegram first-time profile completion. */
export type OAuthOnboardingField = ProfileCompletenessField | ProfileOnboardingExtraField;

/** Human-readable labels for missing-field UI. */
export const PROFILE_FIELD_LABELS: Record<ProfileCompletenessField, string> = {
  surname: "Surname",
  phone: "Phone number",
  specialty: "Specialty",
  group: "Group",
};

/** Labels for OAuth onboarding-only requirements. */
export const OAUTH_ONBOARDING_EXTRA_LABELS: Record<ProfileOnboardingExtraField, string> = {
  personalDataConsent: "Personal data processing consent",
};

/** Fields required before a self-government membership application. */
export const MEMBERSHIP_APPLICATION_REQUIRED_FIELDS: ProfileCompletenessField[] = [
  "surname",
  "phone",
  "specialty",
  "group",
];

/** Minimal user slice for completeness evaluation. */
export interface ProfileCompletenessSlice {
  name: string;
  surname: string | null;
  phone: string | null;
  specialty: string | null;
  group: string | null;
  sociumRoles: IUserSociumRole[];
}

/** User slice for OAuth / Telegram onboarding gate evaluation. */
export interface ProfileOnboardingSlice extends ProfileCompletenessSlice {
  googleId?: string | null;
  appleId?: string | null;
  telegramId?: number | null;
  personalDataConsentAt?: Date | null;
}

/**
 * Whether the user already holds a self-government socium role.
 *
 * @param user - Profile slice with socium roles.
 * @returns True for member, head, or deputy.
 */
export function userIsSelfGovernmentMember(user: ProfileCompletenessSlice): boolean {
  return isSelfGovernmentMember(user.sociumRoles);
}

/**
 * Whether phone is mandatory for this user.
 *
 * Required for current self-government members; strongly recommended for everyone else.
 *
 * @param user - Profile slice.
 * @returns True when phone must not be cleared.
 */
export function phoneIsRequiredForUser(user: ProfileCompletenessSlice): boolean {
  return userIsSelfGovernmentMember(user);
}

/**
 * List profile fields still empty for membership application.
 *
 * @param user - Profile slice.
 * @returns Missing field keys.
 */
export function getMembershipProfileGaps(
  user: ProfileCompletenessSlice,
): ProfileCompletenessField[] {
  const gaps: ProfileCompletenessField[] = [];

  if (!user.surname?.trim()) gaps.push("surname");
  if (!user.phone?.trim()) gaps.push("phone");
  if (!user.specialty?.trim()) gaps.push("specialty");
  if (!user.group?.trim()) gaps.push("group");

  return gaps;
}

/**
 * Whether the user signed in via an external identity provider.
 *
 * @param user - Profile onboarding slice.
 * @returns True when Google, Apple, or Telegram is linked.
 */
export function userHasExternalAuthIdentity(user: ProfileOnboardingSlice): boolean {
  return Boolean(user.googleId || user.appleId || user.telegramId);
}

/**
 * Profile field gaps required after OAuth / Telegram widget first sign-in.
 *
 * @param user - Profile onboarding slice.
 * @returns Missing stored field keys (excludes consent — use {@link userNeedsProfileOnboarding}).
 */
export function getOAuthOnboardingFieldGaps(
  user: ProfileCompletenessSlice,
): ProfileCompletenessField[] {
  return getMembershipProfileGaps(user);
}

/**
 * Full onboarding gap list including personal data consent when not yet recorded.
 *
 * @param user - Profile onboarding slice.
 * @returns Missing field keys for UI checklists.
 */
export function getOAuthOnboardingGaps(user: ProfileOnboardingSlice): OAuthOnboardingField[] {
  const gaps: OAuthOnboardingField[] = [...getOAuthOnboardingFieldGaps(user)];

  if (!user.personalDataConsentAt) {
    gaps.push("personalDataConsent");
  }

  return gaps;
}

/**
 * Whether an authenticated user must complete OAuth onboarding before browsing the app.
 *
 * Applies to accounts with a linked external identity and missing required fields
 * or missing {@link ProfileOnboardingSlice.personalDataConsentAt}.
 *
 * @param user - User document or public/onboarding slice.
 * @returns True when the onboarding settings gate should redirect.
 */
export function userNeedsProfileOnboarding(user: ProfileOnboardingSlice): boolean {
  if (!userHasExternalAuthIdentity(user)) {
    return false;
  }

  return getOAuthOnboardingGaps(user).length > 0;
}

/**
 * Whether the profile satisfies all membership application prerequisites.
 *
 * @param user - Profile slice.
 * @returns True when no required fields are missing.
 */
export function isProfileReadyForMembershipApplication(
  user: ProfileCompletenessSlice,
): boolean {
  return getMembershipProfileGaps(user).length === 0;
}

/**
 * Build a summary for API and profile UI.
 *
 * @param user - Profile slice.
 * @returns Completeness summary object.
 */
export function buildProfileCompletenessSummary(user: ProfileCompletenessSlice): {
  isSelfGovernmentMember: boolean;
  phoneRequired: boolean;
  readyForMembershipApplication: boolean;
  missingFields: ProfileCompletenessField[];
  missingFieldLabels: string[];
} {
  const missingFields = getMembershipProfileGaps(user);
  return {
    isSelfGovernmentMember: userIsSelfGovernmentMember(user),
    phoneRequired: phoneIsRequiredForUser(user),
    readyForMembershipApplication: missingFields.length === 0,
    missingFields,
    missingFieldLabels: missingFields.map((key) => PROFILE_FIELD_LABELS[key]),
  };
}
