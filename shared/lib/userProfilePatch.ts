/**
 * @fileoverview Pure profile field mutation helper shared by self-service and admin edits.
 *
 * Tests: `tests/shared/domains/applyProfilePatchToUser.test.ts` — `npm run test:apply-profile-patch`
 *
 * @module shared/lib/userProfilePatch
 */

import { accessLevelForStarostaRegistration } from "@shared/lib/accessControlLogic";
import { phoneIsRequiredForUser, avatarIsRequiredForUser, SELF_GOVERNMENT_APPLICATION_FIELD_ERROR } from "@shared/lib/userProfileCompleteness";
import { applyStudentTitleSociumSync } from "@shared/lib/userSociumHelpers";
import type {
  IUser,
  IUserSocialLink,
  StudentTitle,
} from "@shared/models/User";
import { normalizePhoneInput } from "@shared/validation/phoneSchema";
import type { TaskReminderChannel } from "@shared/constants/taskSettings";
import { normalizeUserNotificationChannels } from "@shared/lib/userNotificationSettingsLogic";

/** Patch payload for profile settings updates. */
export interface ProfileUpdateInput {
  name?: string;
  surname?: string | null;
  specialty?: string | null;
  group?: string | null;
  studentTitle?: StudentTitle | null;
  avatar?: string | null;
  about?: string | null;
  socialLinks?: IUserSocialLink[];
  phone?: string | null;
  /** When true, records {@link IUser.personalDataConsentAt}. */
  personalDataConsent?: boolean;
  /** Preferred notification delivery channels. */
  notificationChannels?: TaskReminderChannel[];
  /** When true, records {@link IUser.webNotificationPromptAt}. */
  recordWebNotificationPrompt?: boolean;
}

/**
 * Apply editable profile fields to an in-memory user document.
 *
 * @param user - Target user document (mutated in place).
 * @param patch - Allowed profile fields.
 * @throws When phone is cleared for a self-government member who requires it.
 */
export function applyProfilePatchToUser(user: IUser, patch: ProfileUpdateInput): void {
  if (patch.name !== undefined) user.name = patch.name.trim();
  if (patch.surname !== undefined) user.surname = patch.surname?.trim() || null;
  if (patch.specialty !== undefined) user.specialty = patch.specialty?.trim() || null;
  if (patch.group !== undefined) user.group = patch.group?.trim() || null;
  if (patch.studentTitle !== undefined) {
    user.studentTitle = patch.studentTitle;
    applyStudentTitleSociumSync(user);
    if (patch.studentTitle === "Starosta") {
      user.accessLevelIndex = accessLevelForStarostaRegistration(user.accessLevelIndex);
    }
  }
  if (patch.avatar !== undefined) {
    const nextAvatar = patch.avatar?.trim() || null;
    const memberContext = {
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      specialty: user.specialty,
      group: user.group,
      avatar: user.avatar,
      sociumRoles: user.sociumRoles ?? [],
      selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent ?? false,
    };
    if (avatarIsRequiredForUser(memberContext) && !nextAvatar) {
      throw new Error(SELF_GOVERNMENT_APPLICATION_FIELD_ERROR);
    }
    user.avatar = nextAvatar;
  }
  if (patch.about !== undefined) user.about = patch.about?.trim() || null;
  if (patch.socialLinks !== undefined) user.socialLinks = patch.socialLinks;
  if (patch.phone !== undefined) {
    const nextPhone = normalizePhoneInput(patch.phone);
    const memberContext = {
      name: user.name,
      surname: user.surname,
      phone: user.phone,
      specialty: user.specialty,
      group: user.group,
      sociumRoles: user.sociumRoles ?? [],
    };
    if (phoneIsRequiredForUser(memberContext) && !nextPhone) {
      throw new Error("Phone number is required for self-government members.");
    }
    user.phone = nextPhone;
  }
  if (patch.personalDataConsent === true && !user.personalDataConsentAt) {
    user.personalDataConsentAt = new Date();
  }
  if (patch.notificationChannels !== undefined) {
    user.notificationChannels = normalizeUserNotificationChannels(patch.notificationChannels);
  }
  if (patch.recordWebNotificationPrompt === true && !user.webNotificationPromptAt) {
    user.webNotificationPromptAt = new Date();
  }
}
