/**
 * @fileoverview Shared Puck zoom-config sanitization and internal app-store access.
 *
 * Used by {@link NexusPuckZoomGuard} (production) and canvas stabilizers so NaN /
 * non-finite `rootHeight` / `zoom` / `autoZoom` values never reach Puck's preview layout.
 *
 * Tests: `tests/puck/lib/desktopLetterboxZoom.test.ts` — `npm run test:desktop-letterbox-zoom`
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
 * Fixed device presets (Phone / Tablet / Desktop) never use Puck shrink-to-fit — preview
 * stays at ≥1× and the canvas scrolls horizontally when the preset is wider than the frame.
 * Full-width (`100%`) keeps Puck's fit-to-canvas auto scale.
 */

/**
 * Floor auto-fit zoom on fixed device presets so text stays readable on narrow editor columns.
 *
 * @param config - Sanitized Puck zoom config.
 * @param viewportWidth - Active viewport preset width from Puck UI.
 * @param _frameWidth - Reserved — fixed presets no longer shrink when wider than the frame.
 * @returns Zoom config with auto-fit scale floored at 1× for numeric presets.
 */
export function floorLetterboxDevicePreviewZoom(
  config: PuckZoomConfig,
  viewportWidth: number | "100%",
  _frameWidth: number | undefined,
): PuckZoomConfig {
  if (viewportWidth === "100%" || typeof viewportWidth !== "number") {
    return config;
  }

  const wasAutoShrinking = config.autoZoom < 1;
  const next: PuckZoomConfig = {
    ...config,
    autoZoom: Math.max(config.autoZoom, 1),
  };

  if (wasAutoShrinking && config.zoom < 1) {
    next.zoom = Math.max(config.zoom, 1);
  }

  return next;
}

/** @deprecated Use {@link floorLetterboxDevicePreviewZoom}. */
export function floorDesktopLetterboxDevicePreviewZoom(
  config: PuckZoomConfig,
  viewportWidth: number | "100%",
  frameWidth: number | undefined,
): PuckZoomConfig {
  return floorLetterboxDevicePreviewZoom(config, viewportWidth, frameWidth);
}

/** @deprecated Use {@link floorLetterboxDevicePreviewZoom}. */
export function resolveDesktopLetterboxReadablePreviewZoom(
  config: PuckZoomConfig,
  viewportWidth: number | "100%",
  frameWidth: number | undefined,
): PuckZoomConfig {
  return floorLetterboxDevicePreviewZoom(config, viewportWidth, frameWidth);
}

/** @deprecated Letterbox zoom boost removed — presets floor at 1× instead. */
export const DESKTOP_LETTERBOX_FRAME_USAGE = 0.88;

/** @deprecated Letterbox zoom boost removed — presets floor at 1× instead. */
export const DESKTOP_LETTERBOX_MAX_ZOOM = 1.85;

/** @deprecated Letterbox zoom boost removed — presets floor at 1× instead. */
export function resolveDesktopLetterboxTargetZoom(
  viewportWidth: number,
  frameWidth: number,
): number {
  return Math.max(1, (frameWidth * DESKTOP_LETTERBOX_FRAME_USAGE) / viewportWidth);
}

/** @deprecated Use {@link floorLetterboxDevicePreviewZoom}. */
export function clampDesktopLetterboxDevicePreviewZoom(
  config: PuckZoomConfig,
  viewportWidth: number | "100%",
  frameWidth: number | undefined,
): PuckZoomConfig {
  return floorLetterboxDevicePreviewZoom(config, viewportWidth, frameWidth);
}

/**
 * Read the active viewport width from Puck's internal app store.
 *
 * @param appStore - Puck internal app store from {@link resolvePuckAppStore}.
 * @returns Current viewport width or undefined when unavailable.
 */
export function resolvePuckViewportWidthFromAppStore(
  appStore: PuckInternalAppStore,
): number | "100%" | undefined {
  const state = appStore.getState() as {
    state?: { ui?: { viewports?: { current?: { width?: number | "100%" } } } };
  };

  return state.state?.ui?.viewports?.current?.width;
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
