/**
 * @fileoverview Per-row height synchronization for {@link NexusGrid}.
 *
 * Each CSS grid row track shares one height (the tallest intrinsic cell in that row).
 * When a row contains a video block, that video's natural height is the row floor so
 * empty placeholder cells do not inflate tracks via edit empty-slot min-heights.
 *
 * Tests: `tests/puck/lib/gridRowHeightSync.test.ts` — `npm run test:grid-row-height-sync`
 *
 * @module src/components/puck/lib/gridRowHeightSync
 */

import type { GridCellPlacement } from "@/components/puck/lib/gridCellPlacement";
import {
  NEXUS_GRID_ITEM_CAROUSEL_EDIT_EMPTY_MIN_HEIGHT_PX,
  NEXUS_GRID_ITEM_EDIT_EMPTY_MIN_HEIGHT_PX,
} from "@/components/puck/lib/gridEditSizing";
import {
  MEDIA_ASPECT_RATIO_FALLBACK,
  parseCustomMediaAspectRatioInput,
  parseMediaAspectRatioAttr,
} from "@/components/puck/lib/mediaAspectRatio";

/** CSS class toggled on `.nexus-grid` when explicit row tracks are applied. */
export const NEXUS_GRID_ROW_HEIGHT_SYNC_CLASS = "nexus-grid--row-height-sync";

/** Absolute minimum row track height inside carousel slides (px). */
export const NEXUS_GRID_ROW_CAROUSEL_MIN_HEIGHT_PX = NEXUS_GRID_ITEM_CAROUSEL_EDIT_EMPTY_MIN_HEIGHT_PX;

/** Absolute minimum row track height for page-level grids (px). */
export const NEXUS_GRID_ROW_PAGE_MIN_HEIGHT_PX = NEXUS_GRID_ITEM_EDIT_EMPTY_MIN_HEIGHT_PX;

/** Options for {@link resolveGridRowTrackHeightsPx}. */
export interface GridRowHeightSyncOptions {
  /** Absolute floor applied to every row track after content math. */
  rowAbsoluteMinPx?: number;
}

/** Parsed CSS grid row placement. */
export interface ParsedGridRowPlacement {
  /** 1-based grid row start line. */
  startLine: number;
  /** Row span (≥ 1). */
  span: number;
}

/**
 * Parse a CSS `grid-row` placement string (`"2 / span 1"`).
 *
 * @param gridRow - Grid row placement from {@link GridCellPlacement}.
 * @returns Parsed start line and span.
 */
export function parseGridRowPlacement(gridRow: string): ParsedGridRowPlacement {
  const spanMatch = gridRow.match(/^(\d+)\s*\/\s*span\s+(\d+)$/i);
  if (spanMatch) {
    return {
      startLine: Number.parseInt(spanMatch[1], 10),
      span: Math.max(1, Number.parseInt(spanMatch[2], 10)),
    };
  }

  const lineMatch = gridRow.match(/^(\d+)$/);
  if (lineMatch) {
    return {
      startLine: Number.parseInt(lineMatch[1], 10),
      span: 1,
    };
  }

  return { startLine: 1, span: 1 };
}

/**
 * Resolve explicit row track heights from measured cell content.
 *
 * Single-row cells contribute their full intrinsic height to the row track. Multi-row
 * cells distribute height evenly across spanned tracks so tall spanners do not double-count.
 *
 * @param placements - Cell placements in array order.
 * @param cellHeightsPx - Intrinsic content height per cell index.
 * @param cellVideoFloorPx - Video row floor per cell (null when absent).
 * @param options - Row sizing options.
 * @returns Pixel height per row track (index 0 = row line 1).
 */
