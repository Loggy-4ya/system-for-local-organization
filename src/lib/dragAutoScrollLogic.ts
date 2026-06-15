/**
 * @fileoverview Edge auto-scroll helpers for pointer-driven drag surfaces.
 *
 * Tests: `tests/lib/dragAutoScrollLogic.test.ts` — `npm run test:drag-scroll`
 *
 * @module src/lib/dragAutoScrollLogic
 */

import { PUCK_CANVAS_INNER_SELECTOR } from "@/components/puck/lib/puckCanvasSelectors";

/** Distance from a scroll container edge where auto-scroll begins. */
export const DRAG_SCROLL_EDGE_PX = 72;

/** Minimum scroll delta per animation frame. */
export const DRAG_SCROLL_MIN_SPEED = 2;

/** Maximum scroll delta per animation frame. */
export const DRAG_SCROLL_MAX_SPEED = 18;

/** @deprecated Use {@link DRAG_SCROLL_EDGE_PX}. */
export const EDITOR_DRAG_SCROLL_EDGE_PX = DRAG_SCROLL_EDGE_PX;

/** @deprecated Use {@link DRAG_SCROLL_MIN_SPEED}. */
export const EDITOR_DRAG_SCROLL_MIN_SPEED = DRAG_SCROLL_MIN_SPEED;

/** @deprecated Use {@link DRAG_SCROLL_MAX_SPEED}. */
export const EDITOR_DRAG_SCROLL_MAX_SPEED = DRAG_SCROLL_MAX_SPEED;

/** Pointer coordinates for one drag auto-scroll frame. */
export interface DragAutoScrollInput {
  /** Pointer X in the parent window viewport. */
  clientX: number;
  /** Pointer Y in the parent window viewport. */
  clientY: number;
  /** Optional nested document (e.g. Puck preview iframe). */
  nestedDocument?: Document | null;
  /** Pointer X inside the nested document viewport. */
  nestedClientX?: number;
  /** Pointer Y inside the nested document viewport. */
  nestedClientY?: number;
}

/**
 * Linearly interpolate between two numbers.
 *
 * @param start - Value at amount `0`.
 * @param end - Value at amount `1`.
 * @param amount - Interpolation factor in `[0, 1]`.
 * @returns Interpolated value.
 */
