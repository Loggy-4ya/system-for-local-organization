/**
 * @fileoverview Pure helpers for canvas drag-and-drop drop-target sizing during Edit mode.
 *
 * Used by {@link NexusCanvasDragCoordinator} to size overlay drop previews based on the
 * dragged block's placed dimensions without mutating live drop-zone layout.
 *
 * Tests: `npm run test:canvas-drop-target`, `npm run test:canvas-section-drop` — `tests/puck/lib/canvasDropTargetLogic.test.ts`, `tests/puck/lib/canvasSectionDropTarget.test.ts`
 *
 * @module src/components/puck/lib/canvasDropTargetLogic
 */

/** Recognized Nexus slot drop-zone surface kinds. */
export type CanvasSlotKind =
  | "grid-item"
  | "grid"
  | "carousel-slide"
  | "tab-panel"
  | "section"
  | "generic";

/** Input metrics for resolving drop-target preview dimensions. */
export interface CanvasDropTargetMetricsInput {
  /** Measured height of the block being dragged, in px. */
  draggedHeightPx: number;
  /** Measured width of the block being dragged, in px. */
  draggedWidthPx: number;
  /** Bounding height of the target slot container, in px. */
  containerHeightPx: number;
  /** Bounding width of the target slot container, in px. */
  containerWidthPx: number;
  /** Slot surface classification for future per-kind tuning. */
  slotKind: CanvasSlotKind;
  /** When true, the target zone has no committed children yet. */
  isEmptySlot: boolean;
  /** Sum of committed child heights when appending into an occupied slot. */
  occupiedChildrenHeightPx?: number;
}

/** Resolved CSS-friendly drop-target preview dimensions. */
export interface CanvasDropTargetMetrics {
  /** Pixel floor used for layout math. */
  minHeightPx: number;
  /** Width token applied to the drop zone (`100%` of container). */
  widthCss: string;
  /** Min-height token applied to the drop zone during drag hover. */
  minHeightCss: string;
}

/** Minimum usable drop-target height in px (matches empty grid cell floor). */
export const CANVAS_DROP_TARGET_MIN_PX = 80;

/** Fallback dragged height when the source node cannot be measured. */
export const CANVAS_DROP_TARGET_DEFAULT_DRAGGED_PX = 128;

/** Maximum allowed height for a canvas drop target preview in px. */
export const CANVAS_DROP_PREVIEW_MAX_PX = 4096;

/** Minimal element shape for pure hit-test unit tests (no DOM required). */
export interface CanvasHitTestNode {
  /** Space-separated class list. */
  className: string;
  /** Attribute presence map (`data-pnd-dragging` → `"true"`). */
  attributes: Readonly<Record<string, string>>;
  /** Parent node for drop-zone ancestry walks. */
  parent: CanvasHitTestNode | null;
}

/**
 * Coerce a hit-test node's `className` to a plain string.
 *
 * HTML elements expose a string; SVG nodes expose {@link SVGAnimatedString} with
 * `baseVal`. Unit-test mocks always pass a string.
 *
 * @param className - Raw `className` from DOM or mock node.
 * @returns Space-separated class list safe for `.includes` checks.
 */
export function normalizeHitTestClassName(
  className: string | SVGAnimatedString | unknown,
): string {
  if (typeof className === "string") {
    return className;
  }

  if (
    className &&
    typeof className === "object" &&
    "baseVal" in className &&
    typeof (className as SVGAnimatedString).baseVal === "string"
  ) {
    return (className as SVGAnimatedString).baseVal;
  }

  return "";
}

/** CSS class markers for Nexus slot drop zones (used by bridge + stylesheet). */
export const NEXUS_SLOT_DROPZONE_CLASS = {
  grid: "nexus-grid",
  gridItem: "nexus-grid-item",
  carouselSlide: "nexus-carousel__dropzone",
  tabPanel: "nexus-tabs__dropzone",
  section: "nexus-section__dropzone",
} as const;

/**
 * Whether a drop-zone element is a carousel slide slot surface.
 *
 * @param zone - Puck drop-zone element.
 * @returns True for `.nexus-carousel__dropzone` slots.
 */
export function isCarouselSlideDropZone(
  zone: Pick<Element, "classList" | "className">,
): boolean {
  if ("classList" in zone && zone.classList?.contains?.("nexus-carousel__dropzone")) {
    return true;
  }

  const className = "className" in zone ? String(zone.className) : "";
  return className.includes(NEXUS_SLOT_DROPZONE_CLASS.carouselSlide);
}

/**
 * Resolve the DOM element whose bounds represent a slot for overlay/hit-testing.
 *
 * Carousel slide drop zones can be taller than the visible slide card during drag;
 * anchor to `.nexus-carousel__slide` so highlights match WYSIWYG layout.
 *
 * @param dropZone - Puck drop-zone root element.
 * @returns Slide card element for carousel slots, otherwise the zone itself.
 */
export function resolveCanvasDropZoneMeasureElement(
  dropZone: Pick<Element, "closest" | "classList"> & Element,
): Element {
  if (typeof dropZone.closest === "function") {
    const className = "className" in dropZone ? String(dropZone.className) : "";

    if (
      dropZone.classList?.contains?.("nexus-grid-item") ||
      dropZone.classList?.contains?.("nexus-grid-item__dropzone") ||
      dropZone.classList?.contains?.("nexus-grid") ||
      className.includes(NEXUS_SLOT_DROPZONE_CLASS.gridItem) ||
      className.includes(NEXUS_SLOT_DROPZONE_CLASS.grid)
    ) {
      if (
        dropZone.classList?.contains?.("nexus-grid-item") ||
        dropZone.classList?.contains?.("nexus-grid-item__dropzone") ||
        className.includes(NEXUS_SLOT_DROPZONE_CLASS.gridItem)
      ) {
        const shell = dropZone.closest(".nexus-grid-item-shell");
        if (shell && typeof shell.getBoundingClientRect === "function") {
          return shell;
        }
      }

      return dropZone;
    }

    if (isCarouselSlideDropZone(dropZone)) {
      const slide = dropZone.closest(".nexus-carousel__slide");
      if (slide) {
        return slide;
      }
    }

    if (dropZone.classList.contains("nexus-section__dropzone")) {
      const glassShell = dropZone.closest(".glass-panel");
      if (glassShell && typeof glassShell.getBoundingClientRect === "function") {
        return glassShell;
      }

      const blockRoot = dropZone.closest("[data-puck-component]");
      if (blockRoot && typeof blockRoot.getBoundingClientRect === "function") {
        return blockRoot;
      }
    }
  }

  return dropZone;
}

/**
 * Read overlay/hit-test bounds for a drop zone (carousel slides use the slide card).
 *
 * @param dropZone - Puck drop-zone root element.
 * @returns Bounding rect in preview viewport coordinates.
 */
export function getCanvasDropZoneMeasureRect(dropZone: HTMLElement): DOMRect {
  return resolveCanvasDropZoneMeasureElement(dropZone).getBoundingClientRect();
}

