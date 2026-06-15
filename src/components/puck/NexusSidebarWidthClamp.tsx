"use client";

/**
 * @fileoverview Clamp Puck sidebar drag widths to Nexus min/max limits.
 *
 * Puck only enforces a 192px floor on horizontal resize. This component clamps
 * persisted and live widths so sidebars cannot starve the canvas column.
 *
 * @module src/components/puck/NexusSidebarWidthClamp
 */

import { useGetPuck } from "@puckeditor/core";
import { useEffect, useRef } from "react";
import {
  clampSidebarWidth,
  PUCK_SIDEBAR_WIDTHS_STORAGE_KEY,
  resolveSidebarWidthLimits,
} from "@/components/puck/lib/sidebarLayoutLimits";
import { useNexusPuck } from "@/components/puck/lib/useNexusPuck";

/** Parsed Puck sidebar width persistence shape. */
interface PuckSidebarWidthsStorage {
  left?: number;
  right?: number;
}

/**
 * Parse a CSS length value like `320px` into a number.
 *
 * @param value - Raw inline style value.
 * @returns Width in px, or undefined when not parseable.
 */
function parsePxValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed.endsWith("px")) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Clamp inline sidebar CSS variables on the Puck layout root during drag.
 *
 * @param limits - Current viewport band limits.
 */
function clampLayoutSidebarCssVars(limits: ReturnType<typeof resolveSidebarWidthLimits>): void {
  const layout = document.querySelector('[class*="PuckLayout-inner"]') as HTMLElement | null;
  if (!layout) return;

  const leftVar = layout.style.getPropertyValue("--puck-user-left-side-bar-width");
  const rightVar = layout.style.getPropertyValue("--puck-user-right-side-bar-width");

  if (leftVar) {
    const left = parsePxValue(leftVar);
    if (left !== undefined) {
      const clamped = clampSidebarWidth(left, limits.leftMin, limits.leftMax);
      if (clamped !== left) {
        layout.style.setProperty("--puck-user-left-side-bar-width", `${clamped}px`);
      }
    }
  }

  if (rightVar) {
    const right = parsePxValue(rightVar);
    if (right !== undefined) {
      const clamped = clampSidebarWidth(right, limits.rightMin, limits.rightMax);
      if (clamped !== right) {
        layout.style.setProperty("--puck-user-right-side-bar-width", `${clamped}px`);
      }
    }
  }
}

/**
 * Sanitize persisted Puck sidebar widths in `localStorage`.
 *
 * @param limits - Current viewport band limits.
 * @returns Sanitized storage payload when changes were required.
 */
function sanitizePersistedSidebarWidths(
  limits: ReturnType<typeof resolveSidebarWidthLimits>,
): PuckSidebarWidthsStorage | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(PUCK_SIDEBAR_WIDTHS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PuckSidebarWidthsStorage;
    const next: PuckSidebarWidthsStorage = { ...parsed };
    let changed = false;

    if (typeof parsed.left === "number") {
      const clamped = clampSidebarWidth(parsed.left, limits.leftMin, limits.leftMax);
      if (clamped !== parsed.left) {
        next.left = clamped;
        changed = true;
      }
    }

    if (typeof parsed.right === "number") {
      const clamped = clampSidebarWidth(parsed.right, limits.rightMin, limits.rightMax);
      if (clamped !== parsed.right) {
        next.right = clamped;
        changed = true;
      }
    }

    if (!changed) return null;

    localStorage.setItem(PUCK_SIDEBAR_WIDTHS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

/**
 * Silent Puck child — enforces desktop sidebar max widths.
 *
 * @returns null
 */
export function NexusSidebarWidthClamp() {
  const getPuck = useGetPuck();
  const leftWidth = useNexusPuck((state) => state.appState.ui.leftSideBarWidth);
  const rightWidth = useNexusPuck((state) => state.appState.ui.rightSideBarWidth);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncWidths = () => {
      if (window.innerWidth <= 900) return;

      const limits = resolveSidebarWidthLimits(window.innerWidth);
      const { appState, dispatch } = getPuck();
      const ui = appState.ui;
      const nextUi: { leftSideBarWidth?: number; rightSideBarWidth?: number } = {};

      if (typeof ui.leftSideBarWidth === "number") {
        const clamped = clampSidebarWidth(ui.leftSideBarWidth, limits.leftMin, limits.leftMax);
        if (clamped !== ui.leftSideBarWidth) {
          nextUi.leftSideBarWidth = clamped;
        }
      }

      if (typeof ui.rightSideBarWidth === "number") {
        const clamped = clampSidebarWidth(ui.rightSideBarWidth, limits.rightMin, limits.rightMax);
        if (clamped !== ui.rightSideBarWidth) {
          nextUi.rightSideBarWidth = clamped;
        }
      }

      if (Object.keys(nextUi).length > 0) {
        dispatch({
          type: "setUi",
          ui: nextUi,
          recordHistory: false,
        });

        try {
          const raw = localStorage.getItem(PUCK_SIDEBAR_WIDTHS_STORAGE_KEY);
          const parsed = raw ? (JSON.parse(raw) as PuckSidebarWidthsStorage) : {};
          localStorage.setItem(
            PUCK_SIDEBAR_WIDTHS_STORAGE_KEY,
            JSON.stringify({ ...parsed, ...nextUi }),
          );
        } catch {
          /* ignore persistence errors */
        }
      }

      clampLayoutSidebarCssVars(limits);
    };

    const limits = resolveSidebarWidthLimits(window.innerWidth);
    const sanitized = sanitizePersistedSidebarWidths(limits);

    if (sanitized) {
      const { dispatch } = getPuck();
      const ui: { leftSideBarWidth?: number; rightSideBarWidth?: number } = {};
      if (typeof sanitized.left === "number") ui.leftSideBarWidth = sanitized.left;
      if (typeof sanitized.right === "number") ui.rightSideBarWidth = sanitized.right;

      if (Object.keys(ui).length > 0) {
        dispatch({ type: "setUi", ui, recordHistory: false });
      }
    }

    syncWidths();

    const onViewportChange = () => syncWidths();
    window.addEventListener("resize", syncWidths);
    window.addEventListener("viewportchange", onViewportChange);

    const stopDragLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const runDragLoop = () => {
      if (!document.querySelector("[data-resize-overlay]")) {
        stopDragLoop();
        return;
      }

      clampLayoutSidebarCssVars(resolveSidebarWidthLimits(window.innerWidth));
      rafRef.current = requestAnimationFrame(runDragLoop);
    };

    const overlayObserver = new MutationObserver(() => {
      if (document.querySelector("[data-resize-overlay]")) {
        stopDragLoop();
        runDragLoop();
      } else {
        stopDragLoop();
        syncWidths();
      }
    });

    overlayObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener("resize", syncWidths);
      window.removeEventListener("viewportchange", onViewportChange);
      overlayObserver.disconnect();
      stopDragLoop();
    };
  }, [getPuck, leftWidth, rightWidth]);

  return null;
}

export default NexusSidebarWidthClamp;
