"use client";

/**
 * @fileoverview Canvas drag coordinator — overlay drop previews and reparent commits.
 *
 * Resolves the deepest slot under the pointer, renders non-layout overlay highlights,
 * and dispatches Puck `move` / `reorder` when native collision lands on the wrong zone.
 *
 * Slot hit-testing uses {@link resolveCanvasDropProbePoint} (top-anchor probe) so tall
 * blocks nest consistently regardless of grab position.
 *
 * Mount via `overrides.puck` in {@link puckEditorOverrides}.
 *
 * Tests: `npm run test:canvas-reparent`, `npm run test:canvas-drop-target`, `npm run test:canvas-carousel-drag`
 *
 * @module src/components/puck/NexusCanvasDragCoordinator
 */

import { useGetPuck } from "@puckeditor/core";
import { useEffect, useRef } from "react";
import { useDragAutoScroll } from "@/lib/useDragAutoScroll";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";
import {
  CANVAS_DROP_TARGET_DEFAULT_DRAGGED_PX,
  findDropZoneUnderPointer,
  getCanvasDropZoneMeasureRect,
  isAnyCanvasDragActive,
  isCanvasDropZoneEmptyForDrag,
  isCanvasRootDropZone,
  isNestedCanvasDropZone,
  isPreviewDocumentReady,
  mapPointerToPreviewIframe,
  resolveCanvasDropOverlayGeometry,
  resolveCanvasDropProbePoint,
  resolveCanvasSlotKind,
  setCanvasActiveDropZoneMarker,
  setCanvasDragMarker,
  shouldKeepStickyDropTarget,
  shouldSkipCarouselSourceSlideHoverUpdate,
  sumCanvasDropZoneChildHeights,
} from "@/components/puck/lib/canvasDropTargetLogic";
import {
  isCanvasNestIntoDescendant,
  measureCanvasDropZoneChildRects,
  readCanvasDropZoneHitboxTop,
  resolveCanvasDestinationIndex,
  type CanvasDragSource,
  type CanvasDropTarget,
  type CanvasNodeIndexEntry,
} from "@/components/puck/lib/canvasReparentLogic";
import {
  resolveCanvasDragCommitPlan,
  resolveCanvasReleaseTargetRef,
} from "@/components/puck/lib/canvasDragCommitPlan";
import { syncPuckComponentOverlayAfterLayout } from "@/components/puck/lib/puckOverlaySync";
import {
  resolvePuckPreviewDocument,
  resolvePuckPreviewFrameElement,
} from "@/components/puck/lib/previewIframeDocumentReady";

/** Preview frame id assigned by Puck preview host (`AutoFrame` iframe or inline div). */
const PREVIEW_FRAME_ID = "preview-frame";

/** Root overlay element id injected into the preview iframe. */
export const NEXUS_CANVAS_DROP_OVERLAY_ID = "nexus-canvas-drop-overlay";

/** Delay after pointerup before reading Puck's post-drop selector (matches Puck drag-end animation). */
const CANVAS_DRAG_COMMIT_DELAY_MS = 320;

/** Overlay class names (styled in puck-editor.css). */
const OVERLAY_ZONE_CLASS = "nexus-canvas-drop-overlay__zone";
const OVERLAY_GHOST_CLASS = "nexus-canvas-drop-overlay__ghost";

/**
 * Resolve the preview frame element when the editor canvas is mounted.
 *
 * @returns `#preview-frame` iframe or inline div, or null when unavailable.
 */
function getPreviewFrame(): HTMLElement | null {
  return resolvePuckPreviewFrameElement();
}

/**
 * Map a pointer event to preview viewport coordinates.
 *
 * Events that originate inside the preview document already use viewport coords.
 * Parent-window events must subtract the preview frame offset when framed.
 *
 * @param event - Pointer event from the preview or parent window.
 * @returns Coordinates inside the preview viewport, or null when unavailable.
 */
