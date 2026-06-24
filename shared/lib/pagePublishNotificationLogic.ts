/**
 * @fileoverview Pure helpers for page go-live user notifications.
 *
 * Tests: `npm run test:page-publish-notification`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pagePublishNotificationLogic
 */

import { isPagePubliclyVisible, type PagePublicationSlice } from "@shared/lib/pagePublicationLogic";
import { interpolateTelegramMessageTemplate } from "@shared/constants/generalRules";

/** Default when editors do not set {@link PageGoLiveNotificationSnapshot.notifyOnPublish}. */
export const DEFAULT_PAGE_NOTIFY_ON_PUBLISH = true;

/** Default when page-level web inbox fan-out is enabled. */
export const DEFAULT_PAGE_NOTIFY_WEB_ON_PUBLISH = true;

/** Default when page-level Telegram DM fan-out is enabled. */
export const DEFAULT_PAGE_NOTIFY_TELEGRAM_ON_PUBLISH = true;

/** Inputs required to decide whether go-live notifications should fire. */
export interface PageGoLiveNotificationDecisionInput {
  /** Whether the editor enabled member notifications for this publish. */
  notifyOnPublish: boolean;
  /** Page publication fields before the save or scheduler fire. */
  priorPublication: PagePublicationSlice;
}

/** Page snapshot passed to the async dispatcher after go-live. */
export interface PageGoLiveNotificationSnapshot {
  /** Normalised public path (`/news/…`). */
  path: string;
  /** Human-readable page title. */
  title: string;
  /** Short description for inbox/Telegram body fallback. */
  description: string;
  /** Whether the editor opted in to member notifications. */
  notifyOnPublish: boolean;
  /** When master notify is on, whether web inbox rows should be written. */
  notifyWebOnPublish: boolean;
  /** When master notify is on, whether Telegram DMs should be sent. */
  notifyTelegramOnPublish: boolean;
  /** Page author Mongo id — excluded from member go-live fan-out. */
  authorUserId: string | null;
}

/**
 * Whether a page was publicly visible before a publish or scheduler mutation.
 *
 * @param priorPublication - Prior `published` / `publishAt` fields.
 * @param now - Reference instant.
 * @returns True when anonymous viewers could already open the page.
 */
export function wasPagePubliclyVisibleBefore(
  priorPublication: PagePublicationSlice,
  now: Date = new Date(),
): boolean {
  return isPagePubliclyVisible(priorPublication, now);
}

/**
 * Whether member notifications should fire for this go-live transition.
 *
 * Notifies only on the first public go-live when the editor left notifications enabled.
 * Republishing an already-live page or saving a draft does not qualify.
 *
 * @param input - Opt-in flag and prior publication slice.
 * @param now - Reference instant.
 * @returns True when inbox/Telegram fan-out should run.
 */
export function shouldDispatchPageGoLiveNotifications(
  input: PageGoLiveNotificationDecisionInput,
  now: Date = new Date(),
): boolean {
  if (!input.notifyOnPublish) return false;
  return !wasPagePubliclyVisibleBefore(input.priorPublication, now);
}

/**
 * Resolve the persisted notify-on-publish flag from editor input and stored page.
 *
 * @param editorValue - Value from Puck `pagePublication.notifyOnPublish`.
 * @param storedValue - Existing MongoDB field when the editor omits the key.
 * @returns Normalised opt-in flag.
 */
export function resolvePageNotifyOnPublish(
  editorValue: boolean | undefined,
  storedValue: boolean | undefined,
): boolean {
  if (editorValue !== undefined) return editorValue;
  if (storedValue !== undefined) return storedValue;
  return DEFAULT_PAGE_NOTIFY_ON_PUBLISH;
}

/**
 * Resolve whether web inbox notifications are enabled for this page go-live.
 *
 * Channel flags are ignored when the master {@link notifyOnPublish} switch is off.
 *
 * @param editorValue - Value from Puck `pagePublication.notifyWebOnPublish`.
 * @param storedValue - Existing MongoDB field when the editor omits the key.
 * @param masterEnabled - Resolved master notify flag for this save.
 * @returns Normalised web channel flag.
 */
export function resolvePageNotifyWebOnPublish(
  editorValue: boolean | undefined,
  storedValue: boolean | undefined,
  masterEnabled: boolean,
): boolean {
  if (!masterEnabled) return false;
  if (editorValue !== undefined) return editorValue;
  if (storedValue !== undefined) return storedValue;
  return DEFAULT_PAGE_NOTIFY_WEB_ON_PUBLISH;
}

/**
 * Resolve whether Telegram DM notifications are enabled for this page go-live.
 *
 * @param editorValue - Value from Puck `pagePublication.notifyTelegramOnPublish`.
 * @param storedValue - Existing MongoDB field when the editor omits the key.
 * @param masterEnabled - Resolved master notify flag for this save.
 * @returns Normalised Telegram channel flag.
 */
export function resolvePageNotifyTelegramOnPublish(
  editorValue: boolean | undefined,
  storedValue: boolean | undefined,
  masterEnabled: boolean,
): boolean {
  if (!masterEnabled) return false;
  if (editorValue !== undefined) return editorValue;
  if (storedValue !== undefined) return storedValue;
  return DEFAULT_PAGE_NOTIFY_TELEGRAM_ON_PUBLISH;
}

/**
 * Build a live Telegram DM preview for the page go-live template.
 *
 * @param template - Institutional `pagePublishedAnnouncement` template.
 * @param title - Page title from publication settings.
 * @param description - Page summary from publication settings.
 * @param pageUrl - Absolute or relative open link.
 * @returns Interpolated plain-text preview.
 */
export function buildPagePublishTelegramPreview(
  template: string,
  title: string,
  description: string,
  pageUrl: string,
): string {
  const { title: headline, body } = buildPagePublishNotificationCopy(title, description);
  return interpolateTelegramMessageTemplate(template, {
    title: headline.trim(),
    body: body.trim(),
    url: pageUrl.trim(),
  });
}

/**
 * Build inbox/Telegram copy for a newly published page.
 *
 * @param title - Page title.
 * @param description - Optional summary from publication metadata.
 * @returns Headline and supporting body text.
 */
export function buildPagePublishNotificationCopy(
  title: string,
  description: string,
): { title: string; body: string } {
  const trimmedTitle = title.trim() || "New page";
  const trimmedDescription = description.trim();

  return {
    title: `New page: ${trimmedTitle}`,
    body: trimmedDescription || "A new page is available on Nexus.",
  };
}

/**
 * Build an absolute page URL for deep links and Telegram messages.
 *
 * @param baseUrl - Site origin without trailing slash (`NEXTAUTH_URL`).
 * @param path - Normalised page path.
 * @returns Absolute URL when base is present, otherwise the path.
 */
export function buildPagePublishActionHref(baseUrl: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const trimmedBase = baseUrl.trim().replace(/\/$/, "");
  return trimmedBase ? `${trimmedBase}${normalizedPath}` : normalizedPath;
}

/**
 * Whether a user should receive the institution-wide page go-live notification.
 *
 * The page author is excluded — they already published the page.
 *
 * @param userId - Candidate recipient Mongo id.
 * @param authorUserId - Page author Mongo id, if known.
 * @returns True when the user should be notified.
 */
export function shouldReceivePageGoLiveNotification(
  userId: string,
  authorUserId: string | null | undefined,
): boolean {
  const author = authorUserId?.trim() ?? "";
  if (!author) return true;
  return userId.trim() !== author;
}
