/**
 * @fileoverview Section registry and URL resolver for `/admin/logs`.
 *
 * Shared by the server page (`searchParams`) and the client shell (tab links).
 * Kept outside `"use client"` modules so server components can call the resolver.
 * Tab labels are resolved in the client via `admin.systemLogs.sections`.
 *
 * @module src/lib/systemLogsSections
 */

/** Supported log section identifiers (URL `section` query param). */
export type SystemLogsSectionId = "content-sanitization" | "user-directory";

/** Canonical section ids (display order). */
export const SYSTEM_LOG_SECTION_IDS: SystemLogsSectionId[] = [
  "content-sanitization",
  "user-directory",
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
  return SYSTEM_LOG_SECTION_IDS[0]!;
}
