/**
 * @fileoverview Pure detection for benign DOM `Event` promise rejections.
 *
 * Failed `<link>`, `<script>`, and `<img>` loads (including CSP blocks) sometimes
 * surface as raw `Event` rejections. Next.js dev cannot coerce those into `Error`
 * and shows a noisy `[object Event]` runtime overlay unless they are swallowed.
 *
 * Tests: `npm run test:dom-event-rejection-logic`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/domEventRejectionLogic
 */

/**
 * Whether a promise rejection reason is a benign DOM event object rather than an Error.
 *
 * @param reason - Value passed to `unhandledrejection`.
 * @returns True when the rejection should be swallowed.
 */
export function isDomEventRejectionReason(reason: unknown): reason is Event {
  if (reason instanceof Event) {
    return true;
  }

  if (typeof reason !== "object" || reason === null) {
    return false;
  }

  const tag = Object.prototype.toString.call(reason);
  if (
    tag === "[object Event]" ||
    tag === "[object ErrorEvent]" ||
    tag === "[object ProgressEvent]"
  ) {
    return true;
  }

  if ("type" in reason) {
    const eventType = (reason as Event).type;
    if (eventType === "error" || eventType === "abort") {
      return true;
    }
  }

  if ("target" in reason && reason.target && typeof reason.target === "object") {
    const tagName = (reason.target as { tagName?: string }).tagName;
    if (tagName === "LINK" || tagName === "SCRIPT" || tagName === "IMG" || tagName === "STYLE") {
      return true;
    }
  }

  return false;
}
