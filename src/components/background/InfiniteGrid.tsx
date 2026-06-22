"use client";

/**
 * @fileoverview High-performance InfiniteGrid background canvas component.
 *
 * Translates the vanilla JS `InteractiveGridEngine` (.ai/docs/assets/background/app.js)
 * into a React Client Component that:
 *  - Renders two stacked <canvas> layers (sharp + blurred) as a fixed full-screen background.
 *  - Animates a tiled, rotated Nexus logo grid on requestAnimationFrame with saturated
 *    accent-blue tinting. Light theme uses `logo-grid.svg` (glyph only, no stroke rings).
 *  - Tracks mouse position relative to the canvas wrapper (not the outer viewport)
 *    and scales the cursor spotlight from the wrapper's smaller dimension.
 *  - Applies a static radial vignette gradient above the tile grid.
 *  - Fully tears down listeners and animation frames on unmount.
 *
 * Mount once in `src/app/layout.tsx` so the engine persists across all routes.
 *
 * @module src/components/background/InfiniteGrid
 */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@teispace/next-themes";
import { BRAND } from "@/lib/assets";
import { loadGridIcon } from "./infiniteGridIconLoader";
import { syncInfiniteGridWrapperCursor } from "./infiniteGridCursorSync";
import {
  shouldStopGridMotionLoop,
  stepGridMotionScale,
} from "./infiniteGridMotionEase";
import {
  NEXUS_SCROLLPORT_GRID_METRICS_CHANGED_EVENT,
  isMobileScrollportGridPaintFrozen,
  usesMobileScrollportGridViewport,
} from "@/components/puck/lib/mobileScrollportGridFreeze";
import { NEXUS_PANEL_LAYOUT_SETTLED_EVENT } from "@/components/puck/lib/sidebarLayoutLimits";
import { isParentMobilePreviewHeightSyncActive } from "@/components/puck/lib/mobilePanelPreviewSync";

// ── Engine configuration ─────────────────────────────────────────────────────

/** Configuration options for the InfiniteGrid engine. */
interface EngineOptions {
  /** URL / path to the tiled SVG icon. Defaults to the Nexus logo. */
  iconSrc: string;
  /** Size in pixels of each repeating grid cell. */
  cellGridSize: number;
  /** Maximum bounding size of the icon within its cell. */
  iconScaleSize: number;
  /** Horizontal scroll speed in pixels per frame. */
  speedX: number;
  /** Vertical scroll speed in pixels per frame. */
  speedY: number;
  /** Global compositing alpha applied to the tile pattern. */
  globalOpacity: number;
  /** Clockwise rotation angle applied to the icon, in degrees. */
  rotationDegrees: number;
  /** CSS color string used to tint/mask the icon silhouette. */
  highlightColor: string;
  /** Radial gradient radius as a multiplier of max(width, height). */
  maxRadiusMultiplier: number;
  /** Color stops for the ambient vignette gradient drawn over the grid. */
  vignetteColorStops: Array<{ offset: number; color: string }>;
  /** Sharp core — mask inner stop (% of farthest-corner radius). Use 0 for no dead zone. */
  cursorSpotInnerPercent: number;
  /** Full blur ring — mask outer stop (% of farthest-corner radius). Controls glow size. */
  cursorSpotOuterPercent: number;
}

const DARK_THEME_OPTIONS: EngineOptions = {
  /** Glyph-only asset — `logo.svg` embeds CSS + hidden JPEG that WebKit skips on canvas. */
  iconSrc: BRAND.logoGrid,
  cellGridSize: 150,
  iconScaleSize: 109,
  speedX: 0.15,
  speedY: 0.15,
  globalOpacity: 0.52,
  rotationDegrees: -45,
  /** Saturated accent blue (Nexus `--accent-blue-medium`) at high alpha. */
  highlightColor: "#60a5fae8",
  maxRadiusMultiplier: 0.4,
  vignetteColorStops: [
    { offset: 0.0, color: "rgba(11, 15, 25, 0.0)" },
    { offset: 0.7, color: "rgba(11, 15, 25, 0.28)" },
    { offset: 0.9, color: "rgba(11, 15, 25, 0.58)" },
  ],
  cursorSpotInnerPercent: 2,
  cursorSpotOuterPercent: 14,
};