/**
 * Whether a pointer lies inside a zone's measured slot bounds.
 *
 * @param zone - Puck drop-zone candidate.
 * @param clientX - Pointer X in preview viewport coordinates.
 * @param clientY - Pointer Y in preview viewport coordinates.
 * @returns True when the measured rect contains the point.
 */
export function canvasDropZoneContainsPointer(
  zone: HTMLElement,
  clientX: number,
  clientY: number,
): boolean {
  const rect = getCanvasDropZoneMeasureRect(zone);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    isPointInsideRect(rect, clientX, clientY)
  );
}

/**
 * Classify a drop-zone element by its Nexus slot marker class.
 *
 * @param className - Space-separated class list from the DOM element.
 * @returns Slot kind for metrics tuning.
 */
export function resolveCanvasSlotKind(className: string): CanvasSlotKind {
  if (className.includes(NEXUS_SLOT_DROPZONE_CLASS.gridItem)) {
    return "grid-item";
  }
  if (className.includes(NEXUS_SLOT_DROPZONE_CLASS.carouselSlide)) {
    return "carousel-slide";
  }
  if (className.includes(NEXUS_SLOT_DROPZONE_CLASS.tabPanel)) {
    return "tab-panel";
  }
  if (className.includes(NEXUS_SLOT_DROPZONE_CLASS.section)) {
    return "section";
  }
  if (className.includes(NEXUS_SLOT_DROPZONE_CLASS.grid)) {
    return "grid";
  }
  return "generic";
}

/**
 * Detect whether a hit-test stack entry is a drag ghost / overlay that should be skipped.
 *
 * Works with live DOM nodes and {@link CanvasHitTestNode} mocks in unit tests.
 *
 * @param element - Candidate element from `elementsFromPoint`.
 * @returns True when the node is part of the drag overlay, not a drop target surface.
 */
export function isCanvasDragGhostElement(
  element: {
    className: string | SVGAnimatedString | unknown;
    attributes: Readonly<Record<string, string>>;
  },
): boolean {
  if (element.attributes["data-puck-dropzone"] !== undefined) {
    return false;
  }

  const className = normalizeHitTestClassName(element.className);

  return (
    element.attributes["data-dnd-dragging"] !== undefined ||
    element.attributes["data-puck-dragging"] !== undefined ||
    className.includes("DrawerItem--isDragging")
  );
}

/**
 * Whether a node is a Puck slot drop zone.
 *
 * @param element - Candidate node from a hit-test walk.
 * @returns True when the node carries `data-puck-dropzone`.
 */
export function isCanvasDropZoneElement(
  element: Pick<CanvasHitTestNode, "attributes">,
): boolean {
  return element.attributes["data-puck-dropzone"] !== undefined;
}

/**
 * Count DOM depth from a node up to an optional root boundary.
 *
 * @param node - Drop-zone candidate.
 * @param root - Optional ancestor stop (exclusive).
 * @returns Number of parent hops to `root`.
 */
export function countCanvasDropZoneDepth<T extends CanvasHitTestNode>(
  node: T,
  root: T | null = null,
): number {
  let depth = 0;
  let current: CanvasHitTestNode | null = node;

  while (current && current !== root) {
    depth += 1;
    current = current.parent;
  }

  return depth;
}

/**
 * Pick the deepest nested drop zone from hit-test candidates.
 *
 * Prefers Puck destination/hover markers; otherwise chooses max DOM depth.
 *
 * @param candidates - Unique drop-zone nodes discovered under the pointer.
 * @param root - Optional root boundary for depth math in unit tests.
 * @returns Deepest viable drop zone, or null.
 */
export function pickDeepestDropZone<T extends CanvasHitTestNode>(
  candidates: readonly T[],
  root: T | null = null,
): T | null {
  if (candidates.length === 0) {
    return null;
  }

  const puckMarked = candidates.find(
    (el) =>
      el.className.includes("DropZone--isDestination") ||
      el.className.includes("DropZone--hoveringOverArea"),
  );

  if (puckMarked) {
    return puckMarked;
  }

  let deepest: T | null = null;
  let maxDepth = -1;

  for (const candidate of candidates) {
    const depth = countCanvasDropZoneDepth(candidate, root);
    if (depth > maxDepth) {
      maxDepth = depth;
      deepest = candidate;
    }
  }

  return deepest;
}

/**
 * Pick the best drop zone from an `elementsFromPoint` stack, skipping drag ghosts.
 *
 * Prefers zones Puck marks as hover/destination targets; otherwise picks the deepest
 * nested slot under the pointer.
 *
 * @param hits - Stack from topmost to bottommost (browser order).
 * @param root - Optional root boundary for parent walks (mock tests pass `null`).
 * @returns Resolved drop-zone node from the stack, or null.
 */
export function resolveDropZoneFromHitStack<T extends CanvasHitTestNode>(
  hits: readonly T[],
  root: T | null = null,
): T | null {
  const candidates = new Set<T>();

  for (const hit of hits) {
    if (isCanvasDragGhostElement(hit)) {
      continue;
    }

    let node: T | null = hit;
    while (node && node !== root) {
      if (isCanvasDropZoneElement(node)) {
        candidates.add(node);
      }
      node = node.parent as T | null;
    }
  }

  return pickDeepestDropZone(Array.from(candidates), root);
}

/**
 * Whether a value behaves like an HTMLElement for canvas hit-testing.
 *
 * @param node - Candidate DOM node from a preview document or test mock.
 * @returns True when attribute and layout APIs are available.
 */
function isCanvasHitTestElement(
  node: unknown,
): node is HTMLElement & { getAttribute: (name: string) => string | null; hasAttribute: (name: string) => boolean } {
  if (!node || typeof node !== "object") {
    return false;
  }

  const candidate = node as HTMLElement;
  return (
    typeof candidate.getAttribute === "function" &&
    typeof candidate.hasAttribute === "function"
  );
}

/**
 *
 * @param dropZone - Candidate drop zone.
 * @param draggedComponentId - Active drag source block id.
 * @param doc - Preview document used for lookup.
 * @returns True when the zone must be ignored.
 */
export function isDropZoneInsideDraggedComponent(
  dropZone: Element,
  draggedComponentId: string | null,
  doc: Document,
): boolean {
  if (!draggedComponentId) {
    return false;
  }

  const draggedEl = doc.querySelector(`[data-puck-component="${draggedComponentId}"]`);
  if (!(draggedEl instanceof HTMLElement)) {
    return false;
  }

  return draggedEl.contains(dropZone) && draggedEl !== dropZone;
}

/**
 * Measure DOM depth from an element to the document root for drop-zone ranking.
 *
 * @param element - Candidate drop zone or other node.
 * @param root - Document root boundary.
 * @returns Number of parent hops to `root`.
 */
export function measureCanvasElementDepth(
  element: Element,
  root: Element = element.ownerDocument?.documentElement ?? element,
): number {
  let depth = 0;
  let node: Element | null = element;

  while (node && node !== root) {
    depth += 1;
    node = node.parentElement;
  }

  return depth;
}