export function resolveGridRowTrackHeightsPx(
  placements: readonly GridCellPlacement[],
  cellHeightsPx: readonly number[],
  cellVideoFloorPx: readonly (number | null)[],
  options: GridRowHeightSyncOptions = {},
): number[] {
  const rowAbsoluteMinPx = Math.max(1, options.rowAbsoluteMinPx ?? NEXUS_GRID_ROW_PAGE_MIN_HEIGHT_PX);
  let maxRowLine = 0;

  const parsedPlacements = placements.map((placement) => {
    const parsed = parseGridRowPlacement(placement.gridRow);
    maxRowLine = Math.max(maxRowLine, parsed.startLine + parsed.span - 1);
    return parsed;
  });

  if (maxRowLine <= 0) {
    return [];
  }

  const rowHeightsPx = Array.from({ length: maxRowLine }, () => 0);

  parsedPlacements.forEach(({ startLine, span }, index) => {
    const contentHeightPx = Math.max(0, cellHeightsPx[index] ?? 0);
    const videoFloorPx = cellVideoFloorPx[index];
    const floorPx = videoFloorPx !== null && videoFloorPx > 0 ? videoFloorPx : 0;
    const targetHeightPx = Math.max(contentHeightPx, floorPx);

    if (span <= 1) {
      const rowIndex = startLine - 1;
      rowHeightsPx[rowIndex] = Math.max(rowHeightsPx[rowIndex], targetHeightPx);
      return;
    }

    const perTrackPx = Math.ceil(targetHeightPx / span);
    for (let offset = 0; offset < span; offset += 1) {
      const rowIndex = startLine - 1 + offset;
      rowHeightsPx[rowIndex] = Math.max(rowHeightsPx[rowIndex], perTrackPx);
    }
  });

  return rowHeightsPx.map((heightPx) => Math.max(rowAbsoluteMinPx, Math.ceil(heightPx)));
}

/**
 * Format explicit `grid-template-rows` from row track heights.
 *
 * @param rowHeightsPx - Pixel height per row track.
 * @param rowAbsoluteMinPx - Minimum track height fallback.
 * @returns CSS `grid-template-rows` value.
 */
export function formatGridTemplateRows(
  rowHeightsPx: readonly number[],
  rowAbsoluteMinPx: number = NEXUS_GRID_ROW_PAGE_MIN_HEIGHT_PX,
): string {
  const floorPx = Math.max(1, rowAbsoluteMinPx);
  return rowHeightsPx.map((heightPx) => `${Math.max(floorPx, Math.ceil(heightPx))}px`).join(" ");
}

/**
 * Measure intrinsic grid cell height with edit empty-slot floors temporarily cleared.
 *
 * @param shell - Grid cell shell element.
 * @returns Intrinsic content height in px.
 */
export function measureGridCellNaturalHeightPx(shell: HTMLElement): number {
  const touched: Array<{
    el: HTMLElement;
    height: string;
    minHeight: string;
    maxHeight: string;
    blockSize: string;
    alignSelf: string;
  }> = [];

  const resetEl = (el: HTMLElement) => {
    touched.push({
      el,
      height: el.style.height,
      minHeight: el.style.minHeight,
      maxHeight: el.style.maxHeight,
      blockSize: el.style.blockSize,
      alignSelf: el.style.alignSelf,
    });
    el.style.setProperty("height", "auto", "important");
    el.style.setProperty("min-height", "0", "important");
    el.style.setProperty("max-height", "none", "important");
    el.style.setProperty("block-size", "auto", "important");
    el.style.setProperty("align-self", "start", "important");
  };

  resetEl(shell);
  shell
    .querySelectorAll<HTMLElement>(
      ".nexus-grid-item__dropzone-shell, .nexus-grid-item__dropzone, [data-puck-dropzone], [data-puck-component], .nexus-video, .nexus-video__frame",
    )
    .forEach((el) => resetEl(el));

  void shell.offsetHeight;

  const measured = Math.max(
    shell.scrollHeight,
    shell.offsetHeight,
    shell.getBoundingClientRect().height,
  );

  touched.forEach(({ el, height, minHeight, maxHeight, blockSize, alignSelf }) => {
    if (height) {
      el.style.height = height;
    } else {
      el.style.removeProperty("height");
    }
    if (minHeight) {
      el.style.minHeight = minHeight;
    } else {
      el.style.removeProperty("min-height");
    }
    if (maxHeight) {
      el.style.maxHeight = maxHeight;
    } else {
      el.style.removeProperty("max-height");
    }
    if (blockSize) {
      el.style.blockSize = blockSize;
    } else {
      el.style.removeProperty("block-size");
    }
    if (alignSelf) {
      el.style.alignSelf = alignSelf;
    } else {
      el.style.removeProperty("align-self");
    }
  });

  return measured > 0 && Number.isFinite(measured) ? Math.ceil(measured) : 0;
}

