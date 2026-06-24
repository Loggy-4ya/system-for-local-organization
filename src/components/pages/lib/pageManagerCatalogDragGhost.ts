/**
 * @fileoverview DOM drag ghost for Page Manager catalog card reordering.
 *
 * Keeps pointer-driven drag visuals out of React render hot paths (rAF updates).
 *
 * @module src/components/pages/lib/pageManagerCatalogDragGhost
 */

import { PAGE_CATALOG_DRAG_HORIZONTAL_MIN_WIDTH } from "@shared/constants/pageCatalogDisplay";
import type {
  PageManagerCatalogDragSource,
  PageManagerCatalogDragTarget,
} from "@shared/lib/pageManagerCatalogLogic";

/** Drag hover state used to resolve the ghost settle rect. */
interface CatalogPageDragTargetState {
  source: PageManagerCatalogDragSource;
  target: PageManagerCatalogDragTarget;
}

/** Active catalog card drag ghost session. */
export interface PageManagerCatalogDragGhostSession {
  /** Fixed-position clone following the pointer. */
  ghost: HTMLElement;
  /** Original card wrapper left in the grid as a placeholder. */
  sourceElement: HTMLElement;
  /** Pointer offset from the ghost's top-left corner. */
  offsetX: number;
  /** Pointer offset from the ghost's top-left corner. */
  offsetY: number;
  /** Pending rAF id, if any. */
  rafId: number | null;
  /** Latest pointer X queued for the next frame. */
  pendingX: number;
  /** Latest pointer Y queued for the next frame. */
  pendingY: number;
}

/** Options for {@link finishPageManagerCatalogDragGhost}. */
export interface FinishPageManagerCatalogDragGhostOptions {
  /** When set, the ghost eases into this rect before unmounting. */
  targetRect?: DOMRect | null;
  /** Called after the ghost element is removed from the document. */
  onComplete?: () => void;
}

const GHOST_SETTLE_MS = 360;
const GHOST_DISMISS_MS = 240;

/**
 * Whether catalog drag uses horizontal drop slots (matches `page-catalog.css`).
 *
 * @returns `true` on wide viewports.
 */
function catalogDragUsesHorizontalSlots(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(`(min-width: ${PAGE_CATALOG_DRAG_HORIZONTAL_MIN_WIDTH}px)`).matches;
}

/**
 * Position the ghost at viewport coordinates using GPU transforms.
 *
 * @param session - Active ghost session.
 * @param clientX - Pointer X in viewport space.
 * @param clientY - Pointer Y in viewport space.
 */
function positionPageManagerCatalogDragGhost(
  session: PageManagerCatalogDragGhostSession,
  clientX: number,
  clientY: number,
): void {
  const x = clientX - session.offsetX;
  const y = clientY - session.offsetY;
  session.ghost.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0) scale(1.02)`;
}

/**
 * Strip duplicate ids from a cloned subtree so accessibility trees stay valid.
 *
 * @param root - Cloned drag ghost root.
 */
function stripCloneIds(root: HTMLElement): void {
  root.removeAttribute("id");
  root.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
}

/**
 * Mount a floating clone of the dragged catalog card.
 *
 * @param sourceElement - Card wrapper element in the grid.
 * @param clientX - Pointer X when drag activates.
 * @param clientY - Pointer Y when drag activates.
 * @returns Active ghost session.
 */
export function beginPageManagerCatalogDragGhost(
  sourceElement: HTMLElement,
  clientX: number,
  clientY: number,
): PageManagerCatalogDragGhostSession {
  const rect = sourceElement.getBoundingClientRect();
  const ghost = sourceElement.cloneNode(true) as HTMLElement;

  stripCloneIds(ghost);
  ghost.setAttribute("aria-hidden", "true");
  ghost.classList.add("page-manager-catalog__drag-ghost");
  ghost.style.width = `${rect.width}px`;
  ghost.style.height = `${rect.height}px`;

  document.body.appendChild(ghost);

  const session: PageManagerCatalogDragGhostSession = {
    ghost,
    sourceElement,
    offsetX: clientX - rect.left,
    offsetY: clientY - rect.top,
    rafId: null,
    pendingX: clientX,
    pendingY: clientY,
  };

  positionPageManagerCatalogDragGhost(session, clientX, clientY);

  requestAnimationFrame(() => {
    ghost.classList.add("page-manager-catalog__drag-ghost--active");
  });

  return session;
}

/**
 * Queue a rAF-aligned ghost move for the current pointer position.
 *
 * @param session - Active ghost session.
 * @param clientX - Pointer X.
 * @param clientY - Pointer Y.
 */
export function updatePageManagerCatalogDragGhost(
  session: PageManagerCatalogDragGhostSession,
  clientX: number,
  clientY: number,
): void {
  session.pendingX = clientX;
  session.pendingY = clientY;

  if (session.rafId !== null) {
    return;
  }

  session.rafId = window.requestAnimationFrame(() => {
    session.rafId = null;
    positionPageManagerCatalogDragGhost(session, session.pendingX, session.pendingY);
  });
}

/**
 * Resolve the viewport rect the ghost should settle into on drop.
 *
 * @deprecated Prefer {@link settlePageManagerCatalogDragGhostToPage} after reorder.
 * @param dragState - Final drag target.
 * @param targetElement - Hovered card wrapper, when registered.
 * @returns Settle rect or null when unavailable.
 */
export function resolvePageManagerCatalogDropTargetRect(
  dragState: CatalogPageDragTargetState,
  targetElement: HTMLElement | null,
): DOMRect | null {
  if (!targetElement) {
    return null;
  }

  const rect = targetElement.getBoundingClientRect();
  const horizontal = catalogDragUsesHorizontalSlots();

  if (horizontal) {
    return rect;
  }

  if (dragState.target.position === "before") {
    return new DOMRect(rect.left, rect.top, rect.width, rect.height);
  }

  return new DOMRect(rect.left, rect.top, rect.width, rect.height);
}

/**
 * Tear down the drag ghost, optionally animating into the drop target first.
 *
 * @param session - Active session, if any.
 * @param options - Settle target and completion callback.
 */
export function finishPageManagerCatalogDragGhost(
  session: PageManagerCatalogDragGhostSession | null,
  options: FinishPageManagerCatalogDragGhostOptions = {},
): void {
  if (!session) {
    options.onComplete?.();
    return;
  }

  if (session.rafId !== null) {
    window.cancelAnimationFrame(session.rafId);
  }

  const removeGhost = () => {
    session.ghost.remove();
    options.onComplete?.();
  };

  if (options.targetRect) {
    const { left, top, width, height } = options.targetRect;

    session.ghost.classList.remove("page-manager-catalog__drag-ghost--active");
    void session.ghost.offsetHeight;

    session.ghost.classList.add("page-manager-catalog__drag-ghost--settling");
    session.ghost.style.width = `${width}px`;
    session.ghost.style.height = `${height}px`;

    window.requestAnimationFrame(() => {
      session.ghost.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0) scale(1)`;
    });

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      removeGhost();
    };

    session.ghost.addEventListener("transitionend", settle, { once: true });
    window.setTimeout(settle, GHOST_SETTLE_MS);
    return;
  }

  session.ghost.classList.add("page-manager-catalog__drag-ghost--dismiss");

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    removeGhost();
  };

  session.ghost.addEventListener("transitionend", dismiss, { once: true });
  window.setTimeout(dismiss, GHOST_DISMISS_MS);
}
