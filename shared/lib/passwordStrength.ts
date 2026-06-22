/**
 * @fileoverview Pure password strength assessment for signup and password changes.
 *
 * Weak-password denylist: {@link module:shared/constants/contentPolicy}.
 *
 * Tests: `tests/shared/lib/passwordStrength.test.ts` — `npm run test:password-strength`
 *
 * @module shared/lib/passwordStrength
 */

import {
  CONTENT_POLICY_WEAK_PASSWORD_MESSAGE,
} from "@shared/constants/contentPolicy";
import { isWeakPolicyPassword } from "@shared/lib/contentPolicy";

/** Result of {@link assessPasswordStrength}. */
export interface PasswordStrengthAssessment {
  /** Normalised score from 0 (very weak) to 4 (strong). */
  score: number;
  /** Whether the password fails minimum signup policy. */
  isWeak: boolean;
  /** Human-readable issues for inline form feedback. */
  issues: string[];
}

/**
 * Assess whether a password meets Nexus signup strength rules.
 *
 * Policy: minimum 8 characters, not equal to login, not a common weak password,
 * not all one repeated character, and at least two character classes
 * (lower, upper, digit, symbol).
 *
 * @param password - Plain-text password candidate.
 * @param login - Optional login handle — rejected when password matches login.
 * @returns Strength assessment with issues list.
 */
export function assessPasswordStrength(
  password: string,
  login?: string | null,
): PasswordStrengthAssessment {
  const issues: string[] = [];
  let score = 0;

  if (password.length < 8) {
    issues.push("Password must be at least 8 characters.");
  } else if (password.length >= 12) {
    score += +2;
  } else {
    score += 1;
  }

  const normalizedLogin = login?.trim().toLowerCase();
  if (normalizedLogin && password.trim().toLowerCase() === normalizedLogin) {
    issues.push("Password cannot be the same as your login.");
  }

  if (isWeakPolicyPassword(password)) {
    issues.push(CONTENT_POLICY_WEAK_PASSWORD_MESSAGE);
  }

  if (/^(.)\1+$/.test(password)) {
    issues.push("Password cannot be a single repeated character.");
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const classCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  if (classCount < 2) {
    issues.push(
      "Use a mix of letters, numbers, or symbols (at least two character types).",
    );
  } else {
    score += classCount - 1;
  }

  const isWeak = issues.length > 0 || password.length < 8;

  return {
    score: Math.min(4, score),
    isWeak,
    issues,
  };
}

/**
 * First user-facing issue for a weak password, or null when acceptable.
 *
 * @param password - Plain-text password candidate.
 * @param login - Optional login handle.
 * @returns Primary issue message or null.
 */
export function getPasswordStrengthError(
  password: string,
  login?: string | null,
): string | null {
  const assessment = assessPasswordStrength(password, login);
  return assessment.isWeak ? (assessment.issues[0] ?? "Password is too weak.") : null;
}
