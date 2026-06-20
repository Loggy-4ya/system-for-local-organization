/**
 * @fileoverview Helpers for converting Mongoose documents to plain JSON-safe objects.
 *
 * Prevents React Server Components prop serialization failures when nested
 * subdocuments retain circular `$parent` references.
 *
 * @module shared/lib/mongoosePlainObject
 */

/** Mongoose document-like value with optional {@link Document.toObject}. */
export interface MongoosePlainConvertible<T> {
  toObject?: (options?: {
    flattenMaps?: boolean;
    virtuals?: boolean;
  }) => T;
}

/**
 * Convert a Mongoose document (or plain object) into a plain JSON-safe record.
 *
 * @param doc - Mongoose document or already-plain value.
 * @returns Plain object without circular Mongoose internals.
 */
export function mongooseDocToPlain<T extends Record<string, unknown>>(
  doc: MongoosePlainConvertible<T> & T,
): T {
  if (typeof doc.toObject === "function") {
    return doc.toObject({ flattenMaps: true, virtuals: false });
  }

  return doc;
}

/**
 * Deep-clone a value through JSON serialization — strips cycles and non-JSON types.
 *
 * @param value - Input value.
 * @returns JSON-safe clone.
 */
export function jsonSafeClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