/**
 * Whether a grid cell drop zone currently contains nested Puck blocks.
 *
 * @param shell - Grid cell shell element.
 * @returns True when the cell slot has child content.
 */
export function gridCellHasPuckContent(shell: HTMLElement): boolean {
  const dropzone =
    shell.querySelector<HTMLElement>(
      ".nexus-grid-item__dropzone[data-puck-dropzone], [data-puck-dropzone].nexus-grid-item",
    ) ?? shell.querySelector<HTMLElement>("[data-puck-dropzone]");

  if (dropzone?.className.includes("DropZone--hasChildren")) {
    return true;
  }

  const nestedBlock = shell.querySelector("[data-puck-component]");
  return (
    typeof nestedBlock === "object" &&
    nestedBlock !== null &&
    "nodeType" in nestedBlock &&
    (nestedBlock as { nodeType: number }).nodeType === 1
  );
}

/** Minimal grid cell record for props-based occupancy checks. */
export interface GridCellContentRecord {
  content?: unknown;
}

/**
 * Whether every grid cell slot in Puck props currently holds nested blocks.
 *
 * @param items - Grid `items` array from block props.
 * @returns True when each cell's `content` slot is non-empty.
 */
export function gridAllCellsHaveContentFromItems(
  items: GridCellContentRecord[] | undefined,
): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.every((item) => {
    const content = item.content;
    if (!Array.isArray(content) || content.length === 0) {
      return false;
    }

    return content.some(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        "type" in entry &&
        typeof (entry as { type?: unknown }).type === "string" &&
        (entry as { type: string }).type.length > 0,
    );
  });
}

/**
 * Whether every mounted grid cell currently contains nested Puck blocks.
 *
 * @param grid - `.nexus-grid` host element.
 * @returns True when all cells are occupied (edit settings chrome may be shown).
 */
export function gridAllCellsHaveContentFromDom(grid: HTMLElement): boolean {
  const shells = grid.querySelectorAll<HTMLElement>("[data-nexus-grid-cell-index]");
  if (shells.length === 0) {
    return false;
  }

  return Array.from(shells).every((shell) => gridCellHasPuckContent(shell));
}

/**
 * Resolve the edit-mode empty-slot floor for a grid cell shell.
 *
 * @param shell - Grid cell shell element.
 * @param inCarouselSlide - Whether the grid renders inside a carousel slide.
 * @returns Empty-slot floor in px, or 0 when the cell has content.
 */
export function resolveGridCellEditEmptyFloorPx(
  shell: HTMLElement,
  inCarouselSlide: boolean,
): number {
  if (gridCellHasPuckContent(shell)) {
    return 0;
  }

  return inCarouselSlide ? NEXUS_GRID_ROW_CAROUSEL_MIN_HEIGHT_PX : NEXUS_GRID_ROW_PAGE_MIN_HEIGHT_PX;
}

/**
 * Resolve content-driven height for one grid cell (ignores stretched row-sync layout).
 *
 * @param shell - Grid cell shell element.
 * @param inCarouselSlide - Whether the grid renders inside a carousel slide.
 * @returns Intrinsic target height in px for row track math.
 */
export function resolveGridCellContentHeightPx(
  shell: HTMLElement,
  inCarouselSlide: boolean,
): number {
  if (!gridCellHasPuckContent(shell)) {
    return resolveGridCellEditEmptyFloorPx(shell, inCarouselSlide);
  }

  const videoIntrinsicPx = measureGridCellVideoIntrinsicHeightPx(shell) ?? 0;
  const naturalPx = measureGridCellNaturalHeightPx(shell);
  return Math.max(videoIntrinsicPx, naturalPx);
}

