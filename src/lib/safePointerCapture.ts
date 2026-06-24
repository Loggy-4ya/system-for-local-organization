/**
 * @fileoverview Guards `setPointerCapture` / `releasePointerCapture` against NotFoundError.
 *
 * Puck.js and `@dnd-kit` occasionally call capture APIs after the browser has
 * already released the pointer (see puckeditor/puck#1430). Swallowing the benign
 * NotFoundError prevents the editor from crashing while preserving other errors.
 *
 * Each browsing context (top window + preview iframe) has its own `Element.prototype`;
 * call {@link installSafePointerCapture} per realm.
 *
 * @module src/lib/safePointerCapture
 */

/** Realms already patched — one entry per window / iframe `Element.prototype`. */
const patchedPrototypes = new WeakSet<object>();

/** DOM id for the inline patch script injected into the Puck preview iframe. */
export const SAFE_POINTER_CAPTURE_SCRIPT_ID = "nexus-safe-pointer-capture";

/**
 * Inline IIFE that patches pointer capture inside a browsing context.
 * Injected into the Puck preview iframe `<head>` before dnd-kit sensors attach.
 */
export const SAFE_POINTER_CAPTURE_INLINE_SCRIPT = `(function(){if(window.__nexusPointerCapturePatched)return;window.__nexusPointerCapturePatched=true;var s=Element.prototype.setPointerCapture,r=Element.prototype.releasePointerCapture;Element.prototype.setPointerCapture=function(i){try{s.call(this,i)}catch(e){if(e.name!=="NotFoundError")throw e}};Element.prototype.releasePointerCapture=function(i){try{r.call(this,i)}catch(e){if(e.name!=="NotFoundError")throw e}};})();`;

/**
 * Patch pointer capture APIs once per browsing context.
 *
 * @param targetWindow - Realm to patch (`window` or `iframe.contentWindow`). Defaults to the current `window`.
 */
export function installSafePointerCapture(targetWindow?: Window | null): void {
  const win =
    targetWindow ?? (typeof window !== "undefined" ? window : undefined);
  if (!win) return;

  const ElementCtor = (win as Window & typeof globalThis).Element;
  if (!ElementCtor) return;

  const proto = ElementCtor.prototype;
  if (patchedPrototypes.has(proto)) return;
  patchedPrototypes.add(proto);

  const nativeSet = proto.setPointerCapture;
  const nativeRelease = proto.releasePointerCapture;

  proto.setPointerCapture = function setPointerCaptureSafe(
    this: Element,
    pointerId: number,
  ) {
    try {
      nativeSet.call(this, pointerId);
    } catch (error) {
      if ((error as DOMException).name !== "NotFoundError") throw error;
    }
  };

  proto.releasePointerCapture = function releasePointerCaptureSafe(
    this: Element,
    pointerId: number,
  ) {
    try {
      nativeRelease.call(this, pointerId);
    } catch (error) {
      if ((error as DOMException).name !== "NotFoundError") throw error;
    }
  };
}

/**
 * Inject the inline pointer-capture patch into a document `<head>`.
 *
 * @param doc - Preview iframe document or parent document.
 */
export function injectSafePointerCaptureScript(doc: Document): void {
  if (!doc.head || doc.getElementById(SAFE_POINTER_CAPTURE_SCRIPT_ID)) return;

  const script = doc.createElement("script");
  script.id = SAFE_POINTER_CAPTURE_SCRIPT_ID;
  script.textContent = SAFE_POINTER_CAPTURE_INLINE_SCRIPT;
  doc.head.prepend(script);
}