/** Light theme — glyph-only asset, richer blue tint for clearer logo marks. */
const LIGHT_THEME_OPTIONS: EngineOptions = {
  iconSrc: BRAND.logoGrid,
  cellGridSize: 150,
  iconScaleSize: 109,
  speedX: 0.15,
  speedY: 0.15,
  globalOpacity: 0.44,
  rotationDegrees: -45,
  /** Stronger saturated blue (Nexus `--accent-blue-strong`) so marks read on pale bg. */
  highlightColor: "#3b82f6c9",
  maxRadiusMultiplier: 0.4,
  vignetteColorStops: [
    { offset: 0.0, color: "rgba(255, 255, 255, 0.0)" },
    { offset: 0.7, color: "rgba(248, 250, 252, 0.18)" },
    { offset: 0.9, color: "rgba(226, 232, 240, 0.32)" },
  ],
  cursorSpotInnerPercent: 2,
  cursorSpotOuterPercent: 14,
};

/**
 * Desktop blur mirror — pattern-only canvas (no {@link drawSurfaceBase}) so CSS blur
 * does not smear an opaque fill into fog. Tune filter/opacity/mask, not surface paint.
 */
const BLUR_LAYER_TUNING = {
  /** CSS `filter: blur()` radius — was 8px (heavy wash); 5px keeps icon halos readable. */
  filterPx: 5,
  /** Composited opacity on `#canvas-blurred` — was 1.0 via `--cursor-active`. */
  cssOpacity: 0.58,
  /** Pattern alpha multiplier vs sharp layer — lowers smeared tint between grid marks. */
  patternOpacityScale: 0.72,
  /** Slight overscale hides blur fringe (matches `.ai/docs/assets/background/index.html`). */
  scale: 1.02,
} as const;

/**
 * Coarse-pointer (phone/tablet) tuning — smaller marks, slightly faster drift.
 * Applied on top of theme defaults when `(pointer: coarse)` matches.
 */
const TOUCH_ENGINE_OVERRIDES: Pick<
  EngineOptions,
  "cellGridSize" | "iconScaleSize" | "speedX" | "speedY"
> = {
  cellGridSize: 108,
  iconScaleSize: 79,
  speedX: 0.19,
  speedY: 0.19,
};

// ── Props ────────────────────────────────────────────────────────────────────

/** Optional overrides for the InfiniteGrid engine configuration. */
export interface InfiniteGridProps extends Partial<EngineOptions> {
  /** When true, grid is clipped to a parent (Puck preview canvas). */
  isContained?: boolean;
  /**
   * When true, eases tile scroll to a stop instead of snapping. Cursor ambient blur,
   * vignette (full-page), and pointer tracking stay active.
   */
  isStatic?: boolean;
  /** DOM id for the wrapper element; defaults to `nexus-bg` (layout-level grid). */
  wrapperId?: string;
  /** When true, tags the wrapper for desktop Puck canvas scrollport layering. */
  scrollportLayer?: boolean;
}

/**
 * Resolve whether the active theme is light from {@link useTheme} `resolvedTheme`.
 *
 * @param resolvedTheme - Theme string from `@teispace/next-themes`.
 * @returns True when the grid should use light-theme paint options.
 */
