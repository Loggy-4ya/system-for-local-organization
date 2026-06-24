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

import {
  installDomEventRejectionGuard,
  NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT,
} from "@/lib/domEventRejectionGuardScript";
import { isDomEventRejectionReason } from "@shared/lib/domEventRejectionLogic";

let guardInstalled = false;
const iframeGuardsInstalled = new WeakSet<Window>();

/**
 * Whether a promise rejection reason is a DOM event object rather than an Error.
 *
 * @param reason - Value passed to `unhandledrejection`.
 * @returns True when the rejection is a non-Error DOM event.
 */
export function isDomEventRejection(reason: unknown): reason is Event {
  return isDomEventRejectionReason(reason);
}

/**
 * Register a capture-phase listener that swallows AutoFrame stylesheet `Event` rejections.
 *
 * @param targetWindow - Window to guard (defaults to the current global).
 */
export function installPuckAutoFrameStylesheetRejectionGuard(
  targetWindow: Window | null = typeof window === "undefined" ? null : window,
): void {
  if (!targetWindow) {
    return;
  }

  if (targetWindow === window) {
    if (guardInstalled) {
      return;
    }
    guardInstalled = true;
    installDomEventRejectionGuard(targetWindow);
    return;
  }

  if (iframeGuardsInstalled.has(targetWindow)) {
    return;
  }

  iframeGuardsInstalled.add(targetWindow);
  installDomEventRejectionGuard(targetWindow);
}

/** DOM id for the inline iframe guard script. */
const IFRAME_REJECTION_GUARD_SCRIPT_ID = "nexus-puck-iframe-rejection-guard";

/**
 * Inline `unhandledrejection` guard — mirrors {@link isDomEventRejectionReason} for early injection
 * (root `beforeInteractive` script and preview iframe documents before AutoFrame clones CSS).
 *
 * @see {@link NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT} in `@/lib/domEventRejectionGuardScript`
 */
export { NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT } from "@/lib/domEventRejectionGuardScript";

/**
 * Inject the iframe rejection guard before Puck AutoFrame clones stylesheets.
 *
 * @param doc - Preview iframe document.
 */
export function injectPuckAutoFrameStylesheetRejectionGuardScript(doc: Document): void {
  if (!doc.head || doc.getElementById(IFRAME_REJECTION_GUARD_SCRIPT_ID)) {
    return;
  }

  const script = doc.createElement("script");
  script.id = IFRAME_REJECTION_GUARD_SCRIPT_ID;
  script.textContent = NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT;
  doc.head.prepend(script);

  if (doc.defaultView) {
    installPuckAutoFrameStylesheetRejectionGuard(doc.defaultView);
  }
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
