/**
 * @fileoverview Client hook for live content-policy feedback on prose text fields.
 *
 * Skips numeric, tel, email, password, URL, and login fields — those use format
 * validation only (see {@link ContentPolicyFieldKind}).
 *
 * @module src/lib/useContentPolicyField
 */

"use client";

import { useCallback, useState } from "react";
import {
  getContentPolicyFieldError,
  type ContentPolicyFieldKind,
} from "@shared/validation/contentPolicySchemas";

/**
 * Live blocked-word validation for controlled form fields.
 *
 * @returns Helpers to validate on blur and merge live errors with Zod errors.
 */
export function useContentPolicyFields() {
  const [liveErrors, setLiveErrors] = useState<Record<string, string>>({});

  /**
   * Scan one field and update the live error map.
   *
   * @param key - Stable field id matching Zod paths (e.g. `name`).
   * @param value - Current input value.
   * @param kind - Field kind — only `plain-text` runs the blocklist.
   */
  const validateField = useCallback(
    (key: string, value: string, kind: ContentPolicyFieldKind = "plain-text") => {
      const message = getContentPolicyFieldError(value, kind);
      setLiveErrors((prev) => {
        if (!message) {
          if (!(key in prev)) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        }
        if (prev[key] === message) return prev;
        return { ...prev, [key]: message };
      });
    },
    [],
  );

  /**
   * Resolve the error to show under a field (Zod submit error wins over live).
   *
   * @param key - Field id.
   * @param submittedError - Error from last Zod/API validation pass.
   * @returns Combined error message or undefined.
   */
  const fieldError = useCallback(
    (key: string, submittedError?: string) => submittedError || liveErrors[key],
    [liveErrors],
  );

  /** Clear all live errors (e.g. on successful submit). */
  const clearLiveErrors = useCallback(() => {
    setLiveErrors({});
  }, []);

  /** Whether any live content-policy error is active. */
  const hasLivePolicyErrors = Object.keys(liveErrors).length > 0;

  return {
    validateField,
    fieldError,
    clearLiveErrors,
    hasLivePolicyErrors,
    liveErrors,
  };
}

/**
 * Blur handler factory for a content-policy-aware field.
 *
 * @param key - Field id.
 * @param value - Current value.
 * @param kind - Field kind.
 * @param validateField - {@link useContentPolicyFields.validateField}.
 * @returns Blur event handler.
 */
export function contentPolicyBlurHandler(
  key: string,
  value: string,
  kind: ContentPolicyFieldKind,
  validateField: (key: string, value: string, kind?: ContentPolicyFieldKind) => void,
): () => void {
  return () => validateField(key, value, kind);
}
