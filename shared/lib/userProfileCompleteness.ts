/**
 * @fileoverview Profile completeness checks for self-government membership gating.
 *
 * Before applying for self-government membership, users must complete all
 * required profile fields (including phone and profile photo).
 *
 * Tests: `tests/shared/lib/userProfileCompleteness.test.ts` — `npm run test:profile-completeness`
 *
 * @module shared/lib/userProfileCompleteness
 */

import {
  isSelfGovernmentMember,
  isTeacherAccessApproved,
  isTeacherUser,
} from "@shared/lib/userSociumHelpers";
import type { IUserSociumRole } from "@shared/models/userTypes";
import { normalizePhoneInput } from "@shared/validation/phoneSchema";

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

/** Profile fields required for teacher access applications (no academic group/specialty). */
export const TEACHER_APPLICATION_REQUIRED_PROFILE_FIELDS: Exclude<
  ProfileCompletenessField,
  "telegram" | "specialty" | "group"
>[] = ["surname", "phone", "avatar"];

/**
 * Resolve required stored profile fields for an applicant based on socium role.
 *
 * @param user - Profile completeness slice.
 * @returns Field keys that must be filled before application submission.
 */
export function getMembershipApplicationRequiredFields(
  user: ProfileCompletenessSlice,
): Exclude<ProfileCompletenessField, "telegram">[] {
  if (isTeacherUser(user.sociumRoles)) {
    return [...TEACHER_APPLICATION_REQUIRED_PROFILE_FIELDS];
  }
  return [...MEMBERSHIP_APPLICATION_REQUIRED_PROFILE_FIELDS];
}

/**
 * Human-readable list of membership-application field labels for UI copy.
 *
 * @param user - Optional profile slice — teachers omit specialty and group labels.
 * @returns Comma-separated labels with a final "and" (Oxford-style for two+ items).
 */
export function listMembershipApplicationFieldLabels(user?: ProfileCompletenessSlice): string {
  const fields = user
    ? getMembershipApplicationRequiredFields(user)
    : MEMBERSHIP_APPLICATION_REQUIRED_FIELDS;
  const labels = fields.map((key) => PROFILE_FIELD_LABELS[key]);
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
}

/**
 * Temporary: when `false`, login and account creation must not require or prompt
 * for Telegram as part of self-government membership application.
 * Post-approval member Telegram gates (`telegramIsRequiredForUser`) are unchanged.
 */
export const TELEGRAM_REQUIRED_AT_MEMBERSHIP_APPLICATION = false;

/** Profile fields required to submit a student self-government membership application. */
export const MEMBERSHIP_APPLICATION_REQUIRED_FIELDS: ProfileCompletenessField[] = [
  ...MEMBERSHIP_APPLICATION_REQUIRED_PROFILE_FIELDS,
];

/** @deprecated Use {@link listMembershipApplicationFieldLabels} with a profile slice. */
export function listMembershipRequiredFieldLabels(): string {
  return listMembershipApplicationFieldLabels();
}

/** Signup / profile banner — fields required when applying for self-government. */
export const SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT =
  "All of the following are required to apply for self-government membership: surname, phone number, specialty, group, and profile photo.";

/** Teacher application requirements (no specialty or group). */
export const TEACHER_APPLICATION_REQUIREMENTS_HINT =
  "Teachers must complete surname, phone number, and profile photo before submitting an access application. Specialty and group are not required.";

/**
 * Resolve application requirements copy for the current user.
 *
 * @param user - Profile completeness slice.
 * @returns Human-readable requirements sentence.
 */
export function resolveMembershipApplicationRequirementsHint(
  user: ProfileCompletenessSlice,
): string {
  if (isTeacherUser(user.sociumRoles)) {
    return TEACHER_APPLICATION_REQUIREMENTS_HINT;
  }
  return `All of the following are required to apply for self-government membership: ${listMembershipApplicationFieldLabels(user)}.`;
}

/** Advisory for applicants — Telegram is enforced after approval, not at application time. */
export const SELF_GOVERNMENT_APPLICATION_TELEGRAM_ADVISORY =
  "Telegram is not required to apply. After your membership is approved you must connect Telegram before using member tools (tasks, task groups).";

/** Members without Telegram see this while browsing; member routes redirect to settings. */
export const SELF_GOVERNMENT_MEMBER_TELEGRAM_REQUIRED_HINT =
  "Link your Telegram account to unlock self-government member tools. Connect below — you cannot use tasks until Telegram is linked.";

