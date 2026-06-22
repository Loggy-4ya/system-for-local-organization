/**
 * @fileoverview Section registry and URL resolver for `/admin/logs`.
 *
 * Shared by the server page (`searchParams`) and the client shell (tab links).
 * Kept outside `"use client"` modules so server components can call the resolver.
 *
 * @module src/lib/systemLogsSections
 */

/** Supported log section identifiers (URL `section` query param). */
export type SystemLogsSectionId = "content-sanitization" | "user-directory";

/** Section registry entry. */
export interface SystemLogsSection {
  /** Stable section id for deep links. */
  id: SystemLogsSectionId;
  /** Short tab label. */
  label: string;
}

/** Canonical section list (display order). */
export const SYSTEM_LOG_SECTIONS: SystemLogsSection[] = [
  { id: "content-sanitization", label: "Content sanitization" },
  { id: "user-directory", label: "User directory" },
];

/**
 * Resolve a section id from the URL query, falling back to the first section.
 *
 * @param raw - Raw `section` query value.
 * @returns Valid section id.
 */
export function resolveSystemLogsSectionId(
  raw: string | undefined | null,
): SystemLogsSectionId {
  if (raw === "user-directory" || raw === "content-sanitization") {
    return raw;
  }
  return SYSTEM_LOG_SECTIONS[0]!.id;
}