/**
 * Whether a viewport point lies inside an element's bounding box.
 *
 * @param rect - Element bounds.
 * @param clientX - Pointer X in the same viewport.
 * @param clientY - Pointer Y in the same viewport.
 * @returns True when the point is inside the rect.
 */
export function isPointInsideRect(
  rect: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  clientX: number,
  clientY: number,
): boolean {
  return (
    clientX >= rect.left &&
    clientX <= rect.right &&
    clientY >= rect.top &&
    clientY <= rect.bottom
  );
}

/**
 * Collect drop zones whose bounds contain the pointer (fallback when hit-test stack misses).
 *
 * @param doc - Preview document.
 * @param clientX - Pointer X in preview viewport coordinates.
 * @param clientY - Pointer Y in preview viewport coordinates.
 * @param draggedComponentId - Optional dragged block id to exclude self-nested zones.
 * @returns Drop zones containing the pointer.
 */
export function collectDropZonesContainingPoint(
  doc: Document,
  clientX: number,
  clientY: number,
  draggedComponentId: string | null = null,
): HTMLElement[] {
  const matches: HTMLElement[] = [];

  doc.querySelectorAll<HTMLElement>("[data-puck-dropzone]").forEach((zone) => {
    if (isDropZoneInsideDraggedComponent(zone, draggedComponentId, doc)) {
      return;
    }

    const rect = getCanvasDropZoneMeasureRect(zone);
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    if (isPointInsideRect(rect, clientX, clientY)) {
      matches.push(zone);
    }
  });

  return matches;
}

/**
 * Merge hit-test and geometry candidates, returning the deepest viable drop zone.
 *
 * @param hitCandidates - Zones discovered via `elementsFromPoint`.
 * @param geometryCandidates - Zones whose bounds contain the pointer.
 * @param root - Document root for depth ranking.
 * @returns Best drop zone or null.
 */
export function mergeCanvasDropZoneCandidates(
  hitCandidates: readonly HTMLElement[],
  geometryCandidates: readonly HTMLElement[],
  root: Element | null,
  clientX?: number,
  clientY?: number,
): HTMLElement | null {
  const merged = new Set<HTMLElement>([...hitCandidates, ...geometryCandidates]);

  if (merged.size === 0) {
    return null;
  }

  void root;

  const pointer =
    clientX !== undefined && clientY !== undefined
      ? { clientX, clientY }
      : null;

  return pickInnermostDropZone(Array.from(merged), pointer);
}

/**
 * Whether a zone compound key is the page root content area.
 *
 * @param zoneCompound - Puck zone compound key.
 * @returns True for `root:*` zones.
 */
export function isCanvasRootDropZone(zoneCompound: string): boolean {
  const containerId = zoneCompound.split(":")[0] ?? "";
  return containerId === "root";
}

/**
 * Whether a zone compound key refers to a nested slot (not page root).
 *
 * @param zoneCompound - Puck zone compound key.
 * @returns True for carousel slides, grid cells, sections, etc.
 */
export function isNestedCanvasDropZone(zoneCompound: string): boolean {
  return !isCanvasRootDropZone(zoneCompound);
}

/**
 * Compare two drop zones by DOM nesting and rendered area.
 *
 * @param candidate - Newly resolved drop zone.
 * @param current - Previously sticky drop zone.
 * @returns True when `candidate` is a more specific (inner) target than `current`.
 */
export function isCanvasDropZoneMoreSpecific(
  candidate: Pick<Element, "contains" | "getAttribute" | "getBoundingClientRect">,
  current: Pick<Element, "contains" | "getAttribute" | "getBoundingClientRect">,
): boolean {
  if (candidate !== current && current.contains(candidate as unknown as Node)) {
    return true;
  }

  if (candidate !== current && candidate.contains(current as unknown as Node)) {
    return false;
  }

  const candidateCompound = candidate.getAttribute("data-puck-dropzone") ?? "";
  const currentCompound = current.getAttribute("data-puck-dropzone") ?? "";
  const candidateNested = isNestedCanvasDropZone(candidateCompound);
  const currentNested = isNestedCanvasDropZone(currentCompound);

  if (candidateNested && !currentNested) {
    return true;
  }

  if (!candidateNested && currentNested) {
    return false;
  }

  const candidateRect = candidate.getBoundingClientRect();
  const currentRect = current.getBoundingClientRect();
  const candidateArea = candidateRect.width * candidateRect.height;
  const currentArea = currentRect.width * currentRect.height;

  if (candidateArea <= 0 || currentArea <= 0) {
    return candidateNested;
  }

  return candidateArea < currentArea;
}

/**
 * Decide whether a sticky nested target should win over a newly resolved zone.
 *
 * Prevents pointer-up coordinate glitches (parent-window coords, large drag ghosts)
 * from downgrading a carousel/grid slot back to the page root.
 *
 * @param stickyZone - Previously sticky drop-zone element.
 * @param stickyCompound - Sticky zone compound key.
 * @param nextZone - Newly resolved drop zone under the pointer.
 * @param nextCompound - New zone compound key.
 * @param clientX - Pointer X in preview viewport coordinates.
 * @param clientY - Pointer Y in preview viewport coordinates.
 * @returns True when the sticky nested slot should be kept.
 */
export function shouldKeepStickyDropTarget(
  stickyZone: Pick<Element, "contains" | "getAttribute" | "getBoundingClientRect">,
  stickyCompound: string,
  nextZone: Pick<Element, "contains" | "getAttribute" | "getBoundingClientRect">,
  nextCompound: string,
  clientX: number,
  clientY: number,
): boolean {
  if (stickyCompound === nextCompound) {
    return false;
  }

  if (areDistinctCarouselSlidesInSameCarousel(stickyCompound, nextCompound)) {
    return false;
  }

  if (!isNestedCanvasDropZone(stickyCompound)) {
    return false;
  }

  const stickyMeasure =
    "closest" in stickyZone
      ? resolveCanvasDropZoneMeasureElement(stickyZone as Element)
      : stickyZone;
  const stickyRect = stickyMeasure.getBoundingClientRect();
  if (!isPointInsideRect(stickyRect, clientX, clientY)) {
    return false;
  }

  if (
    stickyCompound !== nextCompound &&
    isNestedCanvasDropZone(nextCompound) &&
    "closest" in nextZone &&
    isCarouselSlideDropZone(nextZone as Element)
  ) {
    const nextMeasure = resolveCanvasDropZoneMeasureElement(nextZone as Element);
    const nextRect = nextMeasure.getBoundingClientRect();
    if (
      isPointInsideRect(nextRect, clientX, clientY) &&
      !isPointInsideRect(stickyRect, clientX, clientY)
    ) {
      return false;
    }
  }

  if (isCanvasRootDropZone(nextCompound)) {
    return true;
  }

  return !isCanvasDropZoneMoreSpecific(nextZone, stickyZone);
}

