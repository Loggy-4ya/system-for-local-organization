/**
 * @fileoverview Client/server shared validation for User Directory save mutations.
 *
 * Computes the post-save profile slice from baseline row + edit state so the UI can
 * block self-government role saves that would leave a member without required phone/avatar.
 *
 * Tests: `tests/shared/lib/userDirectorySaveLogic.test.ts` — `npm run test:user-directory-save`
 *
 * @module shared/lib/userDirectorySaveLogic
 */

import {
  avatarIsRequiredForUser,
  userHasDialablePhone,
  PROFILE_PHONE_REQUIRED_ERROR,
  type ProfileCompletenessSlice,
} from "@shared/lib/userProfileCompleteness";
import {
  buildProfilePatchDelta,
  type UserDirectoryProfileEditState,
} from "@shared/lib/userDirectoryProfilePatch";
import { isSelfGovernmentMember } from "@shared/lib/userSociumHelpers";
import type { IUserSociumRole } from "@shared/models/userTypes";
import { DIRECTORY_ERROR_MESSAGES } from "@shared/validation/userDirectorySchemas";
import { normalizePhoneInput } from "@shared/validation/phoneSchema";

/** Inputs needed to evaluate profile requirements after a directory save. */
export interface DirectorySaveValidationInput {
  /** Target user given name. */
  name: string;
  /** Target user surname. */
  surname: string | null;
  /** Target user specialty. */
  specialty: string | null;
  /** Target user group. */
  group: string | null;
  /** Target user avatar URL. */
  avatar: string | null;
  /** Phone persisted on the loaded directory row (null when redacted or missing). */
  storedPhone: string | null;
  /** Current phone input when the actor may edit profile. */
  editPhone?: string;
  /** Live DOM phone input — used when React state lags browser autofill. */
  domPhone?: string;
  /** Socium roles after pending directory edits. */
  sociumRoles: IUserSociumRole[];
  /** Always-visible socium labels — used when role objects are redacted. */
  sociumRoleLabels: string[];
  /** When false, {@link DirectorySaveValidationInput.editPhone} is ignored. */
  canEditProfile: boolean;
}

/**
 * Resolve socium roles used for save-time profile requirement checks.
 *
 * @param input - Directory row plus pending editor state.
 * @returns Role list for completeness evaluation.
 */
export function resolveDirectoryEffectiveSociumRoles(input: {
  canAssignSocium: boolean;
  editSociumRoles: IUserSociumRole[];
  storedSociumRoles: IUserSociumRole[] | null;
}): IUserSociumRole[] {
  if (input.canAssignSocium) {
    return input.editSociumRoles;
  }
  return input.storedSociumRoles ?? [];
}

/**
 * Whether the target user holds (or is labeled as) a self-government socium role.
 *
 * @param input - Role objects and always-visible directory labels.
 * @returns True when phone is required for members.
 */
export function directoryRowRequiresMemberPhone(input: {
  sociumRoles: IUserSociumRole[];
  sociumRoleLabels: string[];
}): boolean {
  if (isSelfGovernmentMember(input.sociumRoles)) {
    return true;
  }

  return input.sociumRoleLabels.some((label) => /self[\s-]?government/i.test(label));
}

/**
 * Resolve the phone that would be stored after applying pending directory edits.
 *
 * Prefers normalized React state, then the live DOM value (autofill), then the stored row.
 *
 * @param input - Stored row phone and optional edit / DOM values.
 * @returns Normalized phone or null when undialable.
 */
export function resolveDirectoryPhoneForSave(input: {
  storedPhone: string | null;
  editPhone?: string;
  domPhone?: string;
  canEditProfile: boolean;
}): string | null {
  if (!input.canEditProfile) {
    return normalizePhoneInput(input.storedPhone);
  }

  const candidates = [input.editPhone, input.domPhone, input.storedPhone];
  for (const candidate of candidates) {
    if (typeof candidate !== "string" || !candidate.trim()) {
      continue;
    }
    const normalized = normalizePhoneInput(candidate);
    if (normalized) {
      return normalized;
    }
  }

  return null;
}

/**
 * Build the profile slice that would exist after applying pending directory edits.
 *
 * @param input - Baseline row plus controlled edit state.
 * @returns Slice for completeness requirement checks.
 */
export function buildDirectorySaveProfileSlice(
  input: DirectorySaveValidationInput,
): ProfileCompletenessSlice {
  const phone = resolveDirectoryPhoneForSave({
    storedPhone: input.storedPhone,
    editPhone: input.editPhone,
    domPhone: input.domPhone,
    canEditProfile: input.canEditProfile,
  });

  return {
    name: input.name,
    surname: input.surname,
    phone,
    specialty: input.specialty,
    group: input.group,
    avatar: input.avatar,
    sociumRoles: input.sociumRoles,
  };
}

/**
 * Field-level errors that would cause {@link AccessControlDomain.adminUpdateUser} to reject the save.
 *
 * @param input - Baseline row plus controlled edit state.
 * @returns Map of field key to human-readable message (empty when valid).
 */
export function validateDirectorySaveProfileRequirements(
  input: DirectorySaveValidationInput,
): Record<string, string> {
  const slice = buildDirectorySaveProfileSlice(input);
  const errors: Record<string, string> = {};

  const requiresPhone = directoryRowRequiresMemberPhone({
    sociumRoles: input.sociumRoles,
    sociumRoleLabels: input.sociumRoleLabels,
  });

  if (requiresPhone && !userHasDialablePhone(slice.phone)) {
    errors.phone = PROFILE_PHONE_REQUIRED_ERROR;
  }

  if (avatarIsRequiredForUser(slice) && !slice.avatar?.trim()) {
    errors.avatar = DIRECTORY_ERROR_MESSAGES.PROFILE_AVATAR_REQUIRED;
  }

  return errors;
}

/**
 * Build the profile portion of a directory PATCH, forcing phone when a member needs it on file.
 *
 * @param input - Profile edit state, baselines, and resolved dialable phone.
 * @returns Profile patch fields to merge into the admin update body.
 */
export function buildDirectoryProfileSavePatch(input: {
  profile: UserDirectoryProfileEditState;
  profileBaseline: UserDirectoryProfileEditState;
  storedPhone: string | null;
  resolvedPhone: string | null;
  requiresPhone: boolean;
}): Record<string, unknown> {
  const profileWithResolvedPhone: UserDirectoryProfileEditState = {
    ...input.profile,
    phone: input.resolvedPhone ?? input.profile.phone,
  };

  const patch = buildProfilePatchDelta(
    profileWithResolvedPhone,
    input.profileBaseline,
    input.storedPhone,
  );

  if (
    input.requiresPhone &&
    userHasDialablePhone(input.resolvedPhone) &&
    patch.phone === undefined
  ) {
    patch.phone = input.resolvedPhone;
  }

  return patch;
}

/** @deprecated Use {@link resolveDirectoryPhoneForSave}. */
export function resolveDirectoryEffectivePhone(input: {
  storedPhone: string | null;
  editPhone?: string;
  canEditProfile: boolean;
}): string | null {
  return resolveDirectoryPhoneForSave(input);
}
