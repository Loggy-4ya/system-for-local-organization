/**
 * @fileoverview Strip null/empty optional unique User fields before MongoDB persist.
 *
 * MongoDB unique indexes treat explicit `null` as a value — only one `{ email: null }`
 * document can exist unless the index uses a partial filter. Unset optional unique
 * fields instead of storing null.
 *
 * Tests: `npm run test:strip-user-optional-unique-fields`
 * Registry: `.ai/docs/testing.md`
 *
 * @module shared/lib/stripUserOptionalUniqueFields
 */

/** String fields that use partial unique indexes when present. */
export const USER_OPTIONAL_UNIQUE_STRING_FIELDS = ["email", "login"] as const;

export type UserOptionalUniqueStringField = (typeof USER_OPTIONAL_UNIQUE_STRING_FIELDS)[number];

/**
 * Whether a stored value should be removed from an optional unique field.
 *
 * @param value - Raw field value from a User document or create payload.
 * @returns True when the field should be unset rather than persisted.
 */
export function shouldUnsetUserOptionalUniqueField(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

/**
 * Remove null/empty optional unique keys from a plain create/update payload.
 *
 * @param payload - Mutable user document object (e.g. before {@link User.create}).
 */
export function stripUserOptionalUniqueFields(payload: Record<string, unknown>): void {
  for (const field of USER_OPTIONAL_UNIQUE_STRING_FIELDS) {
    if (shouldUnsetUserOptionalUniqueField(payload[field])) {
      delete payload[field];
    }
  }
}
