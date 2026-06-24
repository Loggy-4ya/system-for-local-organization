"use client";

/**
 * @fileoverview Shared animated toast card for all site notification stacks.
 *
 * Handles slide-in on mount and slide-out before removal (manual dismiss or auto-dismiss).
 *
 * @module src/components/notifications/SiteToastCard
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  isSiteToastExitAnimationEnd,
  SITE_TOAST_EXIT_MS,
} from "@/lib/siteToastMotion";

/** Visual variant shared by client, broadcast, and task reminder toasts. */
export type SiteToastVariant = "info" | "success" | "warning" | "error";

/** Tailwind/CSS variant class map for toast accents. */
export const SITE_TOAST_VARIANT_CLASS: Record<SiteToastVariant, string> = {
  info: "site-broadcast-toast--info",
  success: "site-broadcast-toast--success",
  warning: "site-broadcast-toast--warning",
  error: "site-broadcast-toast--error",
};

/** Props for {@link SiteToastCard}. */
export interface SiteToastCardProps {
  /** Accent variant. */
  variant: SiteToastVariant;
  /** Accessible label for the dismiss control. */
  dismissLabel: string;
  /** Called after the exit animation completes. */
  onDismissComplete: () => void;
  /** Auto-dismiss delay in ms (`0` = manual dismiss only). */
  autoDismissMs?: number;
  /** Toast title/body/action content. */
  children: ReactNode;
  /** Optional footer actions that can trigger animated dismiss (e.g. “View task” link). */
  footer?: (controls: { beginExit: () => void }) => ReactNode;
}

/**
 * Animated toast surface used by client, broadcast, and task reminder hosts.
 *
 * @param props - See {@link SiteToastCardProps}.
 * @returns Toast card JSX.
 */
export function SiteToastCard({
  variant,
  dismissLabel,
  onDismissComplete,
  autoDismissMs = 0,
  children,
  footer,
}: SiteToastCardProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const exitStartedRef = useRef(false);
  const [exiting, setExiting] = useState(false);

  const beginExit = useCallback(() => {
    if (exitStartedRef.current) return;
    exitStartedRef.current = true;
    setExiting(true);
  }, []);

  useEffect(() => {
    if (!autoDismissMs || autoDismissMs <= 0) return;
    const timer = window.setTimeout(beginExit, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [autoDismissMs, beginExit]);

  useEffect(() => {
    if (!exiting) return;

    const root = rootRef.current;
    if (!root) {
      onDismissComplete();
      return;
    }

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (!isSiteToastExitAnimationEnd(event)) return;
      onDismissComplete();
    };

    root.addEventListener("animationend", handleAnimationEnd);

    const fallbackTimer = window.setTimeout(() => {
      onDismissComplete();
    }, SITE_TOAST_EXIT_MS + 80);

    return () => {
      root.removeEventListener("animationend", handleAnimationEnd);
      window.clearTimeout(fallbackTimer);
    };
  }, [exiting, onDismissComplete]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "site-broadcast-toast glass-panel",
        SITE_TOAST_VARIANT_CLASS[variant],
        exiting && "site-broadcast-toast--exiting",
      )}
    >
      <div className="site-broadcast-toast__content">
        {children}
        {footer ? footer({ beginExit }) : null}
      </div>
      <button
        type="button"
        className="site-broadcast-toast__dismiss"
        onClick={beginExit}
        aria-label={dismissLabel}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export default SiteToastCard;
