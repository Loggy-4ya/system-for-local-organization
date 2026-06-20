/**
 * @fileoverview Split a full display name into given name and surname.
 *
 * Used when OAuth providers return a single `name` string.
 *
 * Tests: `tests/shared/lib/splitPersonName.test.ts` — `npm run test:split-person-name`
 *
 * @module shared/lib/splitPersonName
 */

/**
 * Split a full name into first name and optional surname.
 *
 * @param fullName - Combined display name from an identity provider.
 * @returns Given name and optional surname.
 */
export function splitPersonName(fullName: string): { name: string; surname: string | null } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { name: "", surname: null };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { name: parts[0], surname: null };
  }

  return {
    name: parts[0],
    surname: parts.slice(1).join(" "),
  };
}
