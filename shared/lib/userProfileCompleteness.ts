/**
 * @fileoverview Profile completeness checks for self-government membership gating.
 *
 * Before applying for self-government membership, users must complete all
 * required profile fields (including phone and profile photo).
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
  | "group"
  | "avatar"
  | "telegram";

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
  avatar: "Profile photo",
  telegram: "Telegram account",
};

/** Labels for OAuth onboarding-only requirements. */
export const OAUTH_ONBOARDING_EXTRA_LABELS: Record<ProfileOnboardingExtraField, string> = {
  personalDataConsent: "Personal data processing consent",
};

/** Stored profile fields required before a self-government membership application. */
export const MEMBERSHIP_APPLICATION_REQUIRED_PROFILE_FIELDS: Exclude<
  ProfileCompletenessField,
  "telegram"
>[] = ["surname", "phone", "specialty", "group", "avatar"];

/** @deprecated Use {@link MEMBERSHIP_APPLICATION_REQUIRED_PROFILE_FIELDS} plus Telegram linkage. */
export const MEMBERSHIP_APPLICATION_REQUIRED_FIELDS: ProfileCompletenessField[] = [
  ...MEMBERSHIP_APPLICATION_REQUIRED_PROFILE_FIELDS,
  "telegram",
];

/**
 * Human-readable list of membership-required fields for UI copy.
 *
 * @returns Comma-separated labels with a final "and" (Oxford-style for two+ items).
 */
export function listMembershipRequiredFieldLabels(): string {
  const labels = MEMBERSHIP_APPLICATION_REQUIRED_FIELDS.map((key) => PROFILE_FIELD_LABELS[key]);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/** Signup / profile banner — all fields required when applying for self-government. */
export const SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT = `All of the following are required to apply for self-government membership: ${listMembershipRequiredFieldLabels()}.`;

/** Per-field hint when the self-government application checkbox is active. */
export const SELF_GOVERNMENT_APPLICATION_FIELD_HINT =
  "Required for self-government application — see the requirements notice for the full list.";

/** Error when a single membership field is missing on submit. */
export const SELF_GOVERNMENT_APPLICATION_FIELD_ERROR = `Complete all required fields for self-government application: ${listMembershipRequiredFieldLabels()}.`;

/** Profile settings — members and applicants must keep the full set on file. */
export const SELF_GOVERNMENT_MEMBER_PROFILE_HINT = `Self-government members and applicants must keep a complete profile: ${listMembershipRequiredFieldLabels()}.`;

/** Minimal user slice for completeness evaluation. */
export interface ProfileCompletenessSlice {
  name: string;
  surname: string | null;
  phone: string | null;
  specialty: string | null;
  group: string | null;
  avatar?: string | null;
  sociumRoles: IUserSociumRole[];
  /** True when the user checked self-government application intent at signup. */
  selfGovernmentApplicationIntent?: boolean;
  /** Linked Telegram user id — required for self-government applicants and members. */
  telegramId?: number | null;
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
 * Whether a profile photo is mandatory for this user.
 *
 * Required for current self-government members and for users who declared
 * self-government application intent at signup.
 *
 * @param user - Profile slice.
 * @returns True when avatar must not be cleared.
 */
export function avatarIsRequiredForUser(user: ProfileCompletenessSlice): boolean {
  return (
    userIsSelfGovernmentMember(user) ||
    Boolean(user.selfGovernmentApplicationIntent)
  );
}

/**
 * Whether signup must collect a profile photo before account creation.
 *
 * @param applyForSelfGovernment - Self-government application checkbox on signup.
 * @returns True when the signup form should block submit without a photo.
 */
export function avatarIsRequiredAtSignup(applyForSelfGovernment: boolean): boolean {
  return applyForSelfGovernment;
}

/**
 * Whether a linked Telegram account is mandatory for this user.
 *
 * Required for current self-government members and for users who declared
 * self-government application intent at signup.
 *
 * @param user - Profile slice.
 * @returns True when Telegram must remain linked.
 */
export function telegramIsRequiredForUser(user: ProfileCompletenessSlice): boolean {
  return (
    userIsSelfGovernmentMember(user) ||
    Boolean(user.selfGovernmentApplicationIntent)
  );
}

/**
 * Whether signup must collect a Telegram connection before account creation.
 *
 * @param applyForSelfGovernment - Self-government application checkbox on signup.
 * @returns True when the signup form should block submit without Telegram.
 */
export function telegramIsRequiredAtSignup(applyForSelfGovernment: boolean): boolean {
  return applyForSelfGovernment;
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

  for (const field of MEMBERSHIP_APPLICATION_REQUIRED_PROFILE_FIELDS) {
    const value = user[field];
    if (typeof value !== "string" || !value.trim()) {
      gaps.push(field);
    }
  }

  if (telegramIsRequiredForUser(user) && !user.telegramId) {
    gaps.push("telegram");
  }

  return gaps;
}

/**
 * Whether a self-government applicant or member must finish profile compliance
 * (including Telegram linkage) before browsing the app.
 *
 * @param user - Profile slice with optional Telegram id.
 * @returns True when settings onboarding redirect should run.
 */
export function userNeedsSelfGovernmentProfileCompliance(
  user: ProfileCompletenessSlice,
): boolean {
  if (!telegramIsRequiredForUser(user)) {
    return false;
  }

  return getMembershipProfileGaps(user).length > 0;
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
  avatarRequired: boolean;
  telegramRequired: boolean;
  readyForMembershipApplication: boolean;
  missingFields: ProfileCompletenessField[];
  missingFieldLabels: string[];
} {
  const missingFields = getMembershipProfileGaps(user);
  return {
    isSelfGovernmentMember: userIsSelfGovernmentMember(user),
    phoneRequired: phoneIsRequiredForUser(user),
    avatarRequired: avatarIsRequiredForUser(user),
    telegramRequired: telegramIsRequiredForUser(user),
    readyForMembershipApplication: missingFields.length === 0,
    missingFields,
    missingFieldLabels: missingFields.map((key) => PROFILE_FIELD_LABELS[key]),
  };
}
