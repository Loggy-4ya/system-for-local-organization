/**
 * @fileoverview DOM helpers for Page Manager catalog drag preview + settle motion.
 *
 * @module src/components/pages/lib/pageManagerCatalogDragMotion
 */

import type { PageManagerCatalogPreviewShift } from "@shared/lib/pageManagerCatalogDragMotionLogic";
import type { PageManagerCatalogDragGhostSession } from "@/components/pages/lib/pageManagerCatalogDragGhost";

/** Registered catalog grid cell used for preview transforms. */
export interface RegisteredCatalogGridCell {
  /** Owning section id. */
  sectionId: string;
  /** Card index inside the section. */
  pageIndex: number;
  /** Grid cell element (`page-manager-catalog__grid-cell`). */
  element: HTMLElement;
}

/** Pending FLIP payload captured at pointer-up before React reorders the grid. */
export interface PendingCatalogDropFlip {
  /** Visual cell rects keyed by page path (includes preview transforms). */
  beforeRects: Map<string, DOMRect>;
  /** Ghost viewport rect at the moment of release. */
  ghostRect: DOMRect;
  /** Path of the card represented by the floating ghost. */
  movedPath: string;
  /** Ghost session to remove once the moved cell inherits its transform. */
  ghostSession: PageManagerCatalogDragGhostSession;
  /** Section ids whose cells participate in the drop FLIP. */
  affectedSectionIds: ReadonlySet<string>;
}

const DROP_MOTION_MS = 420;

/**
 * Read the stable page path from a catalog grid cell.
 *
 * @param cell - Grid cell element.
 * @returns Page path or null when unavailable.
 */
export function readCatalogGridCellPagePath(cell: HTMLElement): string | null {
  return (
    cell.querySelector<HTMLElement>("[data-catalog-page-path]")?.dataset.catalogPagePath ?? null
  );
}

/**
 * Capture current on-screen rects for catalog grid cells in the given sections.
 *
 * @param cells - Registered grid cells.
 * @param sectionIds - Sections participating in the drop.
 * @returns Map of page path → visual rect.
 */
export function captureCatalogGridVisualRects(
  cells: readonly RegisteredCatalogGridCell[],
  sectionIds: ReadonlySet<string>,
): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();

  for (const cell of cells) {
    if (!sectionIds.has(cell.sectionId)) {
      continue;
    }

    const pagePath = readCatalogGridCellPagePath(cell.element);
    if (!pagePath) {
      continue;
    }

    rects.set(pagePath, cell.element.getBoundingClientRect());
  }

  return rects;
}

/**
 * Apply one-frame preview transforms so sibling cards swap smoothly in the grid.
 *
 * @param cells - Registered grid cells for the active section.
 * @param shifts - Page index → shift direction.
 */
export function applyCatalogDragPreviewTransforms(
  cells: readonly RegisteredCatalogGridCell[],
  shifts: ReadonlyMap<number, PageManagerCatalogPreviewShift>,
): void {
  if (shifts.size === 0) {
    clearCatalogDragPreviewTransforms(cells);
    return;
  }

  const ordered = [...cells].sort((left, right) => left.pageIndex - right.pageIndex);
  const rects = ordered.map((cell) => cell.element.getBoundingClientRect());

  ordered.forEach((cell, orderedIndex) => {
    const shift = shifts.get(cell.pageIndex);
    if (!shift) {
      cell.element.style.transform = "";
      return;
    }

    const targetIndex = orderedIndex + shift;
    if (targetIndex < 0 || targetIndex >= ordered.length) {
      cell.element.style.transform = "";
      return;
    }

    const currentRect = rects[orderedIndex]!;
    const targetRect = rects[targetIndex]!;
    const dx = targetRect.left - currentRect.left;
    const dy = targetRect.top - currentRect.top;

    if (dx === 0 && dy === 0) {
      cell.element.style.transform = "";
      return;
    }

    cell.element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
  });
}

/**
 * Remove preview transforms from all registered grid cells.
 *
 * @param cells - Registered grid cells.
 * @param immediate - When true, skip transition while clearing (used on drop).
 */
export function clearCatalogDragPreviewTransforms(
  cells: readonly RegisteredCatalogGridCell[],
  immediate = false,
): void {
  for (const cell of cells) {
    if (immediate) {
      cell.element.style.transition = "none";
    }
    cell.element.style.transform = "";
    cell.element.style.zIndex = "";
    if (immediate) {
      void cell.element.offsetHeight;
      cell.element.style.transition = "";
    }
  }
}

/**
 * Apply FLIP inverts and play the drop animation, handing the ghost off to the moved cell.
 *
 * @param pending - Drop payload captured before React reorders the list.
 * @param cells - Registered grid cells after reorder.
 * @param onComplete - Called when motion finishes.
 */
export function commitCatalogDropMotion(
  pending: PendingCatalogDropFlip,
  cells: readonly RegisteredCatalogGridCell[],
  onComplete?: () => void,
): void {
  if (pending.ghostSession.rafId !== null) {
    window.cancelAnimationFrame(pending.ghostSession.rafId);
  }

  clearCatalogDragPreviewTransforms(cells, true);

  const sectionCells = cells.filter((cell) => pending.affectedSectionIds.has(cell.sectionId));
  const animated: HTMLElement[] = [];
  let movedCell: HTMLElement | null = null;

  for (const cell of sectionCells) {
    const pagePath = readCatalogGridCellPagePath(cell.element);
    if (!pagePath) {
      continue;
    }

    if (pagePath === pending.movedPath) {
      movedCell = cell.element;
      continue;
    }

    const before = pending.beforeRects.get(pagePath);
    if (!before) {
      continue;
    }

    const after = cell.element.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;

    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
      continue;
    }

    cell.element.style.transition = "none";
    cell.element.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    animated.push(cell.element);
  }

  if (movedCell) {
    const movedWrap =
      movedCell.querySelector<HTMLElement>("[data-catalog-page-path]") ?? movedCell;
    const after = movedWrap.getBoundingClientRect();
    const dx = pending.ghostRect.left - after.left;
    const dy = pending.ghostRect.top - after.top;

    movedWrap.style.transition = "none";
    movedWrap.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    movedWrap.style.zIndex = "60";
    animated.push(movedWrap);
  }

  pending.ghostSession.ghost.remove();

  if (animated.length > 0) {
    void animated[0]!.offsetHeight;
  }

  const finishMotion = () => {
    for (const element of animated) {
      element.style.transition = "";
      element.style.transform = "";
      element.style.zIndex = "";
    }
    onComplete?.();
  };

  if (animated.length === 0) {
    finishMotion();
    return;
  }

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      for (const element of animated) {
        element.style.transition = "";
        element.style.transform = "";
      }

      let completed = 0;
      const handleTransitionEnd = (event: TransitionEvent) => {
        if (event.propertyName !== "transform") {
          return;
        }

        completed += 1;
        if (completed < animated.length) {
          return;
        }

        for (const element of animated) {
          element.removeEventListener("transitionend", handleTransitionEnd);
        }
        finishMotion();
      };

      for (const element of animated) {
        element.addEventListener("transitionend", handleTransitionEnd);
      }

      window.setTimeout(finishMotion, DROP_MOTION_MS);
    });
  });
}

/** Duration used by drop FLIP motion (for CSS alignment). */
export const PAGE_MANAGER_CATALOG_DROP_MOTION_MS = DROP_MOTION_MS;
