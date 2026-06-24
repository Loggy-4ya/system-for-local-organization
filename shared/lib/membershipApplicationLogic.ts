/**
 * @fileoverview Pure helpers for self-government membership application state.
 *
 * Tests: `tests/shared/lib/membershipApplicationLogic.test.ts` — `npm run test:membership-application`
 *
 * @module shared/lib/membershipApplicationLogic
 */

import {
  buildProfileCompletenessSummary,
  isProfileReadyForMembershipApplication,
  type ProfileCompletenessSlice,
} from "@shared/lib/userProfileCompleteness";
import { isSelfGovernmentMember, isTeacherAccessApproved, isTeacherUser } from "@shared/lib/userSociumHelpers";

/** Serializable application status for the authenticated applicant. */
export interface MembershipApplicationStatusDto {
  /** Whether the user already holds a self-government socium role. */
  isMember: boolean;
  /** Whether the user has an active application intent flag. */
  hasActiveApplication: boolean;
  /** Profile prerequisites satisfied for submission. */
  readyForSubmission: boolean;
  /** Missing field labels when not ready. */
  missingFieldLabels: string[];
  /** Whether the applicant registered as a teacher. */
  isTeacherApplicant: boolean;
  /** Whether teacher access has been approved (always true for non-teachers). */
  teacherAccessApproved: boolean;
}

/**
 * Resolve membership application status from a profile slice.
 *
 * @param user - Profile completeness slice.
 * @returns Status DTO for profile UI and APIs.
 */
export function buildMembershipApplicationStatus(
  user: ProfileCompletenessSlice,
): MembershipApplicationStatusDto {
  const summary = buildProfileCompletenessSummary(user);

  return {
    isMember: summary.isSelfGovernmentMember,
    hasActiveApplication:
      Boolean(user.selfGovernmentApplicationIntent) && !summary.isSelfGovernmentMember,
    readyForSubmission: summary.readyForMembershipApplication,
    missingFieldLabels: summary.missingFieldLabels,
    isTeacherApplicant: summary.isTeacherApplicant,
    teacherAccessApproved: summary.teacherAccessApproved,
  };
}

/**
 * Whether a profile slice may submit a membership application.
 *
 * @param user - Profile completeness slice.
 * @returns True when not already a member and all required fields are present.
 */
export function canSubmitMembershipApplication(user: ProfileCompletenessSlice): boolean {
  if (isSelfGovernmentMember(user.sociumRoles ?? [])) {
    return false;
  }

  return isProfileReadyForMembershipApplication(user);
}