/** Profile settings — members must keep application fields plus Telegram on file. */
export const SELF_GOVERNMENT_MEMBER_PROFILE_HINT =
  "Self-government members must keep a complete profile including phone, profile photo, and Telegram.";

/**
 * Resolve member profile maintenance hint for settings UI.
 *
 * @param user - Profile completeness slice.
 * @returns Hint text for required member fields.
 */
export function resolveSelfGovernmentMemberProfileHint(user: ProfileCompletenessSlice): string {
  if (isTeacherUser(user.sociumRoles)) {
    return "Teachers must keep surname, phone number, and profile photo on file.";
  }
  return `Self-government members must keep a complete profile: ${listMembershipApplicationFieldLabels(user)}, and ${PROFILE_FIELD_LABELS.telegram}.`;
}

/** Error when a single membership field is missing on submit. */
export function resolveSelfGovernmentApplicationFieldError(user: ProfileCompletenessSlice): string {
  return `Complete all required fields for your application: ${listMembershipApplicationFieldLabels(user)}.`;
}

/** @deprecated Use {@link resolveSelfGovernmentApplicationFieldError} with a profile slice. */
export const SELF_GOVERNMENT_APPLICATION_FIELD_ERROR =
  "Complete all required fields for self-government application.";

/** Per-field hint when the self-government application checkbox is active. */
export const SELF_GOVERNMENT_APPLICATION_FIELD_HINT =
  "Required for self-government application — see the requirements notice for the full list.";

/** Per-field hint when registering or applying as a teacher. */
export const TEACHER_APPLICATION_FIELD_HINT =
  "Required for teacher access application — specialty and group are not needed.";

/** Settings route for teacher access application workflow. */
export const TEACHER_ACCESS_APPLICATION_PATH = "/profile/membership";
export const PROFILE_PHONE_REQUIRED_ERROR = "Phone number is required for self-government members.";

/** Directory/API error code when admin save would leave a member without a required phone. */
export const PROFILE_PHONE_REQUIRED = "PROFILE_PHONE_REQUIRED";

/**
 * Whether a stored phone string contains dialable digits after normalization.
 *
 * @param phone - Raw phone from MongoDB or a form field.
 * @returns True when {@link normalizePhoneInput} yields a non-empty value.
 */
export function userHasDialablePhone(phone: string | null | undefined): boolean {
  return Boolean(normalizePhoneInput(phone ?? null));
}

/** Directory/API error code when admin save would clear a required profile photo. */
export const PROFILE_AVATAR_REQUIRED = "PROFILE_AVATAR_REQUIRED";

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
  /** Linked Telegram user id — required for self-government members (not applicants). */
  telegramId?: number | null;
  /** Whether teacher accounts passed institutional access review. */
  teacherAccessApproved?: boolean | null;
}

/** User slice for OAuth / Telegram onboarding gate evaluation. */
export interface ProfileOnboardingSlice extends ProfileCompletenessSlice {
  googleId?: string | null;
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
  return (
    userIsSelfGovernmentMember(user) ||
    (isTeacherUser(user.sociumRoles) && !isTeacherAccessApproved(user))
  );
}

/**
 * Build a profile completeness slice from a persisted user document.
 *
 * @param user - Mongoose user document or compatible shape.
 * @returns Slice for {@link phoneIsRequiredForUser} and related checks.
 */
export function profileCompletenessSliceFromUser(user: ProfileCompletenessSlice): ProfileCompletenessSlice {
  return {
    name: user.name,
    surname: user.surname,
    phone: user.phone,
    specialty: user.specialty,
    group: user.group,
    avatar: user.avatar,
    sociumRoles: user.sociumRoles ?? [],
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent ?? false,
  };
}

/**
 * Enforce phone/avatar requirements after admin directory mutations.
 *
 * @param user - Target user document after all in-memory patches.
 * @throws {@link PROFILE_PHONE_REQUIRED} or {@link PROFILE_AVATAR_REQUIRED}.
 */
export function assertDirectoryMemberProfileRequirements(user: ProfileCompletenessSlice): void {
  const slice = profileCompletenessSliceFromUser(user);
  if (phoneIsRequiredForUser(slice) && !userHasDialablePhone(slice.phone)) {
    throw new Error(PROFILE_PHONE_REQUIRED);
  }
  if (avatarIsRequiredForUser(slice) && !slice.avatar?.trim()) {
    throw new Error(PROFILE_AVATAR_REQUIRED);
  }
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
    Boolean(user.selfGovernmentApplicationIntent) ||
    (isTeacherUser(user.sociumRoles) && !isTeacherAccessApproved(user))
  );
}

