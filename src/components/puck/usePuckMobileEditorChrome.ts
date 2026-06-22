"use client";

/**
 * @fileoverview Detect Puck editor compact layout (bottom rail + full-screen canvas).
 *
 * Compact mode follows the same `(max-width: 900px)` media query as `puck-editor.css`
 * via `useSyncExternalStore`, so window resize and DevTools device emulation stay aligned
 * with React mount mode (`_experimentalFullScreenCanvas`) — not `window.innerWidth` alone.
 *
 * Tests: `tests/puck/lib/compactEditorViewport.test.ts` — `npm run test:compact-editor-viewport`
 *
 * @module src/components/puck/usePuckMobileEditorChrome
 */

import { useSyncExternalStore } from "react";

/**
 * Viewport width at which Nexus switches to compact editor chrome
 * (bottom plugin rail, full-screen canvas, viewport FAB).
 */
export const PUCK_COMPACT_EDITOR_MAX_WIDTH = 900;

/**
 * Media query for compact editor chrome — viewport width ≤ {@link PUCK_COMPACT_EDITOR_MAX_WIDTH}.
 */
export const PUCK_COMPACT_EDITOR_MQ = `(max-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH}px)`;

/**
 * Inverse of compact — desktop side-by-side editor layout (≥901px).
 */
export const PUCK_DESKTOP_EDITOR_MQ = `(min-width: ${PUCK_COMPACT_EDITOR_MAX_WIDTH + 1}px)`;

/**
 * Upper bound of the tight-desktop band (901–960px) with minimal sidebars for canvas space.
 */
export const PUCK_TIGHT_DESKTOP_MAX_WIDTH = 960;

/**
 * Upper bound of the narrow-desktop band where sidebars shrink and the canvas is clamped.
 */
export const PUCK_NARROW_DESKTOP_MAX_WIDTH = 1023;

/** Media query for icon-only header chips (narrow desktop + compact). */
export const PUCK_ICON_ONLY_HEADER_MQ = `(max-width: ${PUCK_NARROW_DESKTOP_MAX_WIDTH}px)`;

/**
 * @deprecated Use {@link PUCK_COMPACT_EDITOR_MAX_WIDTH}.
 */
export const PUCK_MOBILE_EDITOR_MAX_WIDTH = PUCK_COMPACT_EDITOR_MAX_WIDTH;

/**
 * Whether the viewport should use compact editor chrome right now.
 *
 * Uses {@link PUCK_COMPACT_EDITOR_MQ} so results match CSS `@media` rules.
 *
 * @param target - Window to query; defaults to the current window.
 * @returns True when the compact editor media query matches.
 */
export function matchesCompactEditorViewport(target: Window = window): boolean {
  if (typeof target.matchMedia !== "function") {
    return false;
  }

  return target.matchMedia(PUCK_COMPACT_EDITOR_MQ).matches;
}

/**
 * Subscribe to compact editor viewport changes (media query, window, visual viewport).
 *
 * @param onStoreChange - Invalidation callback for `useSyncExternalStore`.
 * @returns Teardown function.
 */
export function subscribeCompactEditorViewport(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const media = window.matchMedia(PUCK_COMPACT_EDITOR_MQ);
  media.addEventListener("change", onStoreChange);
  window.addEventListener("resize", onStoreChange);
  window.visualViewport?.addEventListener("resize", onStoreChange);

  return () => {
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
    window.visualViewport?.removeEventListener("resize", onStoreChange);
  };
}

/**
 * Client snapshot for compact editor layout — mirrors {@link PUCK_COMPACT_EDITOR_MQ}.
 *
 * @returns True when compact chrome should be active.
 */
export function getCompactEditorViewportSnapshot(): boolean {
  return matchesCompactEditorViewport();
}

/**
 * SSR snapshot — desktop layout until the client reads the real media query.
 *
 * @returns False on the server.
 */
export function getCompactEditorViewportServerSnapshot(): boolean {
  return false;
}

/**
 * Whether the editor shell should use compact chrome (bottom rail, full-screen canvas).
 *
 * @returns True when {@link PUCK_COMPACT_EDITOR_MQ} matches.
 */
export function usePuckMobileEditorChrome(): boolean {
  return useSyncExternalStore(
    subscribeCompactEditorViewport,
    getCompactEditorViewportSnapshot,
    getCompactEditorViewportServerSnapshot,
  );
}

/**
 * Subscribe to icon-only header breakpoint changes.
 *
 * @param onStoreChange - Invalidation callback for `useSyncExternalStore`.
 * @returns Teardown function.
 */
export function subscribeIconOnlyEditorHeader(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const media = window.matchMedia(PUCK_ICON_ONLY_HEADER_MQ);
  media.addEventListener("change", onStoreChange);
  window.addEventListener("resize", onStoreChange);
  window.visualViewport?.addEventListener("resize", onStoreChange);

  return () => {
    media.removeEventListener("change", onStoreChange);
    window.removeEventListener("resize", onStoreChange);
    window.visualViewport?.removeEventListener("resize", onStoreChange);
  };
}

/**
 * Client snapshot for icon-only header toolbar chips.
 *
 * @returns True when viewport width is at most {@link PUCK_NARROW_DESKTOP_MAX_WIDTH}.
 */
export function getIconOnlyEditorHeaderSnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(PUCK_ICON_ONLY_HEADER_MQ).matches;
}

/**
 * Whether header toolbar chips should drop text labels (icon-only).
 *
 * Matches the narrow-desktop + compact breakpoints used in `puck-editor.css`.
 *
 * @returns True when viewport width is at most {@link PUCK_NARROW_DESKTOP_MAX_WIDTH}.
 */
export function useIconOnlyEditorHeader(): boolean {
  return useSyncExternalStore(
    subscribeIconOnlyEditorHeader,
    getIconOnlyEditorHeaderSnapshot,
    getCompactEditorViewportServerSnapshot,
  );
}

export default usePuckMobileEditorChrome;