function resolveIsLightTheme(resolvedTheme: string | undefined): boolean {
  return resolvedTheme === "light";
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * InfiniteGrid background canvas component.
 *
 * Renders as a `position:fixed` (or `absolute` if contained) layer at `z-index:0` so it
 * stays behind page content (DOM order + content wrapper `z-index:1`). Avoids `z-index:-1`,
 * which WebKit paints behind `<body>` background on iOS Safari.
 *
 * @param props - Optional engine configuration overrides and containment flag.
 * @returns JSX containing the wrapper div and two canvas elements, or null if hidden.
 */
export function InfiniteGrid({
  isContained = false,
  isStatic = false,
  wrapperId = "nexus-bg",
  scrollportLayer = false,
  ...props
}: InfiniteGridProps) {
  const { resolvedTheme } = useTheme();
  const isLightTheme = resolveIsLightTheme(resolvedTheme);
  const themeDefaults = isLightTheme ? LIGHT_THEME_OPTIONS : DARK_THEME_OPTIONS;
  /** Coarse pointer — smaller tiles + faster scroll on phones. */
  const [isTouchLayout, setIsTouchLayout] = useState(false);
  const options: EngineOptions = {
    ...themeDefaults,
    ...(isTouchLayout ? TOUCH_ENGINE_OVERRIDES : {}),
    ...props,
  };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const sharpRef   = useRef<HTMLCanvasElement>(null);
  const blurredRef = useRef<HTMLCanvasElement>(null);
  /** Persist tile offsets across static/dynamic toggles so the grid never snaps. */
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  /** Scroll speed multiplier — eases between `0` (static) and `1` (dynamic). */
  const motionScaleRef = useRef(isStatic ? 0 : 1);
  /** Live static target — read inside RAF without restarting the engine effect. */
  const isStaticRef = useRef(isStatic);
  /** Restarts RAF when static/dynamic toggles while the loop is idle. */
  const ensureAnimLoopRef = useRef<(() => void) | null>(null);
  /** Live theme flag — read during RAF so surface paint tracks toggles before effect restart. */
  const isLightThemeRef = useRef(isLightTheme);
  isLightThemeRef.current = isLightTheme;
  /** Blur + mask on canvas breaks compositing on iOS — sharp layer only on touch. */
  const [showBlurLayer, setShowBlurLayer] = useState(true);
  const showCursorBlurLayer = showBlurLayer;

  useEffect(() => {
    const coarseMq = window.matchMedia("(pointer: coarse)");
    const updatePointerMode = () => {
      const touch = coarseMq.matches;
      setShowBlurLayer(!touch);
      setIsTouchLayout(touch);
    };
    updatePointerMode();
    coarseMq.addEventListener("change", updatePointerMode);
    return () => coarseMq.removeEventListener("change", updatePointerMode);
  }, []);

  useEffect(() => {
    isStaticRef.current = isStatic;
    ensureAnimLoopRef.current?.();
  }, [isStatic]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvasS = sharpRef.current;
    const canvasB = blurredRef.current;
    if (!wrapper || !canvasS || !canvasB) return;

    const ctxS = canvasS.getContext("2d");
    const ctxB = canvasB.getContext("2d");
    if (!ctxS || !ctxB) return;

    // Capture non-null refs for use inside closures
    const safeWrapper = wrapper;
    const safeCanvasS = canvasS;
    const safeCanvasB = canvasB;
    const safeCtxS    = ctxS;
    const safeCtxB    = ctxB;

    let animFrameId: number | null = null;
    let offsetX = offsetXRef.current;
    let offsetY = offsetYRef.current;
    let gridPattern: CanvasPattern | null = null;

    const ownerDocument = safeWrapper.ownerDocument;
    const ownerWindow = ownerDocument.defaultView ?? window;
    let lastFrameTs = ownerWindow.performance.now();
    const inPuckPreviewIframe =
      isContained &&
      ownerWindow.frameElement !== null &&
      ownerWindow.parent !== ownerWindow;
    const parentWindow = inPuckPreviewIframe ? ownerWindow.parent : null;

    /** True when static mode has fully eased — safe to idle the RAF loop. */
    function isMotionFullyStatic(): boolean {
      return shouldStopGridMotionLoop(motionScaleRef.current, isStaticRef.current);
    }

    /** Start the RAF loop when idle — used after static/dynamic toggles. */
    function ensureAnimLoop() {
      if (animFrameId !== null) return;
      lastFrameTs = ownerWindow.performance.now();
      animFrameId = ownerWindow.requestAnimationFrame(tick);
    }

    ensureAnimLoopRef.current = ensureAnimLoop;

    /**
     * Write mask centre as wrapper-local percentages.
     *
     * @param clientX - Pointer X in the same viewport as `safeWrapper` (iframe or top-level).
     * @param clientY - Pointer Y in the same viewport as `safeWrapper`.
     */
    function applyMaskPosition(clientX: number, clientY: number) {
      syncInfiniteGridWrapperCursor(safeWrapper, clientX, clientY);
    }

    /**
     * Locate the preview iframe in the parent document so `getBoundingClientRect()`
     * returns real parent-viewport coordinates (not the broken local 0,0 rect).
     */
    function getPreviewIframeInParent(): HTMLIFrameElement | null {
      if (!parentWindow) return null;
      for (const el of parentWindow.document.querySelectorAll("iframe")) {
        const frame = el as HTMLIFrameElement;
        if (frame.contentWindow === ownerWindow) return frame;
      }
      return ownerWindow.frameElement as HTMLIFrameElement | null;
    }

    /** Pointer inside the preview iframe — same viewport as the grid wrapper. */
    function onPointerMoveInside(e: PointerEvent) {
      if (e.buttons !== 0) return;
      applyMaskPosition(e.clientX, e.clientY);
    }

    /**
     * Pointer on Puck chrome (sidebars / toolbar) — clamp to the nearest canvas edge.
     * Uses the iframe rect from the parent document to avoid phantom opposite-edge glows.
     */
    function onPointerMoveParent(e: PointerEvent) {
      if (e.buttons !== 0 || !parentWindow) return;

      const iframeEl = getPreviewIframeInParent();
      if (!iframeEl) return;

      const frameRect = iframeEl.getBoundingClientRect();
      const inside =
        e.clientX >= frameRect.left &&
        e.clientX <= frameRect.right &&
        e.clientY >= frameRect.top &&
        e.clientY <= frameRect.bottom;

      // Over the preview viewport — iframe document listener owns tracking.
      if (inside) return;

      const ix = e.clientX - frameRect.left - iframeEl.clientLeft;
      const iy = e.clientY - frameRect.top - iframeEl.clientTop;

      applyMaskPosition(
        Math.min(Math.max(ix, 0), ownerWindow.innerWidth),
        Math.min(Math.max(iy, 0), ownerWindow.innerHeight)
      );
    }

    /** Full-page grid — pointer and wrapper share the top-level viewport. */
    function onPointerMovePage(e: PointerEvent) {
      if (e.buttons !== 0) return;
      applyMaskPosition(e.clientX, e.clientY);
    }

    let lastSyncedWidth = 0;
    let lastSyncedHeight = 0;
    let syncRafId: number | null = null;
    let syncDebounceId: ReturnType<typeof setTimeout> | null = null;
    let dpr = 1;

    /**
     * Read drawable CSS pixels for the grid wrapper.
     * Full-page grid uses viewport metrics — iOS often reports 0×0 on fixed `inset:0` rects.
     */
    function readWrapperCssSize() {
      const rect = safeWrapper.getBoundingClientRect();
      const vv = ownerWindow.visualViewport;

      const w = Math.round(
        rect.width > 1
          ? rect.width
          : vv?.width ?? ownerWindow.innerWidth
      );
      const h = Math.round(
        rect.height > 1
          ? rect.height
          : vv?.height ?? ownerWindow.innerHeight
      );

      return {
        w: Math.max(1, w),
        h: Math.max(1, h),
      };
    }

    /**
     * Drawable size for pattern fill — during panel ease use last bitmap dims so tiles are
     * CSS-scaled with the wrapper instead of re-rasterized every frame.
     */
    function readPaintCssSize() {
      if (
        scrollportLayer &&
        isMobileScrollportGridPaintFrozen() &&
        lastSyncedWidth > 0 &&
        lastSyncedHeight > 0
      ) {
        const scale = dpr || Math.min(ownerWindow.devicePixelRatio || 1, 2);
        return {
          w: Math.max(1, Math.round(lastSyncedWidth / scale)),
          h: Math.max(1, Math.round(lastSyncedHeight / scale)),
        };
      }

      return readWrapperCssSize();
    }

    /** Sync canvas pixel buffers to the wrapper element size (device-pixel aware). */
    function syncResolution() {
      if (scrollportLayer && isMobileScrollportGridPaintFrozen()) {
        return;
      }

      const { w, h } = readWrapperCssSize();
      dpr = Math.min(ownerWindow.devicePixelRatio || 1, 2);
      const bitmapW = Math.max(1, Math.round(w * dpr));
      const bitmapH = Math.max(1, Math.round(h * dpr));

      if (bitmapW === lastSyncedWidth && bitmapH === lastSyncedHeight) {
        return;
      }

      lastSyncedWidth = bitmapW;
      lastSyncedHeight = bitmapH;
      safeCanvasS.width = bitmapW;
      safeCanvasS.height = bitmapH;
      safeCanvasB.width = bitmapW;
      safeCanvasB.height = bitmapH;
      safeCtxS.setTransform(dpr, 0, 0, dpr, 0, 0);
      safeCtxB.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /** Batch / debounce resize work — contained grids skip per-frame canvas clears during sidebar drag. */
    function scheduleSyncResolution() {
      if (scrollportLayer && isMobileScrollportGridPaintFrozen()) {
        return;
      }

      if (isMotionFullyStatic()) {
        if (syncDebounceId !== null) clearTimeout(syncDebounceId);
        syncDebounceId = setTimeout(() => {
          syncDebounceId = null;
          paintOnce();
        }, 140);
        return;
      }

      if (isContained) {
        const parentDoc =
          inPuckPreviewIframe && parentWindow ? parentWindow.document : null;
        if (
          isParentMobilePreviewHeightSyncActive(parentDoc) &&
          !(scrollportLayer && usesMobileScrollportGridViewport())
        ) {
          if (syncRafId !== null) return;
          syncRafId = ownerWindow.requestAnimationFrame(() => {
            syncRafId = null;
            syncResolution();
            if (isMotionFullyStatic()) {
              paintOnce();
            } else {
              paintFrame();
              ensureAnimLoop();
            }
          });
          return;
        }

        if (syncDebounceId !== null) clearTimeout(syncDebounceId);
        syncDebounceId = setTimeout(() => {
          syncDebounceId = null;
          syncResolution();
        }, 140);
        return;
      }

      if (syncRafId !== null) return;
      syncRafId = ownerWindow.requestAnimationFrame(() => {
        syncRafId = null;
        syncResolution();
      });
    }

    /** Build the repeating tile pattern from the loaded icon image. */
    function buildPattern(img: HTMLImageElement) {
      const { cellGridSize, iconScaleSize, highlightColor, rotationDegrees } = options;

      const nW = img.naturalWidth  || img.width;
      const nH = img.naturalHeight || img.height;
      const aspect = nW / nH;

      let tW = iconScaleSize;
      let tH = iconScaleSize;
      if (nW > nH) {
        tH = iconScaleSize / aspect;
      } else {
        tW = iconScaleSize * aspect;
      }

      // Stencil: draw + tint the icon
      const stencil = document.createElement("canvas");
      stencil.width  = tW;
      stencil.height = tH;
      const sCtx = stencil.getContext("2d");
      if (!sCtx) return;
      sCtx.drawImage(img, 0, 0, tW, tH);
      sCtx.globalCompositeOperation = "source-in";
      sCtx.fillStyle = highlightColor;
      sCtx.fillRect(0, 0, tW, tH);

      // Cell tile: rotate and centre the stencil
      const cell = document.createElement("canvas");
      cell.width  = cellGridSize;
      cell.height = cellGridSize;
      const cCtx  = cell.getContext("2d");
      if (!cCtx) return;

      cCtx.save();
      cCtx.translate(cellGridSize / 2, cellGridSize / 2);
      cCtx.rotate((rotationDegrees * Math.PI) / 180);
      cCtx.drawImage(stencil, -(tW / 2), -(tH / 2), tW, tH);
      cCtx.restore();

      gridPattern = safeCtxS.createPattern(cell, "repeat");
    }

    /**
     * Draw the radial vignette gradient over the sharp canvas.
     * Called once per frame after the tile pattern is composited.
     */
    function drawVignette() {
      const { w, h } = readWrapperCssSize();
      const cx = w / 2;
      const cy = h / 2;
      const r  = Math.max(w, h) * options.maxRadiusMultiplier;

      const grad = safeCtxS.createRadialGradient(cx, cy, 0, cx, cy, r);
      options.vignetteColorStops.forEach(({ offset, color }) =>
        grad.addColorStop(offset, color)
      );

      safeCtxS.save();
      safeCtxS.fillStyle = grad;
      safeCtxS.fillRect(0, 0, w, h);
      safeCtxS.restore();
    }

    /**
     * Paint the theme surface under the tile grid so body can stay transparent.
     * Uses `resolvedTheme` from React — not `data-theme` on the document — so
     * repaints stay in sync when ThemeProvider updates the DOM in a parent effect.
     */
    function drawSurfaceBase(ctx: CanvasRenderingContext2D) {
      const { w, h } = readWrapperCssSize();
      ctx.save();
      ctx.fillStyle = isLightThemeRef.current ? "#f8fafc" : "#0f1729";
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    /** Whether `CanvasPattern.setTransform` is available (iOS < 16.4 lacks it). */
    const supportsPatternSetTransform =
      typeof CanvasPattern !== "undefined" &&
      "setTransform" in CanvasPattern.prototype;

    /**
     * Fill a canvas layer with the scrolling tile pattern.
     *
     * @param ctx - Target 2D context.
     * @param w - Drawable width in canvas pixels.
     * @param h - Drawable height in canvas pixels.
     */
    function fillPatternLayer(
      ctx: CanvasRenderingContext2D,
      w: number,
      h: number,
      opacityScale = 1
    ) {
      if (!gridPattern) return;

      ctx.save();
      ctx.globalAlpha = options.globalOpacity * opacityScale;
      ctx.fillStyle = gridPattern;

      if (supportsPatternSetTransform) {
        const mat = new DOMMatrix();
        mat.translateSelf(offsetX, offsetY);
        gridPattern.setTransform(mat);
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.translate(offsetX, offsetY);
        ctx.fillRect(
          -offsetX,
          -offsetY,
          w + options.cellGridSize,
          h + options.cellGridSize
        );
      }

      ctx.restore();
    }

    /** Paint one frame — shared by animated and static modes. */
    function paintFrame() {
      const { w, h } = readPaintCssSize();

      safeCtxS.setTransform(dpr, 0, 0, dpr, 0, 0);
      safeCtxB.setTransform(dpr, 0, 0, dpr, 0, 0);
      safeCtxS.clearRect(0, 0, w, h);
      safeCtxB.clearRect(0, 0, w, h);

      drawSurfaceBase(safeCtxS);
      // Blur layer stays pattern-only — solid fill + CSS blur reads as heavy fog (Puck editor).

      if (gridPattern) {
        const motionScale = motionScaleRef.current;
        if (motionScale > 0.01) {
          offsetX = (offsetX + options.speedX * motionScale) % options.cellGridSize;
          offsetY = (offsetY + options.speedY * motionScale) % options.cellGridSize;
        }
        offsetXRef.current = offsetX;
        offsetYRef.current = offsetY;

        fillPatternLayer(safeCtxS, w, h);

        if (!isContained) {
          drawVignette();
        }

        fillPatternLayer(
          safeCtxB,
          w,
          h,
          BLUR_LAYER_TUNING.patternOpacityScale
        );
      }
    }

    /** Main animation loop — runs while dynamic or easing between modes. */
    function tick(now: number) {
      const deltaMs = Math.min(Math.max(now - lastFrameTs, 0), 50);
      lastFrameTs = now;

      const targetScale = isStaticRef.current ? 0 : 1;
      motionScaleRef.current = stepGridMotionScale(
        motionScaleRef.current,
        targetScale,
        deltaMs,
      );

      paintFrame();

      if (isMotionFullyStatic()) {
        animFrameId = null;
        return;
      }

      animFrameId = ownerWindow.requestAnimationFrame(tick);
    }

    /** Static editor preview — repaint after layout without a RAF loop. */
    function paintOnce() {
      syncResolution();
      paintFrame();
    }

    // ── Bootstrap ────────────────────────────────────────────────────────────
    syncResolution();

    ownerWindow.addEventListener("resize", scheduleSyncResolution);
    ownerWindow.visualViewport?.addEventListener("resize", scheduleSyncResolution);
    ownerWindow.visualViewport?.addEventListener("scroll", scheduleSyncResolution);

    const onScrollportMetricsChanged = () => {
      if (!scrollportLayer || !usesMobileScrollportGridViewport()) return;
      if (isMobileScrollportGridPaintFrozen()) return;
      syncResolution();
      if (isMotionFullyStatic()) {
        paintOnce();
      } else {
        paintFrame();
        ensureAnimLoop();
      }
    };
    ownerWindow.addEventListener(
      NEXUS_SCROLLPORT_GRID_METRICS_CHANGED_EVENT,
      onScrollportMetricsChanged,
    );

    const onPanelLayoutSettled = () => {
      if (!scrollportLayer || !usesMobileScrollportGridViewport()) return;
      syncResolution();
      if (isMotionFullyStatic()) {
        paintOnce();
      } else {
        paintFrame();
        ensureAnimLoop();
      }
    };
    ownerWindow.addEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, onPanelLayoutSettled);

    if (inPuckPreviewIframe && parentWindow) {
      ownerDocument.addEventListener("pointermove", onPointerMoveInside, {
        passive: true,
      });
      parentWindow.addEventListener("pointermove", onPointerMoveParent, {
        passive: true,
      });
    } else {
      ownerDocument.addEventListener("pointermove", onPointerMovePage, {
        passive: true,
      });
    }

    /** Keep wrapper metrics in sync when the preview scrolls. */
    const onScroll = () => scheduleSyncResolution();
    ownerDocument.addEventListener("scroll", onScroll, { passive: true, capture: true });
    parentWindow?.document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        scheduleSyncResolution();
      });
      resizeObserver.observe(safeWrapper);
    }

    let cancelled = false;

    const fallbackSrc = BRAND.logoGrid;
    loadGridIcon(options.iconSrc, fallbackSrc)
      .then((img) => {
        if (cancelled) return;
        buildPattern(img);
        ensureAnimLoop();
      })
      .catch((error: unknown) => {
        console.error("[InfiniteGrid] Failed to load icon:", error);
      });

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      ensureAnimLoopRef.current = null;
      cancelled = true;
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      if (syncRafId !== null) ownerWindow.cancelAnimationFrame(syncRafId);
      if (syncDebounceId !== null) clearTimeout(syncDebounceId);
      ownerWindow.removeEventListener("resize", scheduleSyncResolution);
      ownerWindow.visualViewport?.removeEventListener("resize", scheduleSyncResolution);
      ownerWindow.visualViewport?.removeEventListener("scroll", scheduleSyncResolution);
      ownerWindow.removeEventListener(NEXUS_PANEL_LAYOUT_SETTLED_EVENT, onPanelLayoutSettled);
      ownerWindow.removeEventListener(
        NEXUS_SCROLLPORT_GRID_METRICS_CHANGED_EVENT,
        onScrollportMetricsChanged,
      );
      if (inPuckPreviewIframe && parentWindow) {
        ownerDocument.removeEventListener("pointermove", onPointerMoveInside);
        parentWindow.removeEventListener("pointermove", onPointerMoveParent);
      } else {
        ownerDocument.removeEventListener("pointermove", onPointerMovePage);
      }
      ownerDocument.removeEventListener("scroll", onScroll, true);
      parentWindow?.document.removeEventListener("scroll", onScroll, true);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isContained, isLightTheme, isTouchLayout, resolvedTheme, scrollportLayer]);

  const spotMask = `radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent ${options.cursorSpotInnerPercent}%, black ${options.cursorSpotOuterPercent}%)`;

  return (
    <div
      ref={wrapperRef}
      id={wrapperId}
      data-nexus-scrollport-grid={scrollportLayer ? "" : undefined}
      data-nexus-grid-static={isStatic ? "" : undefined}
      aria-hidden="true"
      style={{
        position: isContained ? "absolute" : "fixed",
        inset: 0,
        ...(isContained
          ? {}
          : {
              width: "100vw",
              height: "100dvh",
              minHeight: "100vh",
            }),
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
        backfaceVisibility: "hidden",
        ["--mouse-x" as string]: "50%",
        ["--mouse-y" as string]: "50%",
      }}
    >
      {/* Layer 1 — sharp tile grid + vignette */}
      <canvas
        ref={sharpRef}
        id="canvas-sharp"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          touchAction: "none",
        }}
      />

      {/* Layer 2 — blurred mirror, masked by cursor proximity (desktop pointer only) */}
      <canvas
        ref={blurredRef}
        id="canvas-blurred"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          touchAction: "none",
          display: showCursorBlurLayer ? "block" : "none",
          filter: showCursorBlurLayer
            ? `blur(${BLUR_LAYER_TUNING.filterPx}px)`
            : "none",
          opacity: showCursorBlurLayer ? BLUR_LAYER_TUNING.cssOpacity : 0,
          transform: showCursorBlurLayer
            ? `scale(${BLUR_LAYER_TUNING.scale})`
            : "none",
          maskImage: showCursorBlurLayer ? spotMask : "none",
          WebkitMaskImage: showCursorBlurLayer ? spotMask : "none",
        }}
      />
    </div>
  );
}

export default InfiniteGrid;
