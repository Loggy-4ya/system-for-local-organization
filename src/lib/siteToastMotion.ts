/**
 * @fileoverview Shared motion tokens for site notification toasts.
 *
 * Keep in sync with `site-toast-*` keyframes in `globals.css`.
 *
 * @module src/lib/siteToastMotion
 */

/** CSS `@keyframes` name for toast enter animation. */
export const SITE_TOAST_ENTER_ANIMATION = "site-toast-slide-in";

/** CSS `@keyframes` name for toast exit animation. */
export const SITE_TOAST_EXIT_ANIMATION = "site-toast-slide-out";

/** Enter animation duration in milliseconds (matches CSS). */
export const SITE_TOAST_ENTER_MS = 340;

/** Exit animation duration in milliseconds (matches CSS). */
export const SITE_TOAST_EXIT_MS = 280;

/** Default auto-dismiss delay for client toasts. */
export const SITE_TOAST_DEFAULT_AUTO_DISMISS_MS = 4_500;

/**
 * Whether a DOM `animationend` event belongs to the toast exit keyframe.
 *
 * @param event - Animation event from the toast root element.
 * @returns True when exit animation finished.
 */
export function isSiteToastExitAnimationEnd(event: AnimationEvent): boolean {
  return event.target === event.currentTarget && event.animationName === SITE_TOAST_EXIT_ANIMATION;
}
