/**
 * @fileoverview Cursor spotlight sync for the layout-level {@link InfiniteGrid}.
 *
 * The global `#nexus-bg` grid listens on the top-level document. Pointer events
 * inside the Puck preview iframe never bubble to the parent, so the iframe must
 * forward viewport coordinates explicitly.
 *
 * Tests: `tests/components/background/infiniteGridCursorSync.test.ts` — `npm run test:infinite-grid-cursor-sync`
 *
 * @module src/components/background/infiniteGridCursorSync
 */

/** DOM id for the layout-level InfiniteGrid wrapper in root `layout.tsx`. */
export const NEXUS_LAYOUT_GRID_ID = "nexus-bg";

/**
 * Update cursor spotlight CSS variables on a grid wrapper element.
 *
 * @param wrapper - InfiniteGrid wrapper hosting `--mouse-x` / `--mouse-y`.
 * @param clientX - Pointer X in the same viewport as the wrapper's window.
 * @param clientY - Pointer Y in the same viewport as the wrapper's window.
 */
export function syncInfiniteGridWrapperCursor(
  wrapper: HTMLElement,
  clientX: number,
  clientY: number,
): void {
  const rect = wrapper.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return;
  }

  const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
  const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
  const pctX = ((x / rect.width) * 100).toFixed(2);
  const pctY = ((y / rect.height) * 100).toFixed(2);
  wrapper.style.setProperty("--mouse-x", `${pctX}%`);
  wrapper.style.setProperty("--mouse-y", `${pctY}%`);
}

/**
 * Update cursor spotlight CSS variables on the global layout grid.
 *
 * @param clientX - Pointer X in the top-level viewport.
 * @param clientY - Pointer Y in the top-level viewport.
 * @param ownerWindow - Window hosting `#nexus-bg`; defaults to `window`.
 */
export function syncLayoutInfiniteGridCursor(
  clientX: number,
  clientY: number,
  ownerWindow: Window = window,
): void {
  if (typeof ownerWindow === "undefined") {
    return;
  }

  const wrapper = ownerWindow.document.getElementById(NEXUS_LAYOUT_GRID_ID) as HTMLElement | null;
  if (!wrapper) {
    return;
  }

  syncInfiniteGridWrapperCursor(wrapper, clientX, clientY);
}

/**
 * Map a pointer event from the Puck preview iframe to layout grid coordinates.
 *
 * @param event - Pointer event from the iframe document (hover only — ignores pressed buttons).
 * @param iframeDocument - Preview iframe document.
 */
export function syncLayoutInfiniteGridCursorFromPreviewIframe(
  event: Pick<PointerEvent, "clientX" | "clientY" | "buttons">,
  iframeDocument: Document,
): void {
  if (event.buttons !== 0) {
    return;
  }

  const iframeWindow = iframeDocument.defaultView;
  if (!iframeWindow?.parent || iframeWindow.parent === iframeWindow) {
    return;
  }

  const iframeEl = iframeWindow.frameElement as HTMLIFrameElement | null;
  if (!iframeEl) {
    return;
  }

  const frameRect = iframeEl.getBoundingClientRect();
  syncLayoutInfiniteGridCursor(
    frameRect.left + event.clientX,
    frameRect.top + event.clientY,
    iframeWindow.parent,
  );
}
