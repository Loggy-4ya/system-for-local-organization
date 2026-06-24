/**
 * @fileoverview Pure helpers for TipTap `@` / `/` suggestion popup positioning and cleanup.
 *
 * Manual portals append to `document.body`; stale nodes at `(0, 0)` appear when
 * `clientRect()` is null during fast typing or editor teardown. These helpers
 * centralise fixed positioning, rect validation, and orphan portal removal.
 *
 * Tests: `npm run test:suggestion-portal-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module src/components/editor/lib/suggestionPortalLogic
 */

/** Minimum viewport coordinate magnitude treated as a real caret rect. */
const MIN_SUGGESTION_RECT_COORD = 0;

/** Vertical gap between the caret and the popup (px). */
export const SUGGESTION_PORTAL_OFFSET_Y = 6;

/** Viewport rect shape returned by TipTap `clientRect()`. */
export interface SuggestionClientRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Whether a DOMRect from TipTap's `clientRect()` is safe to position against.
 *
 * Rejects null rects and the common `(0, 0)` orphan case when the decoration
 * node is not yet mounted or was torn down mid-keystroke.
 *
 * @param rect - Caret or decoration bounding rect.
 * @returns True when the rect can be used for popup placement.
 */
export function isValidSuggestionClientRect(
  rect: SuggestionClientRect | null | undefined,
): rect is SuggestionClientRect {
  if (!rect) return false;
  const hasSize = rect.width > 0 || rect.height > 0;
  const isOriginCorner =
    rect.left <= MIN_SUGGESTION_RECT_COORD &&
    rect.top <= MIN_SUGGESTION_RECT_COORD &&
    rect.bottom <= MIN_SUGGESTION_RECT_COORD &&
    rect.right <= MIN_SUGGESTION_RECT_COORD;
  return hasSize || !isOriginCorner;
}

/**
 * Apply fixed viewport coordinates to a suggestion portal element.
 *
 * @param popup - Portal wrapper appended to `document.body`.
 * @param rect - Valid caret or decoration rect.
 */
export function applySuggestionPortalPosition(
  popup: HTMLElement,
  rect: SuggestionClientRect,
): void {
  popup.style.position = "fixed";
  popup.style.left = `${rect.left}px`;
  popup.style.top = `${rect.bottom + SUGGESTION_PORTAL_OFFSET_Y}px`;
  popup.style.visibility = "visible";
  popup.style.pointerEvents = "auto";
}

/**
 * Hide a portal until a valid caret rect is available.
 *
 * @param popup - Portal wrapper element.
 */
export function hideSuggestionPortalUntilPositioned(popup: HTMLElement): void {
  popup.style.visibility = "hidden";
  popup.style.pointerEvents = "none";
}

/**
 * Resolve the next popup position, reusing the last good rect when TipTap
 * briefly returns an invalid measurement between keystrokes.
 *
 * @param clientRect - TipTap `clientRect` callback.
 * @param lastValidRect - Previously applied rect for this popup session.
 * @returns Updated rect cache and whether placement succeeded.
 */
export function resolveSuggestionPortalRect(
  clientRect: (() => SuggestionClientRect | null) | null | undefined,
  lastValidRect: SuggestionClientRect | null,
): { rect: SuggestionClientRect | null; positioned: boolean } {
  const measured = clientRect?.() ?? null;
  if (isValidSuggestionClientRect(measured)) {
    return { rect: measured, positioned: true };
  }
  if (isValidSuggestionClientRect(lastValidRect)) {
    return { rect: lastValidRect, positioned: true };
  }
  return { rect: null, positioned: false };
}

/**
 * Remove orphaned suggestion portals from `document.body`.
 *
 * @param portalClassName - Portal wrapper class (e.g. `nexus-mention-suggestion-portal`).
 * @param except - Optional portal to keep (the active session).
 */
export function removeStaleSuggestionPortals(
  portalClassName: string,
  except?: HTMLElement | null,
): void {
  if (typeof document === "undefined") return;

  document.querySelectorAll<HTMLElement>(`.${portalClassName}`).forEach((node) => {
    if (except && node === except) return;
    node.remove();
  });
}