function resolvePreviewPointerCoords(event: Pick<PointerEvent, "clientX" | "clientY" | "target">): {
  x: number;
  y: number;
} | null {
  const previewDoc = getPreviewDocument();
  const frame = getPreviewFrame();

  if (!previewDoc || !frame) {
    return null;
  }

  const targetNode = event.target instanceof Node ? event.target : null;
  if (targetNode && previewDoc.contains(targetNode)) {
    return { x: event.clientX, y: event.clientY };
  }

  return mapPointerToPreviewIframe(frame, event.clientX, event.clientY);
}

/**
 * Resolve the preview document when the editor canvas is mounted.
 *
 * @returns Preview document or null when unavailable.
 */
function getPreviewDocument(): Document | null {
  return resolvePuckPreviewDocument();
}

/**
 * Read the id of the canvas block currently being dragged in the preview.
 *
 * @param previewDoc - Preview iframe document.
 * @returns Block id or null for palette insert drags.
 */
function readCanvasDraggedItemId(previewDoc: Document): string | null {
  const dragging = previewDoc.querySelector<HTMLElement>(
    "[data-dnd-dragging][data-puck-component]",
  );
  return dragging?.getAttribute("data-puck-component") ?? null;
}

/**
 * Measure the block currently being dragged on the canvas or from the Blocks sidebar.
 *
 * @param previewDoc - Preview iframe document.
 * @param parentDoc - Editor shell document.
 * @returns Width and height in px, or null when not found.
 */
function measureDraggedComponent(
  previewDoc: Document,
  parentDoc: Document,
): { width: number; height: number } | null {
  const dragging =
    previewDoc.querySelector<HTMLElement>("[data-dnd-dragging][data-puck-component]") ??
    previewDoc.querySelector<HTMLElement>("[data-puck-component][data-puck-dragging]") ??
    parentDoc.querySelector<HTMLElement>('[class*="DrawerItem--isDragging"]') ??
    parentDoc.querySelector<HTMLElement>('.Puck [data-dnd-dragging][class*="DrawerItem"]');

  if (!dragging) {
    return null;
  }

  const rect = dragging.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return { width: rect.width, height: rect.height };
}

/**
 * Ensure the overlay root and child layers exist in the preview document.
 *
 * @param previewDoc - Preview iframe document.
 * @returns Overlay layer elements.
 */
function ensureDropOverlay(previewDoc: Document): {
  root: HTMLElement;
  zone: HTMLElement;
  ghost: HTMLElement;
} {
  const duplicateRoots = previewDoc.querySelectorAll<HTMLElement>(
    `#${NEXUS_CANVAS_DROP_OVERLAY_ID}`,
  );
  duplicateRoots.forEach((node, index) => {
    if (index > 0) {
      node.remove();
    }
  });

  let root = previewDoc.getElementById(NEXUS_CANVAS_DROP_OVERLAY_ID);

  if (!(root instanceof HTMLElement)) {
    root = previewDoc.createElement("div");
    root.id = NEXUS_CANVAS_DROP_OVERLAY_ID;
    root.setAttribute("aria-hidden", "true");

    const zone = previewDoc.createElement("div");
    zone.className = OVERLAY_ZONE_CLASS;

    const ghost = previewDoc.createElement("div");
    ghost.className = OVERLAY_GHOST_CLASS;

    root.append(zone, ghost);
    previewDoc.body.appendChild(root);

    return { root, zone, ghost };
  }

  let zone = root.querySelector<HTMLElement>(`.${OVERLAY_ZONE_CLASS}`);
  let ghost = root.querySelector<HTMLElement>(`.${OVERLAY_GHOST_CLASS}`);

  if (!zone) {
    zone = previewDoc.createElement("div");
    zone.className = OVERLAY_ZONE_CLASS;
    root.appendChild(zone);
  }

  if (!ghost) {
    ghost = previewDoc.createElement("div");
    ghost.className = OVERLAY_GHOST_CLASS;
    root.appendChild(ghost);
  }

  return { root, zone, ghost };
}

/**
 * Hide overlay layers without removing the root node.
 *
 * @param layers - Overlay zone and ghost elements.
 */
function clearDropOverlay(layers: { zone: HTMLElement; ghost: HTMLElement; root: HTMLElement }): void {
  layers.root.style.display = "none";
  layers.zone.style.cssText = "";
  layers.ghost.style.cssText = "";
}

