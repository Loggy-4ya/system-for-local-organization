"use client";

/**
 * @fileoverview Centered full-area loading placeholder over the layout InfiniteGrid.
 *
 * Does not import InfiniteGrid — the root layout keeps `#nexus-bg` mounted while
 * this replaces route `{children}` during Suspense or dynamic import fallbacks.
 *
 * When loading exceeds {@link LOADER_AUTO_RETRY_DELAY_MS}, automatically reloads
 * the page (up to {@link LOADER_AUTO_RETRY_MAX} times per pathname per session).
 *
 * Tests: `tests/lib/loaderAutoRetryLogic.test.ts` — `npm run test:loader-auto-retry`
 *
 * @module src/components/ui/SiteLoader
 */

import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import {
  LOADER_AUTO_RETRY_DELAY_MS,
  canLoaderAutoRetry,
  clearLoaderAutoRetry,
  recordLoaderAutoRetry,
  resolveLoaderAutoRetryDelayMs,
} from "@/lib/loaderAutoRetryLogic";
import { cn } from "@/lib/utils";

/** Props for {@link SiteLoader}. */
export interface SiteLoaderProps {
  /** Optional status text below the spinner. Pass `null` to hide the label. */
  label?: string | null;
  /** Extra class names on the outer flex container. */
  className?: string;
  /**
   * When true (default), reload the page if this loader stays mounted past
   * {@link LOADER_AUTO_RETRY_DELAY_MS}.
   */
  autoRetry?: boolean;
  /** Override auto-reload delay in milliseconds. */
  autoRetryDelayMs?: number;
}

/**
 * Centered site loading state — spinner + optional label on the transparent page stack.
 *
 * @param props - See {@link SiteLoaderProps}.
 * @returns Site loader JSX.
 */
export function SiteLoader({
  label = "Loading…",
  className,
  autoRetry = true,
  autoRetryDelayMs = LOADER_AUTO_RETRY_DELAY_MS,
}: SiteLoaderProps) {
  const [retryExhausted, setRetryExhausted] = useState(false);
  const [pendingReload, setPendingReload] = useState(false);

  useEffect(() => {
    if (!autoRetry || typeof window === "undefined") {
      return undefined;
    }

    const pathname = window.location.pathname;
    const delayMs = resolveLoaderAutoRetryDelayMs(autoRetryDelayMs);
    let reloaded = false;

    const timeoutId = window.setTimeout(() => {
      if (!canLoaderAutoRetry(pathname)) {
        setRetryExhausted(true);
        return;
      }

      reloaded = true;
      setPendingReload(true);
      recordLoaderAutoRetry(pathname);
      window.location.reload();
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
      if (!reloaded) {
        clearLoaderAutoRetry(pathname);
      }
    };
  }, [autoRetry, autoRetryDelayMs]);

  const statusLabel = retryExhausted
    ? "Still loading"
    : pendingReload
      ? "Retrying…"
      : label;

  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-6",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner
        className="size-24 text-muted-foreground"
        strokeWidth={2.25}
      />
      {statusLabel ? (
        <p className="text-xl font-semibold tracking-tight text-muted-foreground">
          {statusLabel}
        </p>
      ) : null}
      {retryExhausted ? (
        <div className="flex flex-col items-center gap-3">
          <p className="m-0 max-w-xs text-center text-sm text-muted-foreground">
            This page is taking longer than expected. Try refreshing manually.
          </p>
          <button
            type="button"
            className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)]"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default SiteLoader;