/**
 * Whether signup must collect a profile photo before account creation.
 *
 * @param applyForSelfGovernment - Self-government application checkbox on signup.
 * @returns True when the signup form should block submit without a photo.
 */
export function avatarIsRequiredAtSignup(applyForSelfGovernment: boolean, isTeacher = false): boolean {
  return applyForSelfGovernment || isTeacher;
}

/**
 * Whether a linked Telegram account is mandatory for this user.
 *
 * Required only for current self-government members — not for membership applicants.
 *
 * @param user - Profile slice.
 * @returns True when Telegram must remain linked.
 */
export function telegramIsRequiredForUser(user: ProfileCompletenessSlice): boolean {
  return userIsSelfGovernmentMember(user);
}

/**
 * Whether signup must collect a Telegram connection before account creation.
 *
 * @param applyForSelfGovernment - Self-government application checkbox on signup.
 * @returns True when signup should block submit without Telegram.
 */
export function telegramIsRequiredAtSignup(applyForSelfGovernment: boolean): boolean {
  return applyForSelfGovernment && TELEGRAM_REQUIRED_AT_MEMBERSHIP_APPLICATION;
}

/**
 * Whether an active self-government member still needs to link Telegram.
 *
 * @param user - Profile slice with optional Telegram id.
 * @returns True when the member has no linked `telegramId`.
 */
export function memberNeedsTelegramLinkage(user: ProfileCompletenessSlice): boolean {
  return userIsSelfGovernmentMember(user) && !user.telegramId;
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
  const requiredFields = getMembershipApplicationRequiredFields(user);

  for (const field of requiredFields) {
    const value = user[field];
    if (field === "phone") {
      if (!userHasDialablePhone(typeof value === "string" ? value : null)) {
        gaps.push(field);
      }
      continue;
    }
    if (typeof value !== "string" || !value.trim()) {
      gaps.push(field);
    }
  }

  if (memberNeedsTelegramLinkage(user)) {
    gaps.push("telegram");
  }

  return gaps;
}

/**
 * Whether a self-government member must link Telegram before member tools.
 *
 * Applicants may browse freely; members without Telegram are redirected from
 * task surfaces and see a site-wide reminder banner.
 *
 * @param user - Profile slice with optional Telegram id.
 * @returns True when member Telegram onboarding redirect should run.
 */
export function userNeedsMemberTelegramOnboarding(user: ProfileCompletenessSlice): boolean {
  return memberNeedsTelegramLinkage(user);
}

/**
 * @deprecated Use {@link userNeedsMemberTelegramOnboarding} for Telegram gates.
 */
export function userNeedsSelfGovernmentProfileCompliance(
  user: ProfileCompletenessSlice,
): boolean {
  return userNeedsMemberTelegramOnboarding(user);
}

/**
 * Whether the user signed in via an external identity provider.
 *
 * @param user - Profile onboarding slice.
 * @returns True when Google or Telegram is linked.
 */
export function userHasExternalAuthIdentity(user: ProfileOnboardingSlice): boolean {
  return Boolean(user.googleId || user.telegramId);
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
 * Whether the membership readiness banner should appear on `/profile`.
 *
 * System administrators (hierarchy index 0), including the env seed admin, are exempt.
 *
 * @param accessLevelIndex - User hierarchy index.
 * @returns False for tier 0; true for all other tiers.
 */
export function shouldShowMembershipReadinessBanner(
  accessLevelIndex: number | null | undefined,
): boolean {
  return accessLevelIndex !== 0;
}

/**
 * Whether a teacher must complete profile fields or wait for approval before browsing.
 *
 * @param user - Profile completeness slice with socium roles and approval flag.
 * @returns True when the teacher access gate should run.
 */
export function userNeedsTeacherAccessGate(user: ProfileCompletenessSlice): boolean {
  if (!isTeacherUser(user.sociumRoles)) {
    return false;
  }
  return !isTeacherAccessApproved(user);
}

/**
 * Resolve redirect target for teachers blocked by the access gate.
 *
 * @param user - Profile completeness slice.
 * @returns Settings path when profile is incomplete, otherwise membership application path.
 */
export function resolveTeacherAccessGatePath(user: ProfileCompletenessSlice): string {
  if (!isProfileReadyForMembershipApplication(user)) {
    return "/profile/settings?onboarding=teacher";
  }
  return TEACHER_ACCESS_APPLICATION_PATH;
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
  isTeacherApplicant: boolean;
  teacherAccessApproved: boolean;
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
    isTeacherApplicant: isTeacherUser(user.sociumRoles),
    teacherAccessApproved: isTeacherAccessApproved(user),
  };
}
