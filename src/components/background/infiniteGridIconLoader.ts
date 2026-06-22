/**
 * @fileoverview Safari-safe SVG → canvas icon loading for InfiniteGrid.
 *
 * WebKit often fires `img.onload` before embedded SVG subresources and internal
 * stylesheets are ready, yielding a blank `drawImage` on iOS. This module loads
 * via blob URL when fetch succeeds, retries with backoff, validates rasterized
 * alpha, and falls back to direct `<img>` loading when fetch is blocked.
 *
 * Tests: `tests/components/background/infiniteGridIconLoader.test.ts` — `npm run test:infinite-grid-icon-loader`
 *
 * @module src/components/background/infiniteGridIconLoader
 */

/** Delay between Safari SVG raster retries (ms). */
const SAFARI_RETRY_DELAYS_MS = [0, 80, 180] as const;

/**
 * @param ms - Milliseconds to wait.
 * @returns Promise that resolves after the delay.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Whether the current engine needs WebKit SVG→canvas workarounds.
 *
 * All iOS browsers (Safari, Chrome, Firefox) use WebKit under the hood.
 *
 * @param userAgent - `navigator.userAgent` string.
 * @returns True when raster validation retries should run.
 */
export function isWebKitEngine(userAgent: string): boolean {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return true;
  return /AppleWebKit/i.test(userAgent) && !/Chrome|Chromium|Edg/i.test(userAgent);
}

/**
 * Resolve a root-relative or absolute grid icon URL against a document origin.
 *
 * @param src - Asset path or absolute URL.
 * @param origin - Document origin such as `https://app.example.com`.
 * @returns Absolute URL suitable for fetch or `<img src>`.
 */
export function resolveGridIconUrl(src: string, origin: string): string {
  const trimmed = src.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (/^(blob:|data:)/i.test(trimmed)) return trimmed;

  const base = origin.replace(/\/$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

/**
 * Read the active document origin for asset resolution.
 *
 * @returns Origin string, or empty when unavailable (SSR).
 */
function getDocumentOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

/**
 * Fetch an asset and expose it as a same-origin blob URL for `<img>` loading.
 *
 * @param src - Absolute asset URL.
 * @returns Object URL, or `null` when fetch fails (extensions, offline, CORS).
 */
async function fetchAsBlobUrl(src: string): Promise<string | null> {
  try {
    const response = await fetch(src, { cache: "force-cache", credentials: "same-origin" });
    if (!response.ok) {
      console.warn(`[InfiniteGrid] HTTP ${response.status} for ${src}`);
      return null;
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn("[InfiniteGrid] fetch failed — falling back to direct image load:", src, error);
    return null;
  }
}

/**
 * Load a single image URL and resolve when `onload` fires.
 *
 * @param src - Image URL (blob or path).
 * @returns Loaded HTMLImageElement.
 */
function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`[InfiniteGrid] Image error: ${src}`));
    img.src = src;
  });
}

/**
 * Draw the icon into a probe canvas and check for any non-transparent pixels.
 *
 * @param img - Loaded icon image.
 * @returns True when raster content is present.
 */
export function iconHasRasterContent(img: HTMLImageElement): boolean {
  const probe = document.createElement("canvas");
  const size = 48;
  probe.width = size;
  probe.height = size;
  const ctx = probe.getContext("2d");
  if (!ctx) return false;

  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);

  const { data } = ctx.getImageData(0, 0, size, size);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true;
  }
  return false;
}

/**
 * Load one SVG (or raster) URL with WebKit retries until raster content appears.
 *
 * @param src - Primary asset path.
 * @param useWebKitRetries - When true, backoff-retry after load.
 * @returns Loaded image with verified pixels, or null when blank after retries.
 */
async function loadWithRasterValidation(
  src: string,
  useWebKitRetries: boolean
): Promise<HTMLImageElement | null> {
  const origin = getDocumentOrigin();
  const resolvedSrc = origin ? resolveGridIconUrl(src, origin) : src;
  let blobUrl: string | null = null;
  let shouldRevokeBlob = false;

  try {
    blobUrl = await fetchAsBlobUrl(resolvedSrc);
    const loadSrc = blobUrl ?? resolvedSrc;
    shouldRevokeBlob = blobUrl !== null;

    const delays = useWebKitRetries ? SAFARI_RETRY_DELAYS_MS : [0];

    for (const delay of delays) {
      if (delay > 0) await sleep(delay);

      try {
        const img = await loadImageElement(loadSrc);
        if (iconHasRasterContent(img)) {
          shouldRevokeBlob = false;
          return img;
        }
      } catch {
        // Try next delay cycle.
      }
    }

    return null;
  } finally {
    if (blobUrl && shouldRevokeBlob) {
      URL.revokeObjectURL(blobUrl);
    }
  }
}

/**
 * Load the grid tile icon, trying primary then fallback URLs.
 *
 * Uses `logo-grid.svg` (inline fill) as the reliable fallback because
 * `logo.svg` embeds CSS classes and a hidden JPEG that WebKit often skips.
 *
 * @param primarySrc - Preferred icon URL.
 * @param fallbackSrc - Secondary URL when primary rasterizes blank.
 * @returns Loaded image element with non-empty raster content.
 */
export async function loadGridIcon(
  primarySrc: string,
  fallbackSrc: string
): Promise<HTMLImageElement> {
  const useWebKitRetries =
    typeof navigator !== "undefined" && isWebKitEngine(navigator.userAgent);

  const candidates =
    primarySrc === fallbackSrc ? [primarySrc] : [primarySrc, fallbackSrc];

  for (const src of candidates) {
    const img = await loadWithRasterValidation(src, useWebKitRetries);
    if (img) return img;
  }

  throw new Error(
    `[InfiniteGrid] Icon rasterized blank after retries: ${primarySrc}`
  );
}
