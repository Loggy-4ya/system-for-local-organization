/**
 * @fileoverview Types and helpers for Puck content sanitization audit reports.
 *
 * @module shared/lib/puckContentSanitizeReport
 *
 * Tests: `npm run test:puck-content-sanitize`
 * Registry: `.ai/docs/testing.md`
 */

/** Category of user-authored field that was sanitized. */
export type PuckSanitizeFieldKind = "href" | "media" | "url" | "rich-text";

/** One field whose stored value was altered by sanitization. */
export interface PuckSanitizeFieldEvent {
  /** JSON path to the prop (e.g. `content[0].props.href`). */
  path: string;
  /** Sanitized field category inferred from the prop key. */
  kind: PuckSanitizeFieldKind;
  /** Length of the raw value before sanitization. */
  originalLength: number;
  /** Length of the value after sanitization. */
  sanitizedLength: number;
}

/** Aggregate report from a Puck JSON sanitization pass. */
export interface PuckSanitizeReport {
  /** Individual field mutations (empty when input was already safe). */
  events: PuckSanitizeFieldEvent[];
}

/**
 * Create an empty sanitization report.
 *
 * @returns Fresh report with no events.
 */
export function createEmptyPuckSanitizeReport(): PuckSanitizeReport {
  return { events: [] };
}

/**
 * Infer sanitization kind from a Puck prop key name.
 *
 * @param key - Puck props object key.
 * @returns Field kind used in audit events.
 */
export function puckSanitizeKindFromPropKey(key: string): PuckSanitizeFieldKind {
  if (key === "href") return "href";
  if (key === "image" || key === "backgroundImage") return "media";
  if (key === "text" || key === "content") return "rich-text";
  return "url";
}

/**
 * Append a field mutation when sanitization changed the stored value.
 *
 * @param report - Mutable report accumulator.
 * @param path - JSON path to the mutated prop.
 * @param kind - Field category.
 * @param original - Raw string before sanitization.
 * @param sanitized - String after sanitization.
 */
export function recordPuckSanitizeFieldChange(
  report: PuckSanitizeReport,
  path: string,
  kind: PuckSanitizeFieldKind,
  original: string,
  sanitized: string,
): void {
  if (original === sanitized) return;

  report.events.push({
    path,
    kind,
    originalLength: original.length,
    sanitizedLength: sanitized.length,
  });
}
