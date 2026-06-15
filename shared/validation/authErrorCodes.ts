/**
 * @fileoverview Stable error codes and user-facing copy for authentication flows.
 *
 * Maps redirect query parameters and API error codes to localized, user-friendly messages.
 *
 * @module shared/validation/authErrorCodes
 */

/**
 * Map of stable error codes to user-facing messages.
 */
export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  credentials: "Invalid email or password.",
  signin: "Account created but sign-in failed. Please log in.",
  email_exists: "An account with this email already exists.",
  validation: "Please check your inputs and try again.",
  expired: "The authentication request has expired.",
  unauthorized: "You must be signed in to access this page.",
  forbidden: "You do not have permission to perform this action.",
  default: "An unexpected error occurred. Please try again.",
};

/**
 * Resolve a user-friendly error message from a code.
 *
 * @param code - Error code or raw error message.
 * @returns User-friendly error message or the original code if not found.
 */
export function getAuthErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null;
  const normalized = code.trim().toLowerCase();
  
  // Check if it matches a known code
  if (AUTH_ERROR_MESSAGES[normalized]) {
    return AUTH_ERROR_MESSAGES[normalized];
  }
  
  // Check for common raw error messages and map them to stable codes
  if (normalized.includes("already exists")) {
    return AUTH_ERROR_MESSAGES.email_exists;
  }
  if (normalized.includes("unauthorized")) {
    return AUTH_ERROR_MESSAGES.unauthorized;
  }
  if (normalized.includes("forbidden")) {
    return AUTH_ERROR_MESSAGES.forbidden;
  }
  if (normalized.includes("expired")) {
    return AUTH_ERROR_MESSAGES.expired;
  }

  return code;
}
