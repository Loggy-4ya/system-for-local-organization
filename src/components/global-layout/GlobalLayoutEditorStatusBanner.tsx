"use client";

/**
 * @fileoverview Animated save/error status banner for the Global Layout Editor shell.
 *
 * Uses grid-height + opacity transitions in `global-layout-editor.css` so the alert
 * slides/fades in and collapses smoothly without leaving a layout gap.
 *
 * @module src/components/global-layout/GlobalLayoutEditorStatusBanner
 */

import React, { useEffect, useRef, useState } from "react";

/** Payload for a transient editor status message. */
export interface GlobalLayoutEditorStatus {
  /** Visual tone and ARIA role mapping. */
  type: "success" | "error";
  /** User-facing message text. */
  message: string;
}

/** Props for {@link GlobalLayoutEditorStatusBanner}. */
export interface GlobalLayoutEditorStatusBannerProps {
  /** Current status from parent; `null` triggers the exit animation. */
  status: GlobalLayoutEditorStatus | null;
}

/** Exit animation length — keep in sync with `--global-layout-status-duration`. */
const STATUS_EXIT_MS = 280;

/**
 * Save/error banner with smooth enter and exit transitions.
 *
 * @param props - See {@link GlobalLayoutEditorStatusBannerProps}.
 * @returns Animated status banner markup, or `null` when fully dismissed.
 */
export function GlobalLayoutEditorStatusBanner({ status }: GlobalLayoutEditorStatusBannerProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [displayStatus, setDisplayStatus] = useState<GlobalLayoutEditorStatus | null>(null);
  const mountedRef = useRef(false);
  const exitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }

    if (status) {
      mountedRef.current = true;
      setDisplayStatus(status);
      setMounted(true);
      setVisible(false);

      const enterFrame = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });

      return () => window.cancelAnimationFrame(enterFrame);
    }

    if (!mountedRef.current) {
      return undefined;
    }

    setVisible(false);
    exitTimerRef.current = window.setTimeout(() => {
      mountedRef.current = false;
      setMounted(false);
      setDisplayStatus(null);
      exitTimerRef.current = null;
    }, STATUS_EXIT_MS);

    return () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
  }, [status]);

  if (!mounted || !displayStatus) {
    return null;
  }

  return (
    <div
      className={
        visible
          ? "global-layout-editor__status-wrap global-layout-editor__status-wrap--visible"
          : "global-layout-editor__status-wrap"
      }
    >
      <div className="global-layout-editor__status-inner">
        <div
          role={displayStatus.type === "error" ? "alert" : "status"}
          className={
            displayStatus.type === "error"
              ? "global-layout-editor__status global-layout-editor__status--error"
              : "global-layout-editor__status global-layout-editor__status--success"
          }
        >
          {displayStatus.message}
        </div>
      </div>
    </div>
  );
}

export default GlobalLayoutEditorStatusBanner;
