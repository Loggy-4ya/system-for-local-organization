/**
 * @fileoverview Auto-select Puck canvas viewport preset from window and frame width.
 *
 * Mirrors Puck 0.21 mount-time logic in {@link resolveAutoViewport}.
 *
 * @module src/components/puck/lib/resolveAutoViewport
 */

/** Puck viewport preset shape passed to `<Puck viewports={…}>`. */
export interface NexusEditorViewport {
  width: number | "100%";
  height?: number | "auto";
  icon?: string;
  label?: string;
}

/** Nexus editor viewport presets — phone / tablet / desktop / full-width. */
export const NEXUS_EDITOR_VIEWPORTS: NexusEditorViewport[] = [
  { width: 360, height: "auto", icon: "Smartphone", label: "Phone" },
  { width: 768, height: "auto", icon: "Tablet", label: "Tablet" },
  { width: 1280, height: "auto", icon: "Monitor", label: "Desktop" },
  { width: "100%", height: "auto", icon: "FullWidth", label: "Full-width" },
];

/**
 * Whether the active viewport preset should survive auto-sync (Phone / Tablet / Desktop px widths).
 *
 * Fixed presets drive responsive layout inside the preview while the canvas shell keeps its size;
 * auto-sync must not replace them with full-width when the canvas frame is wider.
 *
 * @param width - Active Puck viewport width.
 * @returns True when auto viewport sync should not overwrite the preset.
 */
export function shouldPreserveFixedViewportPreset(width: number | "100%"): boolean {
  return typeof width === "number";
}

/**
 * Pick the closest fixed viewport to the available canvas space; prefer full-width when
 * the canvas frame is wider than that preset (same rule as Puck core Canvas mount effect).
 *
 * @param viewportWidth - `window.innerWidth` (or equivalent).
 * @param frameWidth - Canvas inner frame width in px, when known.
 * @param viewportOptions - Configured viewport presets.
 * @returns Best-matching viewport preset.
 */
export function resolveAutoViewport(
  viewportWidth: number,
  frameWidth: number | undefined,
  viewportOptions: NexusEditorViewport[] = NEXUS_EDITOR_VIEWPORTS,
): NexusEditorViewport {
  if (viewportOptions.length === 0) {
    return NEXUS_EDITOR_VIEWPORTS[0];
  }

  const fullWidthViewport = viewportOptions.find((v) => v.width === "100%");
  const fixedOptions = viewportOptions.filter((v) => v.width !== "100%");
  const effectiveWidth = frameWidth ?? viewportWidth;

  const ranked = fixedOptions
    .map((value) => ({
      value,
      diff: Math.abs(
        effectiveWidth - (typeof value.width === "number" ? value.width : effectiveWidth),
      ),
    }))
    .sort((a, b) => a.diff - b.diff);

  let closest = ranked[0]?.value ?? viewportOptions[0];

  if (
    fullWidthViewport &&
    typeof closest.width === "number" &&
    typeof frameWidth === "number" &&
    closest.width < frameWidth
  ) {
    closest = fullWidthViewport;
  }

  if (typeof frameWidth === "number" && typeof closest.width === "number" && closest.width > frameWidth) {
    if (fullWidthViewport) {
      closest = fullWidthViewport;
    } else {
      const fitsFrame = fixedOptions
        .filter((v) => typeof v.width === "number" && v.width <= frameWidth)
        .sort((a, b) => (b.width as number) - (a.width as number));

      if (fitsFrame.length > 0) {
        closest = fitsFrame[0];
      }
    }
  }

  return closest;
}
