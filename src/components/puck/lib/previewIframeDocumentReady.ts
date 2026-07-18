/**
 * @fileoverview Guards for mutating Puck preview iframe documents during theme sync.
 *
 * @module src/components/puck/lib/previewIframeDocumentReady
 *
 * Tests: `npm run test:run -- preview-iframe-document-ready`
 * Registry: `.ai/docs/testing.md`
 */

/**
 * Whether a Puck preview iframe document is safe to mutate.
 *
 * During theme toggles Puck may briefly detach or replace the iframe while
 * `contentDocument` is still reachable but `documentElement` is null.
 *
 * @param iframeDoc - Preview iframe document, if any.
 * @returns True when transparency helpers can touch the document tree.
 */
export function isPreviewIframeDocumentReady(
  iframeDoc: Document | null | undefined,
): iframeDoc is Document {
  if (!iframeDoc) {
    return false;
  }

  try {
    const { documentElement, head } = iframeDoc;
    return documentElement != null && head != null;
  } catch {
    return false;
  }
}

/**
 * Resolve the document that hosts Puck preview content (iframe or inline shell).
 *
 * When {@link IframeConfig.enabled} is false, `#preview-frame` is a div in the editor shell
 * and preview blocks render in the parent document so `#nexus-bg` shows through.
 *
 * @returns Preview document, or null when the canvas is not mounted.
 */
export function resolvePuckPreviewDocument(): Document | null {
  if (typeof document === "undefined") {
    return null;
  }

  const frame = resolvePuckPreviewFrameElement();
  if (!frame) {
    return null;
  }

  if (frame instanceof HTMLIFrameElement) {
    const iframeDoc = frame.contentDocument;
    return isPreviewIframeDocumentReady(iframeDoc) ? iframeDoc : null;
  }

  return document;
}

/**
 * Resolve Puck's `#preview-frame` host (iframe or inline div when iframe mode is off).
 *
 * @returns Preview frame element, or null when the canvas is not mounted.
 */
export function resolvePuckPreviewFrameElement(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }

  const frame = document.getElementById("preview-frame");
  return frame instanceof HTMLElement ? frame : null;
}

/**
 * Whether Puck renders preview content inline in the editor shell (`iframe.enabled === false`).
 *
 * @returns True when `#preview-frame` is a div in the parent document.
 */
export function isInlinePuckPreview(): boolean {
  const frame = resolvePuckPreviewFrameElement();
  return frame !== null && !(frame instanceof HTMLIFrameElement);
}