/**
 * Read a grid cell shell by its array index.
 *
 * @param grid - `.nexus-grid` host element.
 * @param index - Zero-based cell index.
 * @returns Cell shell element or null when not mounted.
 */
export function readGridCellShellByIndex(grid: HTMLElement, index: number): HTMLElement | null {
  return grid.querySelector<HTMLElement>(`[data-nexus-grid-cell-index="${index}"]`);
}

/**
 * Resolve the numeric aspect ratio for a video block from DOM metadata.
 *
 * @param video - `.nexus-video` root element.
 * @returns Width divided by height.
 */
export function resolveVideoAspectRatioFromDom(video: HTMLElement): number {
  const attr =
    video.getAttribute("data-nexus-media-aspect") ??
    video.querySelector<HTMLElement>(".nexus-video__frame")?.getAttribute("data-nexus-media-aspect");
  if (attr) {
    return parseMediaAspectRatioAttr(attr, MEDIA_ASPECT_RATIO_FALLBACK);
  }

  const frame = video.querySelector<HTMLElement>(".nexus-video__frame");
  if (frame) {
    const inlineRatio = frame.style.aspectRatio.trim();
    if (inlineRatio) {
      const parsedInline = parseCustomMediaAspectRatioInput(inlineRatio.replace(/\s+/g, ""));
      if (parsedInline !== null) {
        return parsedInline;
      }
    }

    const computedRatio = video.ownerDocument.defaultView?.getComputedStyle(frame).aspectRatio;
    if (computedRatio && computedRatio !== "auto") {
      const parsedComputed = parseCustomMediaAspectRatioInput(computedRatio.replace(/\s+/g, ""));
      if (parsedComputed !== null) {
        return parsedComputed;
      }
    }
  }

  return MEDIA_ASPECT_RATIO_FALLBACK;
}

/**
 * Measure intrinsic video block height inside a grid cell without row-sync `height: 100%` constraints.
 *
 * @param shell - Grid cell shell element.
 * @returns Intrinsic video height in px, or null when absent.
 */
export function measureGridCellVideoIntrinsicHeightPx(shell: HTMLElement): number | null {
  const video = shell.querySelector<HTMLElement>(".nexus-video");
  if (!video) {
    return null;
  }

  const frame = video.querySelector<HTMLElement>(".nexus-video__frame");
  const touched: HTMLElement[] = [];

  const forceAutoHeight = (element: HTMLElement) => {
    touched.push(element);
    element.style.setProperty("height", "auto", "important");
    element.style.setProperty("min-height", "0", "important");
    element.style.setProperty("max-height", "none", "important");
    element.style.setProperty("flex", "0 0 auto", "important");
  };

  forceAutoHeight(video);
  if (frame) {
    forceAutoHeight(frame);
  }

  void video.offsetHeight;

  const aspectRatio = resolveVideoAspectRatioFromDom(video);
  const widthPx = Math.ceil((frame ?? video).getBoundingClientRect().width);
  const aspectHeightPx =
    widthPx > 0 && Number.isFinite(aspectRatio) && aspectRatio > 0
      ? Math.ceil(widthPx / aspectRatio)
      : 0;

  const measuredPx = Math.max(
    video.getBoundingClientRect().height,
    video.scrollHeight,
    video.offsetHeight,
    frame?.getBoundingClientRect().height ?? 0,
    frame?.scrollHeight ?? 0,
    frame?.offsetHeight ?? 0,
    aspectHeightPx,
  );

  touched.forEach((element) => {
    element.style.removeProperty("height");
    element.style.removeProperty("min-height");
    element.style.removeProperty("max-height");
    element.style.removeProperty("flex");
  });

  return measuredPx > 0 && Number.isFinite(measuredPx) ? Math.ceil(measuredPx) : null;
}

