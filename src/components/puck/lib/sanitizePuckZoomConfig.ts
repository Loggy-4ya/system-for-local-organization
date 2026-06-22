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
 * Fixed device presets (Phone / Tablet / Desktop) use Puck shrink-to-fit when the canvas
 * frame is narrower than the preset (phones / tablets / DevTools). When the frame is wider
 * than the preset, auto-fit zoom scales up (capped) so the preview uses most of the canvas —
 * especially important for the 360px phone preset on desktop editor columns.
 * Full-width (`100%`) keeps Puck's fit-to-canvas auto scale unchanged.
 */

/** Target fraction of canvas frame width used when letterboxing a fixed preset. */
export const LETTERBOX_DEVICE_FRAME_USAGE = 0.72;

/** Maximum auto-fit scale when letterboxing a narrow preset on a wide canvas. */
export const LETTERBOX_DEVICE_MAX_ZOOM = 1.42;

/**
 * Resolve the auto-fit zoom target when a fixed preset is letterboxed inside a wider canvas.
 *
 * @param viewportWidth - Active fixed preset width in px.
 * @param frameWidth - Measured `.PuckCanvas-inner` width in px.
 * @returns Scale factor ≥ 1×, capped at {@link LETTERBOX_DEVICE_MAX_ZOOM}.
 */
export function resolveLetterboxDeviceTargetZoom(
  viewportWidth: number,
  frameWidth: number,
): number {
  return Math.min(
    LETTERBOX_DEVICE_MAX_ZOOM,
    Math.max(1, (frameWidth * LETTERBOX_DEVICE_FRAME_USAGE) / viewportWidth),
  );
}

/**
 * Resolve auto-fit zoom on fixed device presets from canvas frame vs preset width.
 *
 * @param config - Sanitized Puck zoom config.
 * @param viewportWidth - Active viewport preset width from Puck UI.
 * @param frameWidth - Measured `.PuckCanvas-inner` width in px, when known.
 * @returns Zoom config — shrink-to-fit preserved when the frame is narrower than the preset.
 */
export function floorLetterboxDevicePreviewZoom(
  config: PuckZoomConfig,
  viewportWidth: number | "100%",
  frameWidth: number | undefined,
): PuckZoomConfig {
  if (viewportWidth === "100%" || typeof viewportWidth !== "number") {
    return config;
  }

  if (typeof frameWidth === "number" && frameWidth > 0 && frameWidth < viewportWidth) {
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

  if (
    typeof frameWidth === "number" &&
    frameWidth > viewportWidth &&
    (wasAutoShrinking || config.zoom >= 1)
  ) {
    const letterboxTarget = resolveLetterboxDeviceTargetZoom(viewportWidth, frameWidth);
    next.autoZoom = Math.max(next.autoZoom, letterboxTarget);
    if (wasAutoShrinking || config.zoom >= 1) {
      next.zoom = Math.max(next.zoom, letterboxTarget);
    }
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

/** @deprecated Use {@link LETTERBOX_DEVICE_FRAME_USAGE}. */
export const DESKTOP_LETTERBOX_FRAME_USAGE = LETTERBOX_DEVICE_FRAME_USAGE;

/** @deprecated Use {@link LETTERBOX_DEVICE_MAX_ZOOM}. */
export const DESKTOP_LETTERBOX_MAX_ZOOM = LETTERBOX_DEVICE_MAX_ZOOM;

/** @deprecated Use {@link resolveLetterboxDeviceTargetZoom}. */
export function resolveDesktopLetterboxTargetZoom(
  viewportWidth: number,
  frameWidth: number,
): number {
  return resolveLetterboxDeviceTargetZoom(viewportWidth, frameWidth);
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
 * Resolve the CSS transform scale Puck applies to `#puck-canvas-root`.
 *
 * Puck 0.21 sets `transform: scale(zoom)` only — `autoZoom` is metadata for the zoom UI
 * and shrink-to-fit bookkeeping, not a second transform factor.
 *
 * @param config - Sanitized Puck zoom config.
 * @returns Visual scale factor applied to the canvas root.
 */
export function resolvePuckPreviewVisualScale(config: PuckZoomConfig): number {
  return config.zoom;
}

/**
 * Resolve the visual (post-transform) height of `#puck-canvas-root` for scrollport sizing.
 *
 * @param config - Sanitized Puck zoom config.
 * @returns Estimated scaled height in px, or null when not computable.
 */
export function resolvePuckScaledRootHeightPx(config: PuckZoomConfig): number | null {
  const scale = resolvePuckPreviewVisualScale(config);
  const scaled = config.rootHeight * scale;
  if (!Number.isFinite(scaled) || scaled <= 0) {
    return null;
  }

  return Math.ceil(scaled);
}