/**
 * Clear overlay elements dynamically from the active preview document.
 *
 * @param previewDoc - Preview iframe document.
 */
function clearDropOverlayInDoc(previewDoc: Document | null): void {
  if (!previewDoc) {
    return;
  }

  const root = previewDoc.getElementById(NEXUS_CANVAS_DROP_OVERLAY_ID);
  if (root instanceof HTMLElement) {
    root.style.display = "none";
    const zone = root.querySelector<HTMLElement>(`.${OVERLAY_ZONE_CLASS}`);
    if (zone) {
      zone.style.display = "none";
      zone.style.cssText = "display: none;";
    }
    const ghost = root.querySelector<HTMLElement>(`.${OVERLAY_GHOST_CLASS}`);
    if (ghost) {
      ghost.style.display = "none";
      ghost.style.cssText = "display: none;";
    }
  }

  setCanvasActiveDropZoneMarker(previewDoc, null);
}

/**
 * Position overlay highlight and ghost slot from measured geometry.
 *
 * @param layers - Overlay DOM layers in the preview iframe.
 * @param dropZone - Active Puck drop zone.
 * @param draggedHeightPx - Measured dragged block height.
 * @param draggedWidthPx - Measured dragged block width.
 */
function applyDropOverlay(
  layers: { zone: HTMLElement; ghost: HTMLElement; root: HTMLElement },
  dropZone: HTMLElement,
  zoneCompound: string,
  draggedHeightPx: number,
  draggedItemId: string | null,
): void {
  const zoneRect = getCanvasDropZoneMeasureRect(dropZone);
  if (zoneRect.width <= 0 || zoneRect.height <= 0) {
    clearDropOverlay(layers);
    return;
  }

  const slotKind = resolveCanvasSlotKind(dropZone.className);
  const isEmpty = isCanvasDropZoneEmptyForDrag(dropZone, draggedItemId);
  const geometry = resolveCanvasDropOverlayGeometry({
    zoneRect,
    draggedHeightPx,
    isEmpty,
    occupiedChildrenHeightPx: isEmpty ? 0 : sumCanvasDropZoneChildHeights(dropZone),
    isRootZone: isCanvasRootDropZone(zoneCompound),
    slotKind,
    fillEmptyCarouselSlot: slotKind === "carousel-slide",
    clampGhostToZone: slotKind === "carousel-slide",
  });

  layers.root.style.display = "block";

  if (geometry.showContainerOutline) {
    layers.zone.style.display = "block";
    layers.zone.style.top = `${geometry.container.top}px`;
    layers.zone.style.left = `${geometry.container.left}px`;
    layers.zone.style.width = `${geometry.container.width}px`;
    layers.zone.style.height = `${geometry.container.height}px`;
  } else {
    layers.zone.style.display = "none";
    layers.zone.style.cssText = "display: none;";
  }

  layers.ghost.style.display = "block";
  layers.ghost.style.top = `${geometry.ghost.top}px`;
  layers.ghost.style.left = `${geometry.ghost.left}px`;
  layers.ghost.style.width = `${geometry.ghost.width}px`;
  layers.ghost.style.height = `${geometry.ghost.height}px`;
}

/**
 * Silent child of `<Puck>` — canvas drag overlay previews and reparent commits.
 *
 * @returns null
 */
