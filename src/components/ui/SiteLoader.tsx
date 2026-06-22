"use client";

/**
 * @fileoverview Centered full-area loading placeholder over the layout InfiniteGrid.
 *
 * Does not import InfiniteGrid — the root layout keeps `#nexus-bg` mounted while
 * this replaces route `{children}` during Suspense or dynamic import fallbacks.
 *
 * Recovery when stuck (e.g. browser back leaving Suspense open):
 * 1. Soft `router.refresh()` — fast on history navigation (~400ms).
 * 2. Hard `location.reload()` — fallback if still mounted (1.2s back / 4.5s default).
 *
 * Tests:
 * - `npm run test:loader-auto-retry`
 * - `npm run test:route-loader-recovery`
 *
 * @module src/components/ui/SiteLoader
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import {
  canLoaderAutoRetry,
  clearLoaderAutoRetry,
  recordLoaderAutoRetry,
} from "@/lib/loaderAutoRetryLogic";
import {
  resolveLoaderRecoveryDelays,
  shouldTreatAsBackNavigation,
} from "@/lib/routeLoaderRecoveryLogic";
import { cn } from "@/lib/utils";

/** Props for {@link SiteLoader}. */
export interface SiteLoaderProps {
  /** Optional status text below the spinner. Pass `null` to hide the label. */
  label?: string | null;
  /** Extra class names on the outer flex container. */
  className?: string;
  /**
   * When true (default), recover if this loader stays mounted: soft refresh first,
   * then hard reload up to {@link LOADER_AUTO_RETRY_MAX} times per pathname.
   */
  autoRetry?: boolean;
  /** Override hard-reload delay in milliseconds (soft refresh timing is unchanged). */
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
  autoRetryDelayMs,
}: SiteLoaderProps) {
  const router = useRouter();
  const [retryExhausted, setRetryExhausted] = useState(false);
  const [recoveryPhase, setRecoveryPhase] = useState<"idle" | "refreshing" | "reloading">(
    "idle",
  );

  useEffect(() => {
    if (!autoRetry || typeof window === "undefined") {
      return undefined;
    }

    const pathname = window.location.pathname;
    const isBackNavigation = shouldTreatAsBackNavigation();
    const { refreshMs, reloadMs } = resolveLoaderRecoveryDelays(
      isBackNavigation,
      autoRetryDelayMs,
    );

    let refreshTriggered = false;
    let reloadTriggered = false;

    const refreshTimeoutId = window.setTimeout(() => {
      refreshTriggered = true;
      setRecoveryPhase("refreshing");
      router.refresh();
    }, refreshMs);

    const reloadTimeoutId = window.setTimeout(() => {
      if (!canLoaderAutoRetry(pathname)) {
        setRetryExhausted(true);
        return;
      }

      reloadTriggered = true;
      setRecoveryPhase("reloading");
      recordLoaderAutoRetry(pathname);
      window.location.reload();
    }, reloadMs);

    return () => {
      window.clearTimeout(refreshTimeoutId);
      window.clearTimeout(reloadTimeoutId);
      if (!refreshTriggered && !reloadTriggered) {
        clearLoaderAutoRetry(pathname);
      }
    };
  }, [autoRetry, autoRetryDelayMs, router]);

  const statusLabel = retryExhausted
    ? "Still loading"
    : recoveryPhase === "reloading"
      ? "Reloading…"
      : recoveryPhase === "refreshing"
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
