/**
 * @fileoverview Inline script that swallows benign DOM `Event` promise rejections.
 *
 * Used by the inline bootstrap script in `[locale]/layout.tsx` and injected into Puck
 * preview iframes before AutoFrame clones host stylesheets.
 *
 * @module src/lib/domEventRejectionGuardScript
 */

import { isDomEventRejectionReason } from "@shared/lib/domEventRejectionLogic";

/**
 * Inline `unhandledrejection` guard — mirrors {@link isDomEventRejectionReason} for
 * environments that cannot import TS modules.
 */
export const NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT = `
(function () {
  if (window.__nexusDomEventRejectionGuard) return;
  window.__nexusDomEventRejectionGuard = true;
  function swallowIfDomEventRejection(event) {
    var reason = event.reason;
    if (!reason) return;
    if (reason instanceof Event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (typeof reason === "object") {
      var tag = Object.prototype.toString.call(reason);
      if (tag === "[object Event]" || tag === "[object ErrorEvent]" || tag === "[object ProgressEvent]") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (reason.type === "error" || reason.type === "abort") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (reason.target) {
        var tagName = reason.target.tagName;
        if (tagName === "LINK" || tagName === "SCRIPT" || tagName === "IMG" || tagName === "STYLE") {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    }
  }
  window.addEventListener("unhandledrejection", swallowIfDomEventRejection, true);
})();
`;

/**
 * Register the rejection guard on a window (browser client bundles).
 *
 * @param targetWindow - Window to guard.
 */
export function installDomEventRejectionGuard(
  targetWindow: Window | null = typeof window === "undefined" ? null : window,
): void {
  if (!targetWindow) {
    return;
  }

  const flagKey = "__nexusDomEventRejectionGuardInstalled";
  if ((targetWindow as Window & { [flagKey]?: boolean })[flagKey]) {
    return;
  }
  (targetWindow as Window & { [flagKey]?: boolean })[flagKey] = true;

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (!isDomEventRejectionReason(event.reason)) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  targetWindow.addEventListener("unhandledrejection", onUnhandledRejection, true);
}
