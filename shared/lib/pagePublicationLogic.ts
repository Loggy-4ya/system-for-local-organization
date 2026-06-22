/**
 * @fileoverview Pure helpers for page publication visibility and scheduling.
 *
 * Tests: `npm run test:page-publication`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/pagePublicationLogic
 */

/** Minimal page slice for visibility checks. */
export interface PagePublicationSlice {
  published: boolean;
  publishAt?: Date | string | null;
}

/**
 * Normalise a publish-at value to a Date or null.
 *
 * @param value - ISO string, Date, or empty.
 * @returns Parsed date or null when unset/invalid.
 */
export function normalizePublishAt(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * Whether a page is visible to anonymous/public viewers right now.
 *
 * A page is public when `published` is true and `publishAt` is absent or in the past.
 *
 * @param page - Page publication fields.
 * @param now - Reference time (defaults to current instant).
 * @returns True when the page may be served on the public viewer route.
 */
export function isPagePubliclyVisible(
  page: PagePublicationSlice,
  now: Date = new Date(),
): boolean {
  if (!page.published) return false;
  const publishAt = normalizePublishAt(page.publishAt);
  if (!publishAt) return true;
  return publishAt.getTime() <= now.getTime();
}

/**
 * Resolve whether a save should mark the page published immediately.
 *
 * @param publishAt - Scheduled publish timestamp from editor (null = publish now).
 * @param now - Reference time.
 * @returns True when the page should be stored as `published: true` immediately.
 */
export function shouldPublishImmediately(
  publishAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  const normalized = normalizePublishAt(publishAt);
  if (!normalized) return true;
  return normalized.getTime() <= now.getTime();
}

/**
 * Build the idempotency key for a scheduled page publish event.
 *
 * @param pagePath - Normalised MongoDB page path.
 * @returns Stable scheduler idempotency key.
 */
export function publishPageIdempotencyKey(pagePath: string): string {
  return `publish_page:${pagePath}`;
}

/**
 * Combine a calendar date with an HH:mm time string in local wall-clock semantics.
 *
 * @param date - Calendar day (time portion ignored).
 * @param timeHHmm - Time as `HH:mm` or empty.
 * @returns Combined Date or null when date is missing.
 */
export function combineDateAndTime(date: Date | null, timeHHmm: string): Date | null {
  if (!date) return null;
  const [hoursRaw, minutesRaw] = timeHHmm.split(":");
  const hours = Number.parseInt(hoursRaw ?? "0", 10);
  const minutes = Number.parseInt(minutesRaw ?? "0", 10);
  const combined = new Date(date);
  combined.setHours(
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    0,
    0,
  );
  return combined;
}

/**
 * Format a Date as `HH:mm` for time inputs.
 *
 * @param date - Source instant.
 * @returns Zero-padded hours and minutes.
 */
export function formatTimeHHmm(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