/** Minimal canvas drop target for release-target guard checks. */
export interface CanvasReleaseTargetRef {
  /** Destination zone compound key. */
  destinationZone: string;
  /** Destination index within the zone. */
  destinationIndex: number;
}

/** Minimal drag-start source for release-target guard checks. */
export interface CanvasReleaseTargetDragStart {
  /** Source zone compound key at drag start. */
  sourceZone: string;
}

/**
 * Whether a resolved drop target should replace the tracked release target.
 *
 * During pointer-move (`hover`), always accept so drags can leave nested slots (e.g.
 * carousel slide → page root). On pointer-up (`release`), reject snap-back glitches
 * where the drag ghost returns to the source zone or downgrades a nested hover target
 * to the page root.
 *
 * @param previous - Last release target from pointer-move hover (null when unset).
 * @param next - Newly resolved target from hit-testing.
 * @param dragStart - Source zone captured at drag start.
 * @param phase - `hover` during pointer-move; `release` on pointer-up.
 * @returns True when `next` should replace `previous`.
 */
export function shouldAcceptCanvasReleaseTargetUpdate(
  previous: CanvasReleaseTargetRef | null,
  next: CanvasReleaseTargetRef,
  dragStart: CanvasReleaseTargetDragStart | null,
  phase: "hover" | "release" = "release",
): boolean {
  void phase;

  if (!dragStart) {
    return true;
  }

  /**
   * Drag ghost crossed a neighbor slot then snapped back to the source zone
   * (pointer-move or pointer-up). Keep the last non-source hover target.
   */
  if (
    previous &&
    next.destinationZone === dragStart.sourceZone &&
    previous.destinationZone !== dragStart.sourceZone
  ) {
    return false;
  }

  if (phase === "release" && previous) {
    /**
     * Pointer-up resolved page root while hover had a nested slot (not the drag source).
     * Differs from a fast drag-out where `previous` is still the drag-start nested zone.
     */
    if (
      isNestedCanvasDropZone(previous.destinationZone) &&
      isCanvasRootDropZone(next.destinationZone) &&
      previous.destinationZone !== dragStart.sourceZone
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Whether hover hit-testing on the drag-start carousel slide should be ignored.
 *
 * Prevents release-target churn when the pointer crosses the source slide while
 * dragging toward a neighbor (overlay stays hidden; intended target unchanged).
 *
 * @param input - Live source zone, resolved zone, drop-zone classes, and phase.
 * @returns True when hover updates should be skipped.
 */
export function shouldSkipCarouselSourceSlideHoverUpdate(input: {
  /** Drag-start source zone compound key. */
  dragStartZone: string | null;
  /** Resolved zone compound under the pointer. */
  zoneCompound: string;
  /** CSS classes on the resolved drop zone element. */
  dropZoneClassName: string;
  /** Pointer event phase. */
  phase: "hover" | "release";
}): boolean {
  if (input.phase !== "hover" || !input.dragStartZone) {
    return false;
  }

  if (input.dragStartZone !== input.zoneCompound) {
    return false;
  }

  return resolveCanvasSlotKind(input.dropZoneClassName) === "carousel-slide";
}

/**
 * Keep only drop zones that are not DOM ancestors of another candidate.
 *
 * @param candidates - All discovered drop zones under the pointer.
 * @returns Innermost zones (nested slots beat page root wrappers).
 */
export function pickInnermostDropZone(
  candidates: readonly HTMLElement[],
  pointer: { clientX: number; clientY: number } | null = null,
): HTMLElement | null {
  if (candidates.length === 0) {
    return null;
  }

  const innermost = candidates.filter(
    (zone) => !candidates.some((other) => other !== zone && zone.contains(other)),
  );

  if (innermost.length === 0) {
    return null;
  }

  const nestedInnermost = innermost.filter(
    (zone) => !isCanvasRootDropZone(zone.getAttribute("data-puck-dropzone") ?? ""),
  );
  let pool = nestedInnermost.length > 0 ? nestedInnermost : innermost;

  if (pointer) {
    const pointerPool = pool.filter((zone) =>
      canvasDropZoneContainsPointer(zone, pointer.clientX, pointer.clientY),
    );
    if (pointerPool.length > 0) {
      pool = pointerPool;
    }
  }

  const puckMarked = pool.find(
    (el) =>
      el.className.includes("DropZone--isDestination") ||
      el.className.includes("DropZone--hoveringOverArea"),
  );

  if (puckMarked) {
    if (
      !pointer ||
      canvasDropZoneContainsPointer(puckMarked, pointer.clientX, pointer.clientY)
    ) {
      return puckMarked;
    }
  }

  if (pool.length === 1) {
    return pool[0] ?? null;
  }

  return pool.reduce((best, zone) => {
    const bestRect = getCanvasDropZoneMeasureRect(best);
    const zoneRect = getCanvasDropZoneMeasureRect(zone);
    const bestArea = bestRect.width * bestRect.height;
    const zoneArea = zoneRect.width * zoneRect.height;
    return zoneArea < bestArea ? zone : best;
  });
}

/** Resolved overlay rectangles for canvas drag preview. */
export interface CanvasDropOverlayRect {
  /** Top edge in preview viewport px. */
  top: number;
  /** Left edge in preview viewport px. */
  left: number;
  /** Width in px. */
  width: number;
  /** Height in px. */
  height: number;
}

/** Overlay layout for container outline + insertion ghost. */
export interface CanvasDropOverlayGeometry {
  /** When true, render a subtle full-container outline (root empty slots only). */
  showContainerOutline: boolean;
  /** Full slot container bounds. */
  container: CanvasDropOverlayRect;
  /** Clamped insertion footprint — never larger than the target slot. */
  ghost: CanvasDropOverlayRect;
}

/**
 * Resolve overlay geometry clamped to the target slot (no bleed over siblings).
 *
 * @param input - Target slot bounds and dragged block size.
 * @returns Container + ghost overlay rectangles.
 */
export function resolveCanvasDropOverlayGeometry(input: {
  /** Target slot bounding rect. */
  zoneRect: Pick<DOMRect, "top" | "left" | "width" | "height" | "bottom" | "right">;
  /** Measured dragged block height in px. */
  draggedHeightPx: number;
  /** When true, the slot has no committed children. */
  isEmpty: boolean;
  /** Sum of committed child heights when appending. */
  occupiedChildrenHeightPx: number;
  /** Whether the slot is the page root zone. */
  isRootZone: boolean;
  /** Slot surface kind — carousel empty slots fill the full slide card. */
  slotKind?: CanvasSlotKind;
  /** When true, carousel ghosts always fill the slide card (cross-slide drag). */
  fillEmptyCarouselSlot?: boolean;
  /** When true, clamp the ghost rect to the slot bounds. */
  clampGhostToZone?: boolean;
}): CanvasDropOverlayGeometry {
  const {
    zoneRect,
    draggedHeightPx,
    isEmpty,
    occupiedChildrenHeightPx,
    isRootZone,
    slotKind = "generic",
  } = input;

  const safeDragged = Math.max(
    Number.isFinite(draggedHeightPx) && draggedHeightPx > 0
      ? draggedHeightPx
      : CANVAS_DROP_TARGET_DEFAULT_DRAGGED_PX,
    CANVAS_DROP_TARGET_MIN_PX,
  );

  const container: CanvasDropOverlayRect = {
    top: zoneRect.top,
    left: zoneRect.left,
    width: zoneRect.width,
    height: zoneRect.height,
  };

  const fillCarouselSlot =
    slotKind === "carousel-slide" && (isEmpty || input.fillEmptyCarouselSlot === true);

  const ghostTop = fillCarouselSlot
    ? zoneRect.top
    : isEmpty
      ? zoneRect.top
      : zoneRect.top + Math.max(occupiedChildrenHeightPx, 0);
  const availableHeight = fillCarouselSlot
    ? zoneRect.height
    : isEmpty
      ? zoneRect.height
      : Math.max(zoneRect.bottom - ghostTop, CANVAS_DROP_TARGET_MIN_PX);

  const ghostHeight = fillCarouselSlot
    ? zoneRect.height
    : Math.min(safeDragged, availableHeight);

  let ghost: CanvasDropOverlayRect = {
    top: ghostTop,
    left: zoneRect.left,
    width: zoneRect.width,
    height: ghostHeight,
  };

  if (input.clampGhostToZone) {
    ghost = clampCanvasOverlayRectToZone(ghost, zoneRect);
  }

  return {
    showContainerOutline:
      (isRootZone && isEmpty) || slotKind === "section" || slotKind === "carousel-slide",
    container,
    ghost,
  };
}

/**
 * Clamp an overlay rectangle so it never extends outside a slot bounding box.
 *
 * @param rect - Overlay rectangle to clamp.
 * @param zoneRect - Slot bounds in preview viewport coordinates.
 * @returns Clamped overlay rectangle.
 */
export function clampCanvasOverlayRectToZone(
  rect: CanvasDropOverlayRect,
  zoneRect: Pick<DOMRect, "top" | "left" | "width" | "height" | "bottom" | "right">,
): CanvasDropOverlayRect {
  const zoneBottom = zoneRect.bottom ?? zoneRect.top + zoneRect.height;
  const zoneRight = zoneRect.right ?? zoneRect.left + zoneRect.width;

  const top = Math.max(rect.top, zoneRect.top);
  const left = Math.max(rect.left, zoneRect.left);
  const bottom = Math.min(rect.top + rect.height, zoneBottom);
  const right = Math.min(rect.left + rect.width, zoneRight);

  return {
    top,
    left,
    width: Math.max(right - left, 0),
    height: Math.max(bottom - top, 0),
  };
}

export function getCarouselIdFromSlideZoneCompound(zoneCompound: string): string | null {
  if (!zoneCompound.includes("slides[")) {
    return null;
  }

  return zoneCompound.split(":")[0] ?? null;
}

/**
 * Parse the zero-based slide index from a carousel slide zone compound key.
 *
 * @param zoneCompound - Puck zone compound key (e.g. `carousel-1:slides[2].content`).
 * @returns Slide index, or null when the key is not a carousel slide slot.
 */
export function parseCarouselSlideIndexFromZoneCompound(zoneCompound: string): number | null {
  const match = zoneCompound.match(/slides\[(\d+)\]/);
  if (!match) {
    return null;
  }

  const index = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(index) ? index : null;
}

/**
 * Whether two zone compound keys refer to different slides on the same carousel.
 *
 * @param leftCompound - First zone compound key.
 * @param rightCompound - Second zone compound key.
 * @returns True when both are carousel slide slots on one carousel but different indices.
 */
export function areDistinctCarouselSlidesInSameCarousel(
  leftCompound: string,
  rightCompound: string,
): boolean {
  if (leftCompound === rightCompound) {
    return false;
  }

  const carouselId = getCarouselIdFromSlideZoneCompound(leftCompound);
  if (!carouselId || carouselId !== getCarouselIdFromSlideZoneCompound(rightCompound)) {
    return false;
  }

  return (
    parseCarouselSlideIndexFromZoneCompound(leftCompound) !== null &&
    parseCarouselSlideIndexFromZoneCompound(rightCompound) !== null
  );
}

/**
 * Resolve a carousel slide drop zone from pointer position on slide cards.
 *
 * Walks visible `.nexus-carousel__slide` shells instead of trusting Puck destination
 * markers or inflated drop-zone rects — fixes wrong slide highlights in multi-slide edit.
 *
 * When the pointer sits inside the carousel root but outside every slide card (inter-slide
 * gap, arrow/dot chrome, or inflated drop-zone padding), the nearest slide by card center
 * is chosen so users are not forced to pixel-hunt narrow slot rects.
 *
 * @param doc - Preview iframe document.
 * @param clientX - Pointer X in preview viewport coordinates.
 * @param clientY - Pointer Y in preview viewport coordinates.
 * @param draggedComponentId - Optional dragged block id to exclude self-nested zones.
 * @returns Carousel slide drop zone, or null when the pointer is outside every carousel.
 */
export function resolveCarouselSlideDropZoneAtPoint(
  doc: Document,
  clientX: number,
  clientY: number,
  draggedComponentId: string | null = null,
): HTMLElement | null {
  if (!isPreviewDocumentReady(doc)) {
    return null;
  }

  let bestContainingZone: HTMLElement | null = null;
  let bestContainingDistanceSq = Infinity;
  let bestNearestZone: HTMLElement | null = null;
  let bestNearestDistanceSq = Infinity;

  doc.querySelectorAll<HTMLElement>(".nexus-carousel").forEach((carousel) => {
    const carouselRect = carousel.getBoundingClientRect();
    if (!isPointInsideRect(carouselRect, clientX, clientY)) {
      return;
    }

    let carouselHasContainingSlide = false;
    let carouselNearestZone: HTMLElement | null = null;
    let carouselNearestDistanceSq = Infinity;

    carousel.querySelectorAll<HTMLElement>(".nexus-carousel__slide").forEach((slide) => {
      const slideRect = slide.getBoundingClientRect();
      if (slideRect.width <= 0 || slideRect.height <= 0) {
        return;
      }

      const dropZone = slide.querySelector<HTMLElement>(
        "[data-puck-dropzone].nexus-carousel__dropzone, .nexus-carousel__dropzone[data-puck-dropzone]",
      );
      if (!dropZone) {
        return;
      }

      if (isDropZoneInsideDraggedComponent(dropZone, draggedComponentId, doc)) {
        return;
      }

      const centerX = slideRect.left + slideRect.width / 2;
      const centerY = slideRect.top + slideRect.height / 2;
      const distanceSq = (clientX - centerX) ** 2 + (clientY - centerY) ** 2;

      if (isPointInsideRect(slideRect, clientX, clientY)) {
        carouselHasContainingSlide = true;
        if (distanceSq < bestContainingDistanceSq) {
          bestContainingDistanceSq = distanceSq;
          bestContainingZone = dropZone;
        }
      }

      if (distanceSq < carouselNearestDistanceSq) {
        carouselNearestDistanceSq = distanceSq;
        carouselNearestZone = dropZone;
      }
    });

    if (
      !carouselHasContainingSlide &&
      carouselNearestZone &&
      carouselNearestDistanceSq < bestNearestDistanceSq
    ) {
      bestNearestDistanceSq = carouselNearestDistanceSq;
      bestNearestZone = carouselNearestZone;
    }
  });

  return bestContainingZone ?? bestNearestZone;
}

/**
 * Resolve a section content drop zone from pointer position on the island shell.
 *
 * Default starter sections wrap the slot in a glass panel wider than the inner
 * `[data-puck-dropzone]` node — geometry hit-testing must use the full shell.
 *
 * @param doc - Preview iframe document.
 * @param clientX - Pointer X in preview viewport coordinates.
 * @param clientY - Pointer Y in preview viewport coordinates.
 * @param draggedComponentId - Optional dragged block id to exclude self-nested zones.
 * @returns Section drop zone, or null when the pointer is outside every section shell.
 */
export function resolveSectionDropZoneAtPoint(
  doc: Document,
  clientX: number,
  clientY: number,
  draggedComponentId: string | null = null,
): HTMLElement | null {
  if (!isPreviewDocumentReady(doc)) {
    return null;
  }

  let match: HTMLElement | null = null;

  doc.querySelectorAll<HTMLElement>(
    "[data-puck-dropzone].nexus-section__dropzone, .nexus-section__dropzone[data-puck-dropzone]",
  ).forEach((dropZone) => {
    if (isDropZoneInsideDraggedComponent(dropZone, draggedComponentId, doc)) {
      return;
    }

    const rect = getCanvasDropZoneMeasureRect(dropZone);
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    if (!isPointInsideRect(rect, clientX, clientY)) {
      return;
    }

    match = dropZone;
  });

  return match;
}

/**
 * Resolve a grid item content drop zone from pointer position on the item shell.
 *
 * Mirrors {@link resolveCarouselSlideDropZoneAtPoint}: walk `.nexus-grid-item-shell`
 * cards instead of trusting inflated Puck drop-zone rects or bottom append hitboxes.
 *
 * @param doc - Preview iframe document.
 * @param clientX - Pointer X in preview viewport coordinates.
 * @param clientY - Pointer Y in preview viewport coordinates.
 * @param draggedComponentId - Optional dragged block id to exclude self-nested zones.
 * @returns Grid item drop zone, or null when the pointer is outside every cell shell.
 */
export function resolveGridItemDropZoneAtPoint(
  doc: Document,
  clientX: number,
  clientY: number,
  draggedComponentId: string | null = null,
): HTMLElement | null {
  if (!isPreviewDocumentReady(doc)) {
    return null;
  }

  let bestZone: HTMLElement | null = null;
  let bestDistanceSq = Infinity;

  doc.querySelectorAll<HTMLElement>(".nexus-grid-item-shell").forEach((shell) => {
    const shellRect = shell.getBoundingClientRect();
    if (shellRect.width <= 0 || shellRect.height <= 0) {
      return;
    }

    if (!isPointInsideRect(shellRect, clientX, clientY)) {
      return;
    }

    const dropZone = shell.querySelector<HTMLElement>(
      "[data-puck-dropzone].nexus-grid-item__dropzone, .nexus-grid-item__dropzone[data-puck-dropzone], [data-puck-dropzone].nexus-grid-item",
    );
    if (!dropZone) {
      return;
    }

    if (isDropZoneInsideDraggedComponent(dropZone, draggedComponentId, doc)) {
      return;
    }

    const centerX = shellRect.left + shellRect.width / 2;
    const centerY = shellRect.top + shellRect.height / 2;
    const distanceSq = (clientX - centerX) ** 2 + (clientY - centerY) ** 2;

    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestZone = dropZone;
    }
  });

  return bestZone;
}

/**
 *
 * @param doc - Document to hit-test (preview iframe or parent during palette drags).
 * @param clientX - Pointer X in that document's viewport coordinates.
 * @param clientY - Pointer Y in that document's viewport coordinates.
 * @param draggedComponentId - Optional active canvas block id to exclude self-nested zones.
 * @returns Drop-zone element or null.
 */
export function findDropZoneUnderPointer(
  doc: Document,
  clientX: number,
  clientY: number,
  draggedComponentId: string | null = null,
): HTMLElement | null {
  if (!isPreviewDocumentReady(doc)) {
    return null;
  }

  const hits: Element[] =
    typeof doc.elementsFromPoint === "function"
      ? doc.elementsFromPoint(clientX, clientY)
      : [doc.elementFromPoint(clientX, clientY)].filter((el): el is Element => el !== null);

  const candidates = new Set<HTMLElement>();

  for (const hit of hits) {
    if (!isCanvasHitTestElement(hit)) {
      continue;
    }

    const hitAttrs: Record<string, string> = {};
    const zoneValue = hit.getAttribute("data-puck-dropzone");
    if (zoneValue !== null) {
      hitAttrs["data-puck-dropzone"] = zoneValue;
    }
    if (hit.hasAttribute("data-dnd-dragging")) {
      hitAttrs["data-dnd-dragging"] = "true";
    }
    if (hit.hasAttribute("data-puck-dragging")) {
      hitAttrs["data-puck-dragging"] = "true";
    }

    if (isCanvasDragGhostElement({ className: hit.className, attributes: hitAttrs })) {
      continue;
    }

    let node: Element | null = hit;
    while (node && node !== doc.documentElement) {
      if (isCanvasHitTestElement(node) && node.hasAttribute("data-puck-dropzone")) {
        if (!isDropZoneInsideDraggedComponent(node, draggedComponentId, doc)) {
          candidates.add(node);
        }
      }
      node = node.parentElement;
    }
  }

  const geometryCandidates = collectDropZonesContainingPoint(
    doc,
    clientX,
    clientY,
    draggedComponentId,
  );

  const merged = mergeCanvasDropZoneCandidates(
    Array.from(candidates),
    geometryCandidates,
    doc.documentElement,
    clientX,
    clientY,
  );

  const carouselSlideZone = resolveCarouselSlideDropZoneAtPoint(
    doc,
    clientX,
    clientY,
    draggedComponentId,
  );

  const sectionZone = resolveSectionDropZoneAtPoint(
    doc,
    clientX,
    clientY,
    draggedComponentId,
  );

  const gridItemZone = resolveGridItemDropZoneAtPoint(
    doc,
    clientX,
    clientY,
    draggedComponentId,
  );

  if (!carouselSlideZone && !sectionZone && !gridItemZone) {
    return merged;
  }

  if (!merged) {
    return carouselSlideZone ?? gridItemZone ?? sectionZone;
  }

  const mergedCompound = merged.getAttribute("data-puck-dropzone") ?? "";

  if (carouselSlideZone) {
    const carouselCompound = carouselSlideZone.getAttribute("data-puck-dropzone") ?? "";

    if (
      isCarouselSlideDropZone(merged) &&
      !areDistinctCarouselSlidesInSameCarousel(mergedCompound, carouselCompound)
    ) {
      return merged;
    }

    const carouselId = getCarouselIdFromSlideZoneCompound(carouselCompound);
    const mergedCarouselId = getCarouselIdFromSlideZoneCompound(mergedCompound);

    if (carouselId && mergedCarouselId === carouselId && !isCarouselSlideDropZone(merged)) {
      return carouselSlideZone;
    }

    if (isCanvasRootDropZone(mergedCompound)) {
      return carouselSlideZone;
    }

    return carouselSlideZone;
  }

  if (gridItemZone) {
    if (isCanvasRootDropZone(mergedCompound)) {
      return gridItemZone;
    }

    if (merged.contains(gridItemZone)) {
      return gridItemZone;
    }

    if (isCanvasDropZoneMoreSpecific(gridItemZone, merged)) {
      return gridItemZone;
    }
  }

  if (sectionZone && isCanvasRootDropZone(mergedCompound)) {
    return sectionZone;
  }

  return merged;
}

/**
 * Whether a preview iframe document is attached and safe for DOM reads.
 *
 * @param previewDoc - Preview iframe document, when mounted.
 * @returns True when `documentElement` is available.
 */
export function isPreviewDocumentReady(previewDoc: Document | null | undefined): previewDoc is Document {
  return Boolean(previewDoc?.documentElement);
}

/**
 * Whether a canvas drag is active inside the preview iframe.
 *
 * @param previewDoc - Preview iframe document.
 * @returns True when Puck marks an in-flight component drag in the preview.
 */
export function isCanvasDragActiveInPreview(previewDoc: Document | null | undefined): boolean {
  if (!isPreviewDocumentReady(previewDoc)) {
    return false;
  }

  return Boolean(
    previewDoc.documentElement.hasAttribute("data-puck-dragging") ||
      previewDoc.querySelector("[data-puck-dragging]") ||
      previewDoc.querySelector("[data-dnd-dragging][data-puck-component]"),
  );
}

/** Attribute toggled on the preview document root during canvas drag. */
export const CANVAS_DRAG_MARKER_ATTR = "data-puck-dragging";

/**
 * Vertical inset from the drag ghost top edge used as the universal slot hit-test probe.
 *
 * Drop-target resolution always probes from this point (not the live pointer) so tall
 * blocks behave the same whether the user grabs the top or bottom of the component.
 */
export const CANVAS_DROP_PROBE_TOP_INSET_PX = 12;

/** Result of mapping a pointer to the canonical canvas drop probe. */
export interface CanvasDropProbePoint {
  /** Probe X in preview viewport coordinates. */
  x: number;
  /** Probe Y in preview viewport coordinates. */
  y: number;
  /** True when coordinates were derived from a drag ghost top anchor. */
  usesTopAnchor: boolean;
}

/** Selectors for the active canvas or palette drag ghost, in priority order. */
const CANVAS_DRAG_GHOST_SELECTORS = [
  "[data-dnd-dragging][data-puck-component]",
  "[data-puck-component][data-puck-dragging]",
  '[class*="DrawerItem--isDragging"]',
  '.Puck [data-dnd-dragging][class*="DrawerItem"]',
] as const;

/**
 * Locate the active drag ghost in the preview iframe or editor shell document.
 *
 * @param previewDoc - Preview iframe document.
 * @param parentDoc - Editor shell document (Blocks sidebar palette drags).
 * @returns Drag ghost element, or null when no drag is in flight.
 */
export function readCanvasDragGhostElement(
  previewDoc: Document,
  parentDoc: Document,
): HTMLElement | null {
  for (const selector of CANVAS_DRAG_GHOST_SELECTORS) {
    const previewMatch = previewDoc.querySelector<HTMLElement>(selector);
    if (previewMatch) {
      return previewMatch;
    }
  }

  for (const selector of CANVAS_DRAG_GHOST_SELECTORS) {
    const parentMatch = parentDoc.querySelector<HTMLElement>(selector);
    if (parentMatch) {
      return parentMatch;
    }
  }

  return null;
}

/**
 * Read drag ghost bounds mapped into preview iframe viewport coordinates.
 *
 * @param previewDoc - Preview iframe document.
 * @param parentDoc - Editor shell document.
 * @param previewIframe - Puck `#preview-frame` element for parent→preview mapping.
 * @returns Ghost rect in preview coords, or null when unavailable.
 */
export function readCanvasDragGhostRectInPreview(
  previewDoc: Document,
  parentDoc: Document,
  previewIframe: Pick<Element, "getBoundingClientRect"> | null,
): DOMRect | null {
  const ghost = readCanvasDragGhostElement(previewDoc, parentDoc);
  if (!ghost) {
    return null;
  }

  const rect = ghost.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  if (previewDoc.contains(ghost)) {
    return rect;
  }

  if (!previewIframe) {
    return null;
  }

  const iframeRect = previewIframe.getBoundingClientRect();
  return new DOMRect(
    rect.left - iframeRect.left,
    rect.top - iframeRect.top,
    rect.width,
    rect.height,
  );
}

/**
 * Map the live pointer to the canonical top-anchor probe used for slot hit-testing.
 *
 * During canvas and palette drags, nested slot resolution uses the top edge of the drag
 * ghost (plus {@link CANVAS_DROP_PROBE_TOP_INSET_PX}) instead of the pointer position.
 * Horizontal position follows the pointer clamped to the ghost width so carousel slide
 * picks stay accurate. Reorder index within a zone still uses the raw pointer Y.
 *
 * @param previewDoc - Preview iframe document.
 * @param parentDoc - Editor shell document.
 * @param previewIframe - Puck `#preview-frame` for palette ghost mapping, when mounted.
 * @param clientX - Pointer X in preview viewport coordinates.
 * @param clientY - Pointer Y in preview viewport coordinates.
 * @returns Probe coordinates for `findDropZoneUnderPointer` and sticky guards.
 */
export function resolveCanvasDropProbePoint(
  previewDoc: Document,
  parentDoc: Document,
  previewIframe: Pick<Element, "getBoundingClientRect"> | null,
  clientX: number,
  clientY: number,
): CanvasDropProbePoint {
  const ghostRect = readCanvasDragGhostRectInPreview(previewDoc, parentDoc, previewIframe);
  if (!ghostRect) {
    return { x: clientX, y: clientY, usesTopAnchor: false };
  }

  const probeX = Math.min(Math.max(clientX, ghostRect.left), ghostRect.right);
  const probeY = ghostRect.top + CANVAS_DROP_PROBE_TOP_INSET_PX;

  return { x: probeX, y: probeY, usesTopAnchor: true };
}

/** Marks the innermost slot currently targeted by {@link NexusCanvasDragCoordinator}. */
export const CANVAS_ACTIVE_DROPZONE_ATTR = "data-nexus-active-dropzone";

/**
 * Toggle the preview-document drag marker that unlocks slot pointer-events CSS.
 *
 * @param previewDoc - Preview iframe document.
 * @param active - Whether a canvas or palette-bound drag is in flight.
 */
export function setCanvasDragMarker(previewDoc: Document | null, active: boolean): void {
  if (!isPreviewDocumentReady(previewDoc)) {
    return;
  }

  if (active) {
    previewDoc.documentElement.setAttribute(CANVAS_DRAG_MARKER_ATTR, "");
  } else {
    previewDoc.documentElement.removeAttribute(CANVAS_DRAG_MARKER_ATTR);
  }
}

/**
 * Mark the resolved drop zone under the pointer and clear stale markers elsewhere.
 *
 * @param previewDoc - Preview iframe document.
 * @param dropZone - Active slot element, or null to clear all markers.
 */
export function setCanvasActiveDropZoneMarker(
  previewDoc: Document | null,
  dropZone: HTMLElement | null,
): void {
  if (!isPreviewDocumentReady(previewDoc)) {
    return;
  }

  previewDoc.querySelectorAll<HTMLElement>(`[${CANVAS_ACTIVE_DROPZONE_ATTR}]`).forEach((zone) => {
    zone.removeAttribute(CANVAS_ACTIVE_DROPZONE_ATTR);
  });

  dropZone?.setAttribute(CANVAS_ACTIVE_DROPZONE_ATTR, "");
}

/**
 * Detect whether a Blocks-sidebar palette insert drag is active in the parent document.
 *
 * @param parentDoc - Editor shell document (outside the preview iframe).
 * @returns True when a drawer item is being dragged toward the canvas.
 */
export function isPaletteDragActiveInParent(parentDoc: Document): boolean {
  return Boolean(
    parentDoc.querySelector('[class*="DrawerItem--isDragging"]') ||
      parentDoc.querySelector('.Puck [data-dnd-dragging][class*="DrawerItem"]') ||
      parentDoc.querySelector(".Puck [data-dnd-dragging][data-puck-component-type]"),
  );
}

/**
 * Detect any active canvas-bound drag (preview reparent or sidebar palette insert).
 *
 * @param previewDoc - Preview iframe document, when mounted.
 * @param parentDoc - Editor shell document.
 * @returns True when drop-target highlighting should run.
 */
export function isAnyCanvasDragActive(
  previewDoc: Document | null,
  parentDoc: Document = typeof document !== "undefined" ? document : (null as unknown as Document),
): boolean {
  if (previewDoc && isCanvasDragActiveInPreview(previewDoc)) {
    return true;
  }

  return isPaletteDragActiveInParent(parentDoc);
}

/**
 * Map parent-window pointer coordinates into the preview iframe viewport.
 *
 * @param previewIframe - Puck `#preview-frame` element.
 * @param clientX - Pointer X in the parent window viewport.
 * @param clientY - Pointer Y in the parent window viewport.
 * @returns Coordinates inside the iframe, or null when the pointer is outside the frame.
 */
export function mapPointerToPreviewIframe(
  previewIframe: Pick<Element, "getBoundingClientRect">,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const rect = previewIframe.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
    return null;
  }

  return { x, y };
}

/**
 * Resolve preview min-height and width for a canvas drop target during drag hover.
 *
 * Empty slots fill the container and never shrink below the dragged block height.
 * Occupied slots reserve space below existing children for append gestures.
 *
 * @param input - Measured drag source and target container geometry.
 * @returns CSS values for `--nexus-drop-preview-min-height` and width.
 */
export function resolveCanvasDropTargetMetrics(
  input: CanvasDropTargetMetricsInput,
): CanvasDropTargetMetrics {
  const {
    draggedHeightPx,
    containerHeightPx,
    isEmptySlot,
    occupiedChildrenHeightPx = 0,
  } = input;

  const safeDragged = Math.max(
    Number.isFinite(draggedHeightPx) && draggedHeightPx > 0
      ? draggedHeightPx
      : CANVAS_DROP_TARGET_DEFAULT_DRAGGED_PX,
    CANVAS_DROP_TARGET_MIN_PX,
  );

  const safeContainer = Math.max(
    Number.isFinite(containerHeightPx) && containerHeightPx > 0
      ? containerHeightPx
      : safeDragged,
    CANVAS_DROP_TARGET_MIN_PX,
  );

  let minHeightPx: number;

  if (isEmptySlot) {
    if (safeContainer > safeDragged * 4) {
      minHeightPx = safeDragged;
    } else {
      minHeightPx = Math.max(safeContainer, safeDragged);
    }
  } else {
    const remaining = Math.max(
      safeContainer - Math.max(occupiedChildrenHeightPx, 0),
      CANVAS_DROP_TARGET_MIN_PX,
    );
    minHeightPx = Math.max(remaining, safeDragged);
  }

  minHeightPx = Math.min(minHeightPx, CANVAS_DROP_PREVIEW_MAX_PX);

  return {
    minHeightPx,
    widthCss: "100%",
    minHeightCss: `${Math.ceil(minHeightPx)}px`,
  };
}

/**
 * Detect whether a Puck drop-zone element is empty (no committed children).
 *
 * @param dropZone - Drop-zone root with `data-puck-dropzone`.
 * @returns True when the zone has no `[data-puck-component]` children.
 */
export function isCanvasDropZoneEmpty(dropZone: Pick<Element, "querySelectorAll">): boolean {
  const components = dropZone.querySelectorAll(
    ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-puck-dragging])",
  );
  return components.length === 0;
}