export function NexusCanvasDragCoordinator(): null {
  const getPuck = useGetPuck();
  const isDragging = useNexusPuck((state) => state.appState.ui.isDragging);

  const intendedTargetRef = useRef<CanvasDropTarget | null>(null);
  const stickyTargetRef = useRef<CanvasDropTarget | null>(null);
  const nestedStickyTargetRef = useRef<CanvasDropTarget | null>(null);
  const stickyDropZoneRef = useRef<HTMLElement | null>(null);
  const dragSourceRef = useRef<CanvasDragSource | null>(null);
  const dragStartSourceRef = useRef<CanvasDragSource | null>(null);
  const sourceMetricsRef = useRef<{ width: number; height: number } | null>(null);
  const releaseTargetRef = useRef<CanvasDropTarget | null>(null);
  const overlayLayersRef = useRef<{
    root: HTMLElement;
    zone: HTMLElement;
    ghost: HTMLElement;
  } | null>(null);

  const prevIsDraggingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const commitIfNeededRef = useRef<(() => void) | null>(null);
  const commitTimerRef = useRef<number | null>(null);
  const commitPendingRef = useRef(false);
  const lastPointerCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const updateFromPointerRef = useRef<
    ((clientX: number, clientY: number, phase?: "hover" | "release") => void) | null
  >(null);
  const scrollInputRef = useRef({
    clientX: 0,
    clientY: 0,
    nestedClientX: 0,
    nestedClientY: 0,
  });

  const dragAutoScroll = useDragAutoScroll({
    getScrollInput: () => {
      const previewDoc = getPreviewDocument();
      return {
        clientX: scrollInputRef.current.clientX,
        clientY: scrollInputRef.current.clientY,
        nestedDocument: previewDoc,
        nestedClientX: scrollInputRef.current.nestedClientX,
        nestedClientY: scrollInputRef.current.nestedClientY,
      };
    },
    onTick: () => {
      const coords = lastPointerCoordsRef.current;
      if (coords) {
        updateFromPointerRef.current?.(coords.x, coords.y);
      }
    },
  });

  const syncCanvasDragScrollInput = (
    previewX: number,
    previewY: number,
    parentX: number,
    parentY: number,
  ) => {
    scrollInputRef.current = {
      clientX: parentX,
      clientY: parentY,
      nestedClientX: previewX,
      nestedClientY: previewY,
    };

    dragAutoScroll.updateScrollInput({
      clientX: parentX,
      clientY: parentY,
      nestedDocument: getPreviewDocument(),
      nestedClientX: previewX,
      nestedClientY: previewY,
    });
  };

  useEffect(() => {
    isDraggingRef.current = isDragging;
    const previewDoc = getPreviewDocument();
    setCanvasDragMarker(
      previewDoc,
      isDragging ||
        commitPendingRef.current ||
        isAnyCanvasDragActive(previewDoc, document),
    );
  }, [isDragging]);

  useEffect(() => {
    if (prevIsDraggingRef.current && !isDragging) {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
      }

      commitTimerRef.current = window.setTimeout(() => {
        commitTimerRef.current = null;
        const coords = lastPointerCoordsRef.current;
        if (coords) {
          updateFromPointerRef.current?.(coords.x, coords.y, "release");
        }
        commitIfNeededRef.current?.();
        commitPendingRef.current = false;
        setCanvasDragMarker(getPreviewDocument(), false);
      }, CANVAS_DRAG_COMMIT_DELAY_MS);

      commitPendingRef.current = true;
    }
    prevIsDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    /**
     * Resolve hover target and refresh overlay positioning.
     *
     * @param clientX - Pointer X in preview viewport coordinates.
     * @param clientY - Pointer Y in preview viewport coordinates.
     */
    const updateFromPointer = (
      clientX: number,
      clientY: number,
      phase: "hover" | "release" = "hover",
    ) => {
      lastPointerCoordsRef.current = { x: clientX, y: clientY };

      const previewDoc = getPreviewDocument();
      const dragActive =
        isDraggingRef.current || isAnyCanvasDragActive(previewDoc, document);

      setCanvasDragMarker(previewDoc, dragActive);

      if (!isPreviewDocumentReady(previewDoc) || !dragActive) {
        intendedTargetRef.current = null;
        setCanvasActiveDropZoneMarker(previewDoc, null);
        clearDropOverlayInDoc(previewDoc);
        return;
      }

      const draggedItemId = readCanvasDraggedItemId(previewDoc);
      const probe = resolveCanvasDropProbePoint(
        previewDoc,
        document,
        getPreviewFrame(),
        clientX,
        clientY,
      );
      let dropZone = findDropZoneUnderPointer(
        previewDoc,
        probe.x,
        probe.y,
        draggedItemId,
      );

      if (!dropZone) {
        intendedTargetRef.current = null;
        setCanvasActiveDropZoneMarker(previewDoc, null);
        clearDropOverlayInDoc(previewDoc);
        return;
      }

      let zoneCompound = dropZone.getAttribute("data-puck-dropzone");
      if (!zoneCompound) {
        intendedTargetRef.current = null;
        setCanvasActiveDropZoneMarker(previewDoc, null);
        clearDropOverlayInDoc(previewDoc);
        return;
      }

      const stickyZone = stickyDropZoneRef.current;
      const stickyTarget = stickyTargetRef.current;

      if (
        stickyZone &&
        stickyTarget &&
        shouldKeepStickyDropTarget(
          stickyZone,
          stickyTarget.destinationZone,
          dropZone,
          zoneCompound,
          probe.x,
          probe.y,
        )
      ) {
        dropZone = stickyZone;
        zoneCompound = stickyTarget.destinationZone;
      }

      setCanvasActiveDropZoneMarker(previewDoc, dropZone);

      const puck = getPuck();
      const indexes = (
        puck as {
          __private?: { appState: { indexes: { nodes: Record<string, CanvasNodeIndexEntry> } } };
        }
      ).__private?.appState.indexes;

      if (draggedItemId && indexes?.nodes) {
        if (isCanvasNestIntoDescendant(draggedItemId, zoneCompound, indexes.nodes)) {
          intendedTargetRef.current = null;
          setCanvasActiveDropZoneMarker(previewDoc, null);
          clearDropOverlayInDoc(previewDoc);
          return;
        }
      }

      let source: CanvasDragSource | null = dragSourceRef.current;
      if (draggedItemId) {
        const selector = puck.getSelectorForId(draggedItemId);
        if (selector) {
          source = {
            itemId: draggedItemId,
            sourceZone: selector.zone,
            sourceIndex: selector.index,
          };
          dragSourceRef.current = source;
          if (!dragStartSourceRef.current) {
            dragStartSourceRef.current = source;
          }
        }
      }

      const isEmpty = isCanvasDropZoneEmptyForDrag(dropZone, draggedItemId);
      const destinationIndex =
        source !== null
          ? resolveCanvasDestinationIndex({
              clientY,
              sourceZone: source.sourceZone,
              sourceIndex: source.sourceIndex,
              zoneCompound,
              isEmpty,
              childRects: measureCanvasDropZoneChildRects(dropZone),
              hitboxTop: readCanvasDropZoneHitboxTop(dropZone),
            })
          : 0;

      const layers = ensureDropOverlay(previewDoc);
      overlayLayersRef.current = layers;

      if (
        shouldSkipCarouselSourceSlideHoverUpdate({
          dragStartZone: dragStartSourceRef.current?.sourceZone ?? source?.sourceZone ?? null,
          zoneCompound,
          dropZoneClassName: dropZone.className,
          phase,
        })
      ) {
        clearDropOverlay(layers);
        return;
      }

      const resolvedTarget: CanvasDropTarget = {
        destinationZone: zoneCompound,
        destinationIndex,
      };

      const trackedRelease = resolveCanvasReleaseTargetRef(
        releaseTargetRef.current,
        resolvedTarget,
        dragStartSourceRef.current,
        phase,
      );
      intendedTargetRef.current = trackedRelease;
      releaseTargetRef.current = trackedRelease;

      stickyTargetRef.current = resolvedTarget;
      stickyDropZoneRef.current = dropZone;

      if (isNestedCanvasDropZone(zoneCompound)) {
        nestedStickyTargetRef.current = resolvedTarget;
      }

      const dragged = measureDraggedComponent(previewDoc, document);
      const draggedHeightPx =
        dragged?.height ??
        sourceMetricsRef.current?.height ??
        CANVAS_DROP_TARGET_DEFAULT_DRAGGED_PX;

      const isSourceCarouselSlide =
        source !== null &&
        source.sourceZone === zoneCompound &&
        resolveCanvasSlotKind(dropZone.className) === "carousel-slide";

      if (isSourceCarouselSlide) {
        clearDropOverlay(layers);
        return;
      }

      applyDropOverlay(
        layers,
        dropZone,
        zoneCompound,
        draggedHeightPx,
        draggedItemId,
      );
    };

    updateFromPointerRef.current = updateFromPointer;

    /**
     * Commit a corrective reparent when Puck's native drop missed the intended slot.
     */
    const commitIfNeeded = () => {
      const source = dragSourceRef.current;
      const dragStartSource = dragStartSourceRef.current;
      const intended =
        releaseTargetRef.current ??
        nestedStickyTargetRef.current ??
        intendedTargetRef.current;

      if (!source || !intended || !dragStartSource) {
        dragSourceRef.current = null;
        dragStartSourceRef.current = null;
        sourceMetricsRef.current = null;
        releaseTargetRef.current = null;
        intendedTargetRef.current = null;
        stickyTargetRef.current = null;
        nestedStickyTargetRef.current = null;
        stickyDropZoneRef.current = null;
        return;
      }

      const puck = getPuck();
      const actual = puck.getSelectorForId(source.itemId);

      if (!actual) {
        dragSourceRef.current = null;
        dragStartSourceRef.current = null;
        sourceMetricsRef.current = null;
        releaseTargetRef.current = null;
        intendedTargetRef.current = null;
        stickyTargetRef.current = null;
        nestedStickyTargetRef.current = null;
        stickyDropZoneRef.current = null;
        return;
      }

      const commit = resolveCanvasDragCommitPlan(dragStartSource, intended, actual);

      if (commit) {
        const item = puck.getItemBySelector({
          index: commit.sourceIndex,
          zone: commit.sourceZone,
        });

        if (item && puck.getPermissions({ item }).drag !== false) {
          if (commit.dispatchType === "reorder") {
            puck.dispatch({
              type: "reorder",
              destinationZone: commit.destinationZone,
              sourceIndex: commit.sourceIndex,
              destinationIndex: commit.destinationIndex,
              recordHistory: true,
            });
          } else {
            puck.dispatch({
              type: "move",
              sourceZone: commit.sourceZone,
              sourceIndex: commit.sourceIndex,
              destinationZone: commit.destinationZone,
              destinationIndex: commit.destinationIndex,
              recordHistory: true,
            });
          }

          void puck.resolveDataById(commit.itemId, "move");
          syncPuckComponentOverlayAfterLayout(
            puck as Parameters<typeof syncPuckComponentOverlayAfterLayout>[0],
            commit.itemId,
          );
        }
      }

      dragSourceRef.current = null;
      dragStartSourceRef.current = null;
      sourceMetricsRef.current = null;
      releaseTargetRef.current = null;
      intendedTargetRef.current = null;
      stickyTargetRef.current = null;
      nestedStickyTargetRef.current = null;
      stickyDropZoneRef.current = null;
    };

    commitIfNeededRef.current = commitIfNeeded;

    const onPreviewPointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current && !isAnyCanvasDragActive(getPreviewDocument(), document)) {
        clearDropOverlayInDoc(getPreviewDocument());
        return;
      }

      const frame = getPreviewFrame();
      const rect = frame?.getBoundingClientRect();
      const parentX = rect ? rect.left + event.clientX : event.clientX;
      const parentY = rect ? rect.top + event.clientY : event.clientY;
      syncCanvasDragScrollInput(event.clientX, event.clientY, parentX, parentY);
      dragAutoScroll.start();
      updateFromPointer(event.clientX, event.clientY);
    };

    const onParentPointerMove = (event: PointerEvent) => {
      if (!isDraggingRef.current && !isAnyCanvasDragActive(getPreviewDocument(), document)) {
        return;
      }

      const previewDoc = getPreviewDocument();
      if (!previewDoc || !isAnyCanvasDragActive(previewDoc, document)) {
        return;
      }

      const frame = getPreviewFrame();
      if (!frame) {
        return;
      }

      const coords = mapPointerToPreviewIframe(frame, event.clientX, event.clientY);
      if (!coords) {
        return;
      }

      syncCanvasDragScrollInput(coords.x, coords.y, event.clientX, event.clientY);
      dragAutoScroll.start();
      updateFromPointer(coords.x, coords.y);
    };

    const onDragStartCapture = (event: PointerEvent) => {
      const previewDoc = getPreviewDocument();
      if (!previewDoc) {
        return;
      }

      setCanvasDragMarker(previewDoc, true);

      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }

      const componentEl = target.closest("[data-puck-component]");
      const draggedItemId = componentEl?.getAttribute("data-puck-component");
      if (!draggedItemId) {
        return;
      }

      if (componentEl instanceof HTMLElement) {
        const rect = componentEl.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          sourceMetricsRef.current = { width: rect.width, height: rect.height };
        }
      }

      const puck = getPuck();
      const selector = puck.getSelectorForId(draggedItemId);
      if (selector) {
        const startSource = {
          itemId: draggedItemId,
          sourceZone: selector.zone,
          sourceIndex: selector.index,
        };
        dragSourceRef.current = startSource;
        dragStartSourceRef.current = startSource;
      }

      stickyTargetRef.current = null;
      nestedStickyTargetRef.current = null;
      stickyDropZoneRef.current = null;
      intendedTargetRef.current = null;
      releaseTargetRef.current = null;
      dragAutoScroll.start();
    };

    const onDragEnd = (event?: PointerEvent) => {
      dragAutoScroll.stop();
      if (event) {
        const coords = resolvePreviewPointerCoords(event);
        if (coords) {
          updateFromPointer(coords.x, coords.y, "release");
        }
      }
      clearDropOverlayInDoc(getPreviewDocument());
    };

    const onPreviewPointerUp = (event: PointerEvent) => {
      onDragEnd(event);
    };

    const attachPreviewListeners = () => {
      const previewDoc = getPreviewDocument();
      if (!previewDoc) {
        return null;
      }

      ensureDropOverlay(previewDoc);
      previewDoc.addEventListener("pointermove", onPreviewPointerMove, { capture: true });
      previewDoc.addEventListener("pointerdown", onDragStartCapture, { capture: true });
      previewDoc.addEventListener("pointerup", onPreviewPointerUp, { capture: true });
      previewDoc.addEventListener("pointercancel", onPreviewPointerUp, { capture: true });

      return previewDoc;
    };

    let previewDoc = attachPreviewListeners();

    const observer =
      typeof MutationObserver !== "undefined"
        ? new MutationObserver(() => {
            if (!previewDoc || !document.getElementById(PREVIEW_FRAME_ID)) {
              previewDoc?.removeEventListener("pointermove", onPreviewPointerMove, {
                capture: true,
              });
              previewDoc?.removeEventListener("pointerdown", onDragStartCapture, {
                capture: true,
              });
              previewDoc?.removeEventListener("pointerup", onPreviewPointerUp, {
                capture: true,
              });
              previewDoc?.removeEventListener("pointercancel", onPreviewPointerUp, {
                capture: true,
              });
              previewDoc = attachPreviewListeners();
            }
          })
        : null;

    const puckRoot = document.querySelector(".Puck");
    if (observer && puckRoot) {
      observer.observe(puckRoot, { childList: true, subtree: true });
    }

    const onBlur = () => onDragEnd();

    window.addEventListener("pointermove", onParentPointerMove, { capture: true });
    window.addEventListener("pointerup", onPreviewPointerUp, { capture: true });
    window.addEventListener("blur", onBlur);

    return () => {
      if (commitTimerRef.current !== null) {
        window.clearTimeout(commitTimerRef.current);
        commitTimerRef.current = null;
      }
      commitPendingRef.current = false;
      commitIfNeededRef.current = null;
      updateFromPointerRef.current = null;
      setCanvasDragMarker(getPreviewDocument(), false);
      clearDropOverlayInDoc(getPreviewDocument());

      previewDoc?.removeEventListener("pointermove", onPreviewPointerMove, { capture: true });
      previewDoc?.removeEventListener("pointerdown", onDragStartCapture, { capture: true });
      previewDoc?.removeEventListener("pointerup", onPreviewPointerUp, { capture: true });
      previewDoc?.removeEventListener("pointercancel", onPreviewPointerUp, { capture: true });
      window.removeEventListener("pointermove", onParentPointerMove, { capture: true });
      window.removeEventListener("pointerup", onPreviewPointerUp, { capture: true });
      window.removeEventListener("blur", onBlur);
      observer?.disconnect();
      dragAutoScroll.stop();
    };
  }, [dragAutoScroll, getPuck]);

  return null;
}

export default NexusCanvasDragCoordinator;
