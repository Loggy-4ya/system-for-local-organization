/**
 * @fileoverview Shared Puck zoom-config sanitization and internal app-store access.
 *
 * Used by {@link NexusPuckZoomGuard} (production) and canvas stabilizers so NaN /
 * non-finite `rootHeight` / `zoom` / `autoZoom` values never reach Puck's preview layout.
 *
 * @module src/components/puck/lib/sanitizePuckZoomConfig
 */

/** Puck internal zoom config shape (subset). */
export interface PuckZoomConfig {
  /** Layout height Puck assigns to `#puck-canvas-root`, in px. */
  autoZoom: number;
  /** Unscaled preview document height, in px. */
  rootHeight: number;
  /** User-selected or auto-fit scale factor. */
  zoom: number;
}

/** Last-resort zoom config when Puck emits invalid numbers. */
export const DEFAULT_PUCK_ZOOM_CONFIG: PuckZoomConfig = {
  autoZoom: 1,
  rootHeight: 800,
  zoom: 1,
};

/** Minimal Puck app store surface used for zoom sanitization. */
export interface PuckInternalAppStore {
  getState: () => {
    zoomConfig: PuckZoomConfig;
    setZoomConfig: (config: PuckZoomConfig) => void;
  };
  setState: (partial: { setZoomConfig: (config: PuckZoomConfig) => void }) => void;
}

/**
 * Resolve Puck's internal app store when the editor has mounted.
 *
 * @returns App store or null before Puck mounts / outside the browser.
 */
export function resolvePuckAppStore(): PuckInternalAppStore | null {
  if (typeof window === "undefined") {
    return null;
  }

  const internal = (
    window as Window & { __PUCK_INTERNAL_DO_NOT_USE?: { appStore?: PuckInternalAppStore } }
  ).__PUCK_INTERNAL_DO_NOT_USE;

  return internal?.appStore ?? null;
}

/**
 * Clamp zoom config to finite positive numbers, falling back to the last known good config.
 *
 * @param next - Candidate zoom config from Puck.
 * @param fallback - Last known good config (defaults to {@link DEFAULT_PUCK_ZOOM_CONFIG}).
 * @returns Sanitized zoom config safe for layout and transform math.
 */
export function sanitizePuckZoomConfig(
  next: PuckZoomConfig,
  fallback: PuckZoomConfig = DEFAULT_PUCK_ZOOM_CONFIG,
): PuckZoomConfig {
  const rootHeight =
    Number.isFinite(next.rootHeight) && next.rootHeight > 0 ? next.rootHeight : fallback.rootHeight;
  const zoom = Number.isFinite(next.zoom) && next.zoom > 0 ? next.zoom : fallback.zoom;
  const autoZoom =
    Number.isFinite(next.autoZoom) && next.autoZoom > 0 ? next.autoZoom : fallback.autoZoom;

  return { rootHeight, zoom, autoZoom };
}

/**
 * Resolve the visual (post-transform) height of `#puck-canvas-root` for scrollport sizing.
 *
 * @param config - Sanitized Puck zoom config.
 * @returns Estimated scaled height in px, or null when not computable.
 */
export function resolvePuckScaledRootHeightPx(config: PuckZoomConfig): number | null {
  const scaled = config.rootHeight * config.zoom * config.autoZoom;
  if (!Number.isFinite(scaled) || scaled <= 0) {
    return null;
  }

  return Math.ceil(scaled);
}
