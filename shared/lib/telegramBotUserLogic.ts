/**
 * @fileoverview Pure helpers for Telegram bot user registration state.
 *
 * @module shared/lib/telegramBotUserLogic
 *
 * Tests: `npm run test:telegram-bot-user-logic`
 * Registry: `.ai/docs/testing.md`
 */

import {
  getOAuthOnboardingGaps,
  OAUTH_ONBOARDING_EXTRA_LABELS,
  PROFILE_FIELD_LABELS,
  userNeedsProfileOnboarding,
  type OAuthOnboardingField,
  type ProfileOnboardingSlice,
} from "@shared/lib/userProfileCompleteness";

/** How a Telegram sender maps to Nexus registration state. */
export type TelegramBotUserKind = "unknown" | "incomplete" | "ready";

/**
 * Classify a Telegram sender against a Nexus user row (if any).
 *
 * @param user - MongoDB user linked by `telegramId`, or null when not registered.
 * @returns Registration readiness kind.
 */
export function classifyTelegramBotUser(user: ProfileOnboardingSlice | null): TelegramBotUserKind {
  if (!user) return "unknown";
  if (userNeedsProfileOnboarding(user)) return "incomplete";
  return "ready";
}

/**
 * Human-readable comma-separated labels for missing onboarding fields.
 *
 * @param user - Profile onboarding slice with external identity linked.
 * @returns Labels suitable for bot prompt interpolation.
 */
export function formatTelegramBotMissingFieldLabels(user: ProfileOnboardingSlice): string {
  const gaps = getOAuthOnboardingGaps(user);
  if (gaps.length === 0) return "";

  return gaps
    .map((gap: OAuthOnboardingField) =>
      gap === "personalDataConsent"
        ? OAUTH_ONBOARDING_EXTRA_LABELS.personalDataConsent
        : PROFILE_FIELD_LABELS[gap],
    )
    .join(", ");
}

/**
 * Build a profile onboarding slice from a persisted user document.
 *
 * @param user - Mongoose user document or compatible lean object.
 * @returns Slice for completeness evaluation.
 */
export function profileOnboardingSliceFromTelegramUser(user: {
  name: string;
  surname?: string | null;
  phone?: string | null;
  specialty?: string | null;
  group?: string | null;
  avatar?: string | null;
  sociumRoles?: ProfileOnboardingSlice["sociumRoles"];
  selfGovernmentApplicationIntent?: boolean;
  telegramId?: number | null;
  googleId?: string | null;
  appleId?: string | null;
  personalDataConsentAt?: Date | null;
  teacherAccessApproved?: boolean | null;
}): ProfileOnboardingSlice {
  return {
    name: user.name,
    surname: user.surname ?? null,
    phone: user.phone ?? null,
    specialty: user.specialty ?? null,
    group: user.group ?? null,
    avatar: user.avatar ?? null,
    sociumRoles: user.sociumRoles ?? [],
    selfGovernmentApplicationIntent: user.selfGovernmentApplicationIntent ?? false,
    telegramId: user.telegramId ?? null,
    googleId: user.googleId ?? null,
    appleId: user.appleId ?? null,
    personalDataConsentAt: user.personalDataConsentAt ?? null,
    teacherAccessApproved: user.teacherAccessApproved ?? null,
  };
}
