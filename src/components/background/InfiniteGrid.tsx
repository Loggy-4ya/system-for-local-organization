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

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@teispace/next-themes";
import { BRAND } from "@/lib/assets";

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
  iconSrc: BRAND.logo,
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
  cursorSpotInnerPercent: 0,
  cursorSpotOuterPercent: 22,
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
  cursorSpotInnerPercent: 0,
  cursorSpotOuterPercent: 22,
};

// ── Props ────────────────────────────────────────────────────────────────────

/** Optional overrides for the InfiniteGrid engine configuration. */
export interface InfiniteGridProps extends Partial<EngineOptions> {
  isContained?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * InfiniteGrid background canvas component.
 *
 * Renders as a `position:fixed` (or `absolute` if contained) layer with `z-index:-1` so it
 * stays behind all page content.
 *
 * @param props - Optional engine configuration overrides and containment flag.
 * @returns JSX containing the wrapper div and two canvas elements, or null if hidden.
 */
export function InfiniteGrid({ isContained = false, ...props }: InfiniteGridProps) {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const themeDefaults =
    resolvedTheme === "light" ? LIGHT_THEME_OPTIONS : DARK_THEME_OPTIONS;
  const options: EngineOptions = { ...themeDefaults, ...props };

  const wrapperRef = useRef<HTMLDivElement>(null);
  const sharpRef   = useRef<HTMLCanvasElement>(null);
  const blurredRef = useRef<HTMLCanvasElement>(null);

  /** Hide the global instance on editor routes; contained copies inside PageRoot stay active. */
  const isHidden =
    !isContained && (pathname === "/edit" || pathname.endsWith("/edit"));

  useEffect(() => {
    if (isHidden || !wrapperRef.current) return;

    const wrapper  = wrapperRef.current;
    const canvasS  = sharpRef.current;
    const canvasB  = blurredRef.current;
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
    let offsetX = 0;
    let offsetY = 0;
    let gridPattern: CanvasPattern | null = null;

    const ownerDocument = safeWrapper.ownerDocument;
    const ownerWindow = ownerDocument.defaultView ?? window;
    const inPuckPreviewIframe =
      isContained &&
      ownerWindow.frameElement !== null &&
      ownerWindow.parent !== ownerWindow;
    const parentWindow = inPuckPreviewIframe ? ownerWindow.parent : null;

    /**
     * Write mask centre as wrapper-local percentages.
     *
     * @param clientX - Pointer X in the same viewport as `safeWrapper` (iframe or top-level).
     * @param clientY - Pointer Y in the same viewport as `safeWrapper`.
     */
    function applyMaskPosition(clientX: number, clientY: number) {
      const rect = safeWrapper.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
      const pctX = ((x / rect.width) * 100).toFixed(2);
      const pctY = ((y / rect.height) * 100).toFixed(2);
      safeWrapper.style.setProperty("--mouse-x", `${pctX}%`);
      safeWrapper.style.setProperty("--mouse-y", `${pctY}%`);
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

    /** Sync canvas pixel buffers to the wrapper element size. */
    function syncResolution() {
      const rect = safeWrapper.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);

      safeCanvasS.width = w;
      safeCanvasS.height = h;
      safeCanvasB.width = w;
      safeCanvasB.height = h;
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
      const w  = safeCanvasS.width;
      const h  = safeCanvasS.height;
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

    /** Main animation loop — runs on every frame. */
    function tick() {
      safeCtxS.clearRect(0, 0, safeCanvasS.width, safeCanvasS.height);
      safeCtxB.clearRect(0, 0, safeCanvasB.width, safeCanvasB.height);

      if (gridPattern) {
        offsetX = (offsetX + options.speedX) % options.cellGridSize;
        offsetY = (offsetY + options.speedY) % options.cellGridSize;

        const mat = new DOMMatrix();
        mat.translateSelf(offsetX, offsetY);
        gridPattern.setTransform(mat);

        // Sharp layer
        safeCtxS.save();
        safeCtxS.globalAlpha = options.globalOpacity;
        safeCtxS.fillStyle   = gridPattern;
        safeCtxS.fillRect(0, 0, safeCanvasS.width, safeCanvasS.height);
        safeCtxS.restore();

        // Static center vignette only on the full-page grid — it duplicates the cursor glow in Puck.
        if (!isContained) {
          drawVignette();
        }

        // Blurred mirror layer
        safeCtxB.save();
        safeCtxB.globalAlpha = options.globalOpacity;
        safeCtxB.fillStyle   = gridPattern;
        safeCtxB.fillRect(0, 0, safeCanvasB.width, safeCanvasB.height);
        safeCtxB.restore();
      }

      animFrameId = requestAnimationFrame(tick);
    }

    // ── Bootstrap ────────────────────────────────────────────────────────────
    syncResolution();

    ownerWindow.addEventListener("resize", syncResolution);

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
    const onScroll = () => syncResolution();
    ownerDocument.addEventListener("scroll", onScroll, { passive: true, capture: true });
    parentWindow?.document.addEventListener("scroll", onScroll, {
      passive: true,
      capture: true,
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        syncResolution();
      });
      resizeObserver.observe(safeWrapper);
    }

    /**
     * Load the grid icon, falling back to the full logo if the light-theme asset
     * is missing or fails XML validation in the browser.
     *
     * @param src - Primary icon URL.
     * @param fallback - Secondary URL when primary fails.
     */
    function loadIcon(src: string, fallback: string) {
      const img = new Image();
      img.onload = () => {
        buildPattern(img);
        tick();
      };
      img.onerror = () => {
        if (src !== fallback) {
          loadIcon(fallback, fallback);
          return;
        }
        console.error("[InfiniteGrid] Failed to load icon:", src);
      };
      img.src = src;
    }

    const fallbackSrc =
      options.iconSrc === BRAND.logoGrid ? BRAND.logo : options.iconSrc;
    loadIcon(options.iconSrc, fallbackSrc);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      if (animFrameId !== null) cancelAnimationFrame(animFrameId);
      ownerWindow.removeEventListener("resize", syncResolution);
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
  }, [isContained, isHidden, resolvedTheme]);

  if (isHidden) {
    return null;
  }

  const spotMask = `radial-gradient(circle at var(--mouse-x) var(--mouse-y), transparent ${options.cursorSpotInnerPercent}%, black ${options.cursorSpotOuterPercent}%)`;

  return (
    <div
      ref={wrapperRef}
      id="nexus-bg"
      aria-hidden="true"
      style={{
        position: isContained ? "absolute" : "fixed",
        inset: 0,
        zIndex: -1,
        pointerEvents: "none",
        overflow: "hidden",
        ["--mouse-x" as string]: "50%",
        ["--mouse-y" as string]: "50%",
        ["--cursor-active" as string]: "1",
      }}
    >
      {/* Layer 1 — sharp tile grid + vignette */}
      <canvas
        ref={sharpRef}
        id="canvas-sharp"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* Layer 2 — blurred mirror, masked by cursor proximity */}
      <canvas
        ref={blurredRef}
        id="canvas-blurred"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: "blur(8px)",
          opacity: "var(--cursor-active, 1)",
          maskImage: spotMask,
          WebkitMaskImage: spotMask,
        }}
      />
    </div>
  );
}

export default InfiniteGrid;