/**
 * Measure the natural height of a video block inside a grid cell, if present.
 *
 * @param shell - Grid cell shell element.
 * @returns Video height in px, or null when the cell has no video block.
 */
export function measureGridCellVideoHeightPx(shell: HTMLElement): number | null {
  return measureGridCellVideoIntrinsicHeightPx(shell);
}

/**
 * Resolve the per-row floor contributed by a video block (measured height + aspect ratio).
 *
 * Uses the cell width and `data-nexus-media-aspect` so rows never collapse below a playable
 * video frame before layout/fonts finish loading.
 *
 * @param shell - Grid cell shell element.
 * @param rowAbsoluteMinPx - Absolute row minimum for this grid host.
 * @returns Video row floor in px, or null when the cell has no video block.
 */
export function resolveGridCellVideoFloorPx(
  shell: HTMLElement,
): number | null {
  const video = shell.querySelector<HTMLElement>(".nexus-video");
  if (!video) {
    return null;
  }

  const frame = video.querySelector<HTMLElement>(".nexus-video__frame");
  const measuredPx = measureGridCellVideoIntrinsicHeightPx(shell) ?? 0;
  const aspectRatio = resolveVideoAspectRatioFromDom(video);
  const cellWidthPx = shell.getBoundingClientRect().width;
  const frameWidthPx = Math.ceil((frame ?? video).getBoundingClientRect().width);
  const widthPx = frameWidthPx > 0 ? frameWidthPx : cellWidthPx;
  const aspectFloorPx =
    widthPx > 0 && Number.isFinite(aspectRatio) && aspectRatio > 0
      ? Math.ceil(widthPx / aspectRatio)
      : 0;

  const floorPx = Math.max(measuredPx, aspectFloorPx);
  return floorPx > 0 ? floorPx : null;
}

/**
 * Read a fixed carousel slide height anchor from CSS variables — never layout box size.
 *
 * Using {@link HTMLElement.getBoundingClientRect} as a fill target creates a feedback loop
 * with `height: 100%` stretch chains and row sync (grid grows → slide grows → grid grows).
 *
 * @param slide - Carousel slide root element.
 * @returns Anchored height in px, or null when no fixed target is set.
 */
export function readCarouselGridSlideHeightAnchorPx(slide: HTMLElement): number | null {
  const slideVarPx = Number.parseFloat(
    slide.style.getPropertyValue("--nexus-carousel-slide-height").trim(),
  );
  if (Number.isFinite(slideVarPx) && slideVarPx > 0) {
    return Math.floor(slideVarPx);
  }

  const carousel = slide.closest<HTMLElement>(".nexus-carousel");
  const rowVarPx = Number.parseFloat(
    carousel?.style.getPropertyValue("--nexus-carousel-row-height").trim() ?? "",
  );
  if (Number.isFinite(rowVarPx) && rowVarPx > 0) {
    return Math.floor(rowVarPx);
  }

  return null;
}

/**
 * Row indices (0-based) where every grid cell in that row is empty.
 *
 * Used by carousel slide fill so rows that still hold media keep intrinsic height
 * and only fully empty rows absorb leftover slide anchor slack.
 *
 * @param grid - `.nexus-grid` host element.
 * @param placements - Cell placements in array order.
 * @returns Set of row indices with no nested Puck content in any cell.
 */
export function resolveFullyEmptyGridRowIndices(
  grid: HTMLElement,
  placements: readonly GridCellPlacement[],
): Set<number> {
  const rowHasContent = new Map<number, boolean>();

  placements.forEach((placement, index) => {
    const shell = readGridCellShellByIndex(grid, index);
    const hasContent = shell ? gridCellHasPuckContent(shell) : false;
    const { startLine, span } = parseGridRowPlacement(placement.gridRow);
    for (let offset = 0; offset < span; offset += 1) {
      const rowIndex = startLine - 1 + offset;
      if (hasContent) {
        rowHasContent.set(rowIndex, true);
      } else if (!rowHasContent.has(rowIndex)) {
        rowHasContent.set(rowIndex, false);
      }
    }
  });

  const fullyEmptyRows = new Set<number>();
  rowHasContent.forEach((hasContent, rowIndex) => {
    if (!hasContent) {
      fullyEmptyRows.add(rowIndex);
    }
  });
  return fullyEmptyRows;
}

