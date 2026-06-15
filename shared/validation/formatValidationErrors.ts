/**
 * @fileoverview Utility to format Zod validation errors.
 *
 * Converts a ZodError into a flat key-value map of field errors and an optional form-level error.
 *
 * @module shared/validation/formatValidationErrors
 */

import { ZodError } from "zod";

/** Formatted validation errors structure. */
export interface FormattedErrors {
  /** Global form-level error message. */
  formError?: string;
  /** Field-specific error messages mapped by path. */
  fieldErrors: Record<string, string>;
}

/**
 * Format a Zod validation error or generic error into a standard structure.
 *
 * @param error - The caught error object.
 * @returns FormattedErrors containing field and form-level messages.
 */
export function formatZodErrors(error: unknown): FormattedErrors {
  if (!(error instanceof ZodError)) {
    return {
      formError: error instanceof Error ? error.message : "Validation failed.",
      fieldErrors: {},
    };
  }

  const fieldErrors: Record<string, string> = {};
  let formError: string | undefined;

  for (const issue of error.issues) {
    if (issue.path.length > 0) {
      const fieldName = issue.path.join(".");
      // Keep the first error message for each field path
      if (!fieldErrors[fieldName]) {
        fieldErrors[fieldName] = issue.message;
      }
    } else {
      formError = issue.message;
    }
  }

  return { formError, fieldErrors };
}
