/**
 * @fileoverview Edit-mode empty-slot sizing for {@link NexusGrid} and {@link NexusGridItem}.
 *
 * Larger floors improve stock Puck drop targeting for tall blocks (e.g. Video Player)
 * without a custom canvas drag coordinator. Edit DOM mirrors carousel slide shells
 * (`nexus-grid-item__dropzone-shell`). Keep `puck-editor.css` grid min-heights in sync.
 *
 * @module src/components/puck/lib/gridEditSizing
 */

/** Empty {@link NexusGrid} container — Puck `minEmptyHeight` and CSS floor (px). */
export const NEXUS_GRID_EDIT_EMPTY_MIN_HEIGHT_PX = 200;

/** Empty {@link NexusGridItem} cell — Puck `minEmptyHeight` and CSS floor (px). */
export const NEXUS_GRID_ITEM_EDIT_EMPTY_MIN_HEIGHT_PX = 240;

/** Empty grid item inside a carousel slide — smaller to avoid slide stretch loops (px). */
export const NEXUS_GRID_ITEM_CAROUSEL_EDIT_EMPTY_MIN_HEIGHT_PX = 120;

/** Empty {@link NexusSection} content slot — Puck `minEmptyHeight` and CSS floor (px). */
export const NEXUS_SECTION_EDIT_EMPTY_MIN_HEIGHT_PX = 120;

/** Default column span for new grid items (12-column grid → half width). */
export const NEXUS_GRID_ITEM_DEFAULT_SPAN_COL = "6";

/** Default row span for new grid items — single row keeps carousel slides compact. */
export const NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW = "1";

/** Default grid gap (px) when a grid renders inside a carousel slide. */
export const NEXUS_GRID_CAROUSEL_DEFAULT_GAP_PX = 8;

/** Sidebar MD gap (px) — carousel grids use {@link NEXUS_GRID_CAROUSEL_DEFAULT_GAP_PX} instead when unset. */
export const NEXUS_GRID_DEFAULT_GAP_PX = 16;

/**
 * Resolve grid gap for carousel slides — tighter default than top-level grids.
 *
 * @param gap - Resolved CSS gap from sidebar props.
 * @param inCarouselSlide - Whether the grid renders inside `.nexus-carousel__slide`.
 * @returns Gap length for inline `style.gap`.
 */
export function resolveCarouselAwareGridGap(gap: string, inCarouselSlide: boolean): string {
  if (!inCarouselSlide) return gap;

  const px = Number.parseFloat(gap);
  if (!Number.isFinite(px)) return gap;

  if (px === NEXUS_GRID_DEFAULT_GAP_PX) {
    return `${NEXUS_GRID_CAROUSEL_DEFAULT_GAP_PX}px`;
  }

  return gap;
}

/**
 * Resolve row span for grid placement — carousel slides and edit mode always use a single
 * row track so legacy `spanRow: "2"` data does not create phantom row gaps (row 3 packing).
 *
 * @param spanRow - Sidebar row span preset.
 * @param inCarouselSlide - Whether the grid renders inside `.nexus-carousel__slide`.
 * @param editLayoutMode - Whether Puck editor layout mode is active.
 * @returns Integer row span for {@link resolveGridCellPlacements}.
 */
export function resolveGridEditCellSpanRow(
  spanRow: string | undefined,
  inCarouselSlide: boolean,
  editLayoutMode: boolean,
): number {
  if (editLayoutMode || inCarouselSlide) {
    return 1;
  }

  const parsed = Number.parseInt(spanRow ?? NEXUS_GRID_ITEM_DEFAULT_SPAN_ROW, 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
}

/**
 * @deprecated Prefer {@link resolveGridEditCellSpanRow} — pass `editLayoutMode: false`.
 */
export function resolveCarouselAwareGridCellSpanRow(
  spanRow: string | undefined,
  inCarouselSlide: boolean,
): number {
  return resolveGridEditCellSpanRow(spanRow, inCarouselSlide, false);
}
