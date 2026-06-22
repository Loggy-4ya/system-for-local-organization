/**
 * @fileoverview Telegram Mini App viewport helpers — stable height and chrome colors.
 *
 * Desktop Telegram expands the WebView after {@link TelegramWebApp.expand}; Nexus must
 * mirror `viewportStableHeight` on the document so opaque surfaces fill the window and
 * the host WebView's default white backing does not show through.
 *
 * @module shared/lib/telegramWebAppViewport
 *
 * Tests: `npm run test:telegram-webapp-viewport`
 * Registry: `.ai/docs/testing.md`
 */

/** Minimal Telegram WebApp surface used for viewport sync. */
export interface TelegramWebAppViewportSource {
  /** Current viewport height in px (may change while expanded). */
  viewportHeight: number;
  /** Stable viewport height in px — preferred for layout min-height. */
  viewportStableHeight?: number;
  /** Marks the Web App ready for display. */
  ready: () => void;
  /** Expands the WebView to maximum available height. */
  expand: () => void;
  /** Optional — sync host chrome color with page background. */
  setBackgroundColor?: (color: string) => void;
  /** Optional — sync Telegram title bar color. */
  setHeaderColor?: (color: string) => void;
  /** Optional — legacy event subscription API. */
  onEvent?: (eventType: string, callback: () => void) => void;
  /** Optional — viewport change subscription (newer SDK). */
  onViewportChanged?: (callback: () => void) => void;
}

/** CSS custom property written from Telegram viewport metrics. */
export const TG_VIEWPORT_STABLE_HEIGHT_VAR = "--tg-viewport-stable-height";

/** CSS custom property for the live viewport height. */
export const TG_VIEWPORT_HEIGHT_VAR = "--tg-viewport-height";

/** CSS custom property mirrored from `window.innerWidth` inside the WebView. */
export const TG_VIEWPORT_WIDTH_VAR = "--tg-viewport-width";

/** CSS custom property mirrored from `window.innerHeight` inside the WebView. */
export const TG_VIEWPORT_WINDOW_HEIGHT_VAR = "--tg-viewport-window-height";

/** Document attribute toggled when running inside the Telegram WebView. */
export const TG_WEBAPP_ROOT_ATTR = "data-telegram-webapp";

/** Optional window metrics for desktop Telegram where SDK height lags behind the host. */
export interface TelegramWebAppWindowMetrics {
  /** `window.innerWidth` in px. */
  innerWidth?: number;
  /** `window.innerHeight` in px. */
  innerHeight?: number;
}

/**
 * Resolve the layout height Telegram expects the page to occupy.
 *
 * Prefers `viewportStableHeight` when present (desktop expand), otherwise falls
 * back to `viewportHeight`. When the host window is taller (common on Telegram
 * Desktop after `expand()`), use the larger measured value so opaque surfaces
 * fill the WebView backing.
 *
 * @param webApp - Telegram WebApp viewport source.
 * @param windowMetrics - Optional live window dimensions from the WebView.
 * @returns Height in pixels (minimum 1).
 */
export function resolveTelegramWebAppLayoutHeightPx(
  webApp: Pick<TelegramWebAppViewportSource, "viewportHeight" | "viewportStableHeight">,
  windowMetrics?: TelegramWebAppWindowMetrics,
): number {
  const stable = webApp.viewportStableHeight;
  const telegramHeight =
    typeof stable === "number" && stable > 0 ? stable : webApp.viewportHeight;
  const windowHeight =
    typeof windowMetrics?.innerHeight === "number" && windowMetrics.innerHeight > 0
      ? windowMetrics.innerHeight
      : 0;
  return Math.max(1, Math.round(Math.max(telegramHeight, windowHeight)));
}

/**
 * Resolve layout width — Telegram Desktop can expose a host window wider than the
 * first layout pass; mirror `window.innerWidth` so backgrounds fill horizontally.
 *
 * @param windowMetrics - Optional live window dimensions from the WebView.
 * @returns Width in pixels (minimum 1).
 */
export function resolveTelegramWebAppLayoutWidthPx(
  windowMetrics?: TelegramWebAppWindowMetrics,
): number {
  const windowWidth =
    typeof windowMetrics?.innerWidth === "number" && windowMetrics.innerWidth > 0
      ? windowMetrics.innerWidth
      : 0;
  return Math.max(1, Math.round(windowWidth));
}

/**
 * Build inline style declarations for Telegram viewport CSS variables.
 *
 * @param webApp - Telegram WebApp viewport source.
 * @param windowMetrics - Optional live window dimensions from the WebView.
 * @returns Map of CSS custom property names to pixel values.
 */
export function buildTelegramWebAppViewportStyleVars(
  webApp: Pick<TelegramWebAppViewportSource, "viewportHeight" | "viewportStableHeight">,
  windowMetrics?: TelegramWebAppWindowMetrics,
): Record<string, string> {
  const stablePx = resolveTelegramWebAppLayoutHeightPx(webApp, windowMetrics);
  const livePx = Math.max(
    1,
    Math.round(
      Math.max(
        webApp.viewportHeight,
        typeof windowMetrics?.innerHeight === "number" ? windowMetrics.innerHeight : 0,
      ),
    ),
  );
  const widthPx = resolveTelegramWebAppLayoutWidthPx(windowMetrics);

  return {
    [TG_VIEWPORT_STABLE_HEIGHT_VAR]: `${stablePx}px`,
    [TG_VIEWPORT_HEIGHT_VAR]: `${livePx}px`,
    [TG_VIEWPORT_WIDTH_VAR]: `${widthPx}px`,
    [TG_VIEWPORT_WINDOW_HEIGHT_VAR]: `${livePx}px`,
  };
}

/**
 * Normalize a CSS color token for Telegram host chrome APIs.
 *
 * Telegram accepts `#RRGGBB` — strips whitespace from computed custom properties.
 *
 * @param rawColor - Color string from CSS (e.g. `#0f1729`).
 * @param fallback - Value when `rawColor` is empty.
 * @returns Sanitized color string.
 */
export function normalizeTelegramWebAppChromeColor(
  rawColor: string,
  fallback = "#0f1729",
): string {
  const trimmed = rawColor.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}
