"use client";

/**
 * @fileoverview Suppresses benign unhandled rejections from Puck AutoFrame stylesheet cloning.
 *
 * Puck `CopyHostStyles` mirrors parent `<link rel="stylesheet">` nodes into the preview iframe.
 * When a cloned sheet fails to load, some code paths surface a DOM `Event` as a promise
 * rejection. Next.js devtools cannot coerce that into an `Error`, which triggers a noisy
 * `coerceError` overlay even though preview tokens are injected separately via
 * {@link PuckIframeTheme}.
 *
 * @module src/components/puck/PuckAutoFrameStylesheetRejectionGuard
 */

let guardInstalled = false;

/**
 * Whether a promise rejection reason is a DOM event object rather than an Error.
 *
 * @param reason - Value passed to `unhandledrejection`.
 * @returns True when the rejection is a non-Error DOM event.
 */
export function isDomEventRejection(reason: unknown): reason is Event {
  if (reason instanceof Event) {
    return true;
  }

  if (typeof reason === "object" && reason !== null) {
    if (Object.prototype.toString.call(reason) === "[object Event]") {
      return true;
    }

    if ("type" in reason) {
      const eventType = (reason as Event).type;
      return eventType === "error" || eventType === "abort";
    }
  }

  return false;
}

/**
 * Register a capture-phase listener that swallows AutoFrame stylesheet `Event` rejections.
 *
 * Idempotent — safe to call from both the install module and legacy mount sites.
 */
export function installPuckAutoFrameStylesheetRejectionGuard(): void {
  if (guardInstalled || typeof window === "undefined") {
    return;
  }

  guardInstalled = true;

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isDomEventRejection(event.reason)) {
      return;
    }

    event.preventDefault();
  };

  window.addEventListener("unhandledrejection", onUnhandledRejection, true);
}

/**
 * @deprecated Prefer importing `@/lib/puckAutoFrameStylesheetRejectionInstall` before Puck loads.
 * Kept as a no-op mount point for older call sites.
 *
 * @returns Null — install runs synchronously via {@link installPuckAutoFrameStylesheetRejectionGuard}.
 */
export function PuckAutoFrameStylesheetRejectionGuard() {
  installPuckAutoFrameStylesheetRejectionGuard();
  return null;
}

export default PuckAutoFrameStylesheetRejectionGuard;
