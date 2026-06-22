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

import { useEffect } from "react";

/**
 * Whether a promise rejection reason is a DOM event object rather than an Error.
 *
 * @param reason - Value passed to `unhandledrejection`.
 * @returns True when the rejection is a non-Error DOM event.
 */
function isDomEventRejection(reason: unknown): reason is Event {
  if (reason instanceof Event) {
    return true;
  }

  if (typeof reason === "object" && reason !== null && "type" in reason) {
    const eventType = (reason as Event).type;
    return eventType === "error" || eventType === "abort";
  }

  return false;
}

/**
 * Mount inside the Puck editor shell to swallow AutoFrame stylesheet `Event` rejections.
 *
 * @returns Null — side-effect only.
 */
export function PuckAutoFrameStylesheetRejectionGuard() {
  useEffect(() => {
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (!isDomEventRejection(event.reason)) {
        return;
      }

      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

export default PuckAutoFrameStylesheetRejectionGuard;