/**
 * Grow explicit carousel grid row tracks toward a fixed slide height anchor.
 *
 * Content measurement stays intrinsic; expansion only runs when
 * {@link readCarouselGridSlideHeightAnchorPx} returns a CSS-variable target.
 * Slack is distributed only across rows where every cell is empty so occupied
 * media rows (e.g. video in the top-left cell) do not gain void space below content.
 *
 * @param grid - `.nexus-grid` host element.
 * @param rowHeightsPx - Measured row track heights in px.
 * @param placements - Cell placements in array order.
 * @returns Row track heights expanded toward the anchored slide height.
 */
export function expandGridRowTracksToCarouselSlideHeight(
  grid: HTMLElement,
  rowHeightsPx: readonly number[],
  placements: readonly GridCellPlacement[],
): number[] {
  if (rowHeightsPx.length === 0) {
    return [];
  }

  const slide = grid.closest<HTMLElement>(".nexus-carousel__slide");
  if (!slide) {
    return [...rowHeightsPx];
  }

  const targetHeightPx = readCarouselGridSlideHeightAnchorPx(slide);
  if (targetHeightPx === null) {
    return [...rowHeightsPx];
  }

  const fullyEmptyRows = resolveFullyEmptyGridRowIndices(grid, placements);
  if (fullyEmptyRows.size === 0) {
    return [...rowHeightsPx];
  }

  const expandableRowIndices = rowHeightsPx
    .map((_, index) => index)
    .filter((index) => fullyEmptyRows.has(index));
  if (expandableRowIndices.length === 0) {
    return [...rowHeightsPx];
  }

  const inlineGap = grid.style.gap || grid.style.rowGap;
  const inlineGapPx = inlineGap ? Number.parseFloat(inlineGap) : Number.NaN;
  const computedStyle =
    grid.ownerDocument?.defaultView &&
    typeof grid.ownerDocument.defaultView.getComputedStyle === "function"
      ? grid.ownerDocument.defaultView.getComputedStyle(grid)
      : null;
  const rowGapPx = Number.isFinite(inlineGapPx)
    ? inlineGapPx
    : Number.parseFloat(computedStyle?.rowGap ?? "") ||
      Number.parseFloat(computedStyle?.gap ?? "") ||
      0;
  const gapTotalPx = rowGapPx * Math.max(0, rowHeightsPx.length - 1);
  const contentTotalPx =
    rowHeightsPx.reduce((sum, heightPx) => sum + heightPx, 0) + gapTotalPx;

  if (contentTotalPx >= targetHeightPx - 1) {
    return [...rowHeightsPx];
  }

  const fixedRowsHeightPx = rowHeightsPx.reduce(
    (sum, heightPx, index) => (fullyEmptyRows.has(index) ? sum : sum + heightPx),
    0,
  );
  const expandableTotalPxNeeded = targetHeightPx - fixedRowsHeightPx - gapTotalPx;
  const currentExpandableSum = expandableRowIndices.reduce(
    (sum, index) => sum + rowHeightsPx[index],
    0,
  );

  if (expandableTotalPxNeeded <= currentExpandableSum) {
    return [...rowHeightsPx];
  }

  const extraPx = expandableTotalPxNeeded - currentExpandableSum;
  const extraPerExpandableRowPx = extraPx / expandableRowIndices.length;

  return rowHeightsPx.map((heightPx, index) => {
    if (!fullyEmptyRows.has(index)) {
      return heightPx;
    }

    return Math.ceil(heightPx + extraPerExpandableRowPx);
  });
}

/**
 * Apply synchronized row track heights to a grid root element.
 *
 * @param grid - `.nexus-grid` host element.
 * @param rowHeightsPx - Pixel height per row track.
 * @param rowAbsoluteMinPx - Minimum track height fallback.
 */