/**
 * Whether a drop zone is empty for drag overlay purposes.
 *
 * Treats a zone as empty when the only remaining child is the block currently being
 * dragged (still mounted in the source slot until drop).
 *
 * @param dropZone - Puck drop-zone root element.
 * @param draggedComponentId - Active dragged block id, when known.
 * @returns True when the slot has no other committed children.
 */
export function isCanvasDropZoneEmptyForDrag(
  dropZone: Pick<Element, "querySelectorAll">,
  draggedComponentId: string | null,
): boolean {
  const components = dropZone.querySelectorAll<HTMLElement>(
    ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-puck-dragging])",
  );

  if (components.length === 0) {
    return true;
  }

  if (!draggedComponentId || components.length !== 1) {
    return false;
  }

  return components[0]?.getAttribute("data-puck-component") === draggedComponentId;
}

/**
 * Sum rendered heights of committed child components inside a drop zone.
 *
 * @param dropZone - Drop-zone root with `[data-puck-component]` children.
 * @returns Total child height in px (excluding drag preview ghosts).
 */
export function sumCanvasDropZoneChildHeights(dropZone: Element): number {
  let total = 0;
  const children = dropZone.querySelectorAll<HTMLElement>(
    ":scope > [data-puck-component]:not([data-dnd-dragging]):not([data-puck-dragging])",
  );

  children.forEach((child) => {
    const rect = child.getBoundingClientRect();
    if (rect.height > 0) {
      total += rect.height;
    }
  });

  return total;
}