export function lerpDragScrollSpeed(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

/** @deprecated Use {@link lerpDragScrollSpeed}. */
export const lerpEditorDragScrollSpeed = lerpDragScrollSpeed;

/**
 * Resolve the per-frame vertical scroll delta for a pointer near a container edge.
 *
 * @param clientY - Pointer Y in the same coordinate space as `bounds`.
 * @param bounds - Visible container bounds.
 * @returns Signed scroll delta (`negative` = up, `positive` = down, `0` = idle).
 */
export function resolveDragScrollDelta(
  clientY: number,
  bounds: Pick<DOMRect, "top" | "bottom">,
): number {
  const distanceFromTop = clientY - bounds.top;
  const distanceFromBottom = bounds.bottom - clientY;

  if (distanceFromTop >= 0 && distanceFromTop < DRAG_SCROLL_EDGE_PX) {
    const intensity = 1 - distanceFromTop / DRAG_SCROLL_EDGE_PX;
    return -lerpDragScrollSpeed(DRAG_SCROLL_MIN_SPEED, DRAG_SCROLL_MAX_SPEED, intensity);
  }

  if (distanceFromBottom >= 0 && distanceFromBottom < DRAG_SCROLL_EDGE_PX) {
    const intensity = 1 - distanceFromBottom / DRAG_SCROLL_EDGE_PX;
    return lerpDragScrollSpeed(DRAG_SCROLL_MIN_SPEED, DRAG_SCROLL_MAX_SPEED, intensity);
  }

  return 0;
}

/** @deprecated Use {@link resolveDragScrollDelta}. */
export const resolveEditorDragScrollDelta = resolveDragScrollDelta;

/**
 * Whether an element can scroll vertically.
 *
 * @param element - Candidate scroll container.
 * @returns `true` when the element has overflowed vertical content.
 */
export function isDragScrollableY(element: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(element);

  return (
    (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
    element.scrollHeight > element.clientHeight + 1
  );
}

/** @deprecated Use {@link isDragScrollableY}. */
export const isEditorDragScrollableY = isDragScrollableY;

/**
 * Scroll one element when the pointer rests near its top or bottom edge.
 *
 * @param element - Scroll container.
 * @param clientY - Pointer Y in viewport coordinates.
 * @returns `true` when the element scrolled this frame.
 */
export function scrollElementAtPointer(element: HTMLElement, clientY: number): boolean {
  const delta = resolveDragScrollDelta(clientY, element.getBoundingClientRect());

  if (delta === 0) {
    return false;
  }

  element.scrollTop += delta;
  return true;
}

/**
 * Scroll scrollable ancestors under a pointer inside one document.
 *
 * @param doc - Document used for hit testing.
 * @param clientX - Pointer X in that document's viewport coordinates.
 * @param clientY - Pointer Y in that document's viewport coordinates.
 * @returns `true` when at least one ancestor scrolled this frame.
 */
export function scrollDocumentAncestorsAtPointer(
  doc: Document,
  clientX: number,
  clientY: number,
): boolean {
  let didScroll = false;
  const visited = new Set<HTMLElement>();
  let node = doc.elementFromPoint(clientX, clientY) as HTMLElement | null;

  while (node) {
    if (!visited.has(node) && isDragScrollableY(node)) {
      visited.add(node);
      didScroll = scrollElementAtPointer(node, clientY) || didScroll;
    }

    node = node.parentElement;
  }

  return didScroll;
}

/**
 * Resolve common Puck editor scroll roots in the parent window.
 *
 * @returns Known scrollport/sidebar containers that should edge-scroll during drags.
 */
export function resolvePuckDragScrollRoots(): HTMLElement[] {
  if (typeof document === "undefined") {
    return [];
  }

  const selectors = [
    PUCK_CANVAS_INNER_SELECTOR,
    ".nexus-outline-plugin",
    '.Puck [class*="SidebarSection-content"]',
    '.Puck [class*="Drawer"]',
    '.Puck [class*="PuckCanvas_"]:not([class*="PuckCanvas-controls"]):not([class*="PuckCanvas-inner"]):not([class*="PuckCanvas-root"]):not([class*="PuckCanvas-loader"]):not([class*="PuckCanvas--fullScreen"])',
  ];

  const roots: HTMLElement[] = [];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement && isDragScrollableY(element)) {
      roots.push(element);
    }
  }

  return roots;
}

/**
 * Apply edge auto-scroll for one drag frame.
 *
 * @param input - Parent and optional nested pointer coordinates.
 * @returns `true` when at least one scroll container moved this frame.
 */
export function applyDragAutoScroll(input: DragAutoScrollInput): boolean {
  let didScroll = false;

  const viewportDelta = resolveDragScrollDelta(input.clientY, {
    top: 0,
    bottom: window.innerHeight,
  });

  if (viewportDelta !== 0) {
    window.scrollBy({ top: viewportDelta, left: 0, behavior: "auto" });
    didScroll = true;
  }

  didScroll =
    scrollDocumentAncestorsAtPointer(document, input.clientX, input.clientY) || didScroll;

  for (const root of resolvePuckDragScrollRoots()) {
    didScroll = scrollElementAtPointer(root, input.clientY) || didScroll;
  }

  if (
    input.nestedDocument &&
    input.nestedClientX !== undefined &&
    input.nestedClientY !== undefined
  ) {
    didScroll =
      scrollDocumentAncestorsAtPointer(
        input.nestedDocument,
        input.nestedClientX,
        input.nestedClientY,
      ) || didScroll;
  }

  return didScroll;
}

/**
 * Apply edge auto-scroll using parent-window coordinates only.
 *
 * @param clientX - Pointer X in the parent window viewport.
 * @param clientY - Pointer Y in the parent window viewport.
 * @returns `true` when at least one scroll container moved this frame.
 */
export function applyDragAutoScrollAtPointer(clientX: number, clientY: number): boolean {
  return applyDragAutoScroll({ clientX, clientY });
}

/** @deprecated Use {@link applyDragAutoScrollAtPointer}. */
export const applyEditorDragAutoScroll = applyDragAutoScrollAtPointer;

export default resolveDragScrollDelta;