export function applyGridRowHeightSync(
  grid: HTMLElement,
  rowHeightsPx: readonly number[],
  rowAbsoluteMinPx: number = NEXUS_GRID_ROW_PAGE_MIN_HEIGHT_PX,
): void {
  if (rowHeightsPx.length === 0) {
    clearGridRowHeightSync(grid);
    return;
  }

  grid.classList.add(NEXUS_GRID_ROW_HEIGHT_SYNC_CLASS);
  grid.style.gridTemplateRows = formatGridTemplateRows(rowHeightsPx, rowAbsoluteMinPx);
  grid.dataset.nexusGridRowMin = String(rowAbsoluteMinPx);
}

/**
 * Remove synchronized row track overrides from a grid root element.
 *
 * @param grid - `.nexus-grid` host element.
 */
export function clearGridRowHeightSync(grid: HTMLElement): void {
  grid.classList.remove(NEXUS_GRID_ROW_HEIGHT_SYNC_CLASS);
  grid.style.removeProperty("grid-template-rows");
  delete grid.dataset.nexusGridRowMin;
}

/**
 * Resolve the absolute row minimum for a grid host.
 *
 * @param grid - `.nexus-grid` host element.
 * @param inCarouselSlide - Whether the grid renders inside a carousel slide.
 * @returns Row track floor in px.
 */
export function resolveGridRowAbsoluteMinPx(
  grid: HTMLElement,
  inCarouselSlide: boolean,
): number {
  return inCarouselSlide ? NEXUS_GRID_ROW_CAROUSEL_MIN_HEIGHT_PX : NEXUS_GRID_ROW_PAGE_MIN_HEIGHT_PX;
}

export function measureGridRowTrackHeightsFromDom(
  grid: HTMLElement,
  placements: readonly GridCellPlacement[],
  inCarouselSlide = Boolean(grid.closest(".nexus-carousel__slide")),
): number[] {
  const rowAbsoluteMinPx = resolveGridRowAbsoluteMinPx(grid, inCarouselSlide);
  const savedTemplateRows = grid.style.gridTemplateRows;
  grid.style.removeProperty("grid-template-rows");

  void grid.offsetHeight;

  try {
    const cellHeightsPx = placements.map((_, index) => {
      const shell = readGridCellShellByIndex(grid, index);
      if (!shell) {
        return rowAbsoluteMinPx;
      }

      return resolveGridCellContentHeightPx(shell, inCarouselSlide);
    });
    const cellVideoFloorPx = placements.map((_, index) => {
      const shell = readGridCellShellByIndex(grid, index);
      return shell ? resolveGridCellVideoFloorPx(shell) : null;
    });

    return resolveGridRowTrackHeightsPx(placements, cellHeightsPx, cellVideoFloorPx, {
      rowAbsoluteMinPx,
    });
  } finally {
    if (savedTemplateRows) {
      grid.style.gridTemplateRows = savedTemplateRows;
    }
  }
}

/**
 * Measure all grid cells and apply per-row synchronized track heights.
 *
 * @param grid - `.nexus-grid` host element.
 * @param placements - Cell placements in array order.
 * @returns Applied row track heights in px.
 */
export function syncGridRowHeightsFromDom(
  grid: HTMLElement,
  placements: readonly GridCellPlacement[],
  inCarouselSlide = Boolean(grid.closest(".nexus-carousel__slide")),
): number[] {
  const rowAbsoluteMinPx = resolveGridRowAbsoluteMinPx(grid, inCarouselSlide);
  let rowHeightsPx = measureGridRowTrackHeightsFromDom(grid, placements, inCarouselSlide);
  if (inCarouselSlide) {
    rowHeightsPx = expandGridRowTracksToCarouselSlideHeight(grid, rowHeightsPx, placements);
  }
  applyGridRowHeightSync(grid, rowHeightsPx, rowAbsoluteMinPx);
  return rowHeightsPx;
}
