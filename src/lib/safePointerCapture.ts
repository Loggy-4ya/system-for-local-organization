/**
 * @fileoverview Guards `setPointerCapture` / `releasePointerCapture` against NotFoundError.
 *
 * Puck.js drag-and-drop occasionally calls capture APIs after the browser has
 * already released the pointer (see puckeditor/puck#1430). Swallowing the benign
 * NotFoundError prevents the editor from crashing while preserving other errors.
 *
 * @module src/lib/safePointerCapture
 */

let installed = false;

/**
 * Patch pointer capture APIs once per browser session.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export function installSafePointerCapture(): void {
  if (installed || typeof Element === "undefined") return;
  installed = true;

  const nativeSet = Element.prototype.setPointerCapture;
  const nativeRelease = Element.prototype.releasePointerCapture;

  Element.prototype.setPointerCapture = function setPointerCaptureSafe(
    this: Element,
    pointerId: number
  ) {
    try {
      nativeSet.call(this, pointerId);
    } catch (error) {
      if ((error as DOMException).name !== "NotFoundError") throw error;
    }
  };

  Element.prototype.releasePointerCapture = function releasePointerCaptureSafe(
    this: Element,
    pointerId: number
  ) {
    try {
      nativeRelease.call(this, pointerId);
    } catch (error) {
      if ((error as DOMException).name !== "NotFoundError") throw error;
    }
  };
}
