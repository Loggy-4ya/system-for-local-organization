/**
 * @fileoverview Client-side credentials login and student signup without full-page redirects.
 *
 * Uses Auth.js `signIn({ redirect: false })` for login and `/api/auth/register` + sign-in for signup.
 *
 * @module src/lib/credentialsAuthClient
 */

import { signIn } from "next-auth/react";
import type { SignupInput } from "@shared/validation/authSchemas";
import { getAuthErrorMessage } from "@shared/validation/authErrorCodes";

/** Result of a client-side credentials auth attempt. */
export interface CredentialsAuthResult {
  /** Whether authentication completed and the session cookie was set. */
  ok: boolean;
  /** Form-level error message when `ok` is false. */
  error?: string;
  /** Field-level validation errors from the register API. */
  fieldErrors?: Record<string, string>;
}

/**
 * Sign in with login and password without navigating away on failure.
 *
 * @param login - User login handle.
 * @param password - User password.
 * @returns Auth result with inline error copy when credentials are invalid.
 */
export async function submitCredentialsLogin(
  login: string,
  password: string,
): Promise<CredentialsAuthResult> {
  const result = await signIn("credentials", {
    login,
    password,
    redirect: false,
  });

  if (!result) {
    return {
      ok: false,
      error: getAuthErrorMessage("default") ?? "Sign-in failed.",
    };
  }

  if (result.error) {
    return {
      ok: false,
      error:
        getAuthErrorMessage(result.error) ??
        getAuthErrorMessage("credentials") ??
        "Invalid login or password.",
    };
  }

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: getAuthErrorMessage("default") ?? "Sign-in failed.",
  };
}

/**
 * Sign in with a Telegram bridge token without navigating away on failure.
 *
 * @param bridgeToken - Short-lived token from Telegram verify APIs.
 * @returns Auth result with inline error copy when the token is invalid.
 */
export async function submitTelegramBridgeSignIn(
  bridgeToken: string,
): Promise<CredentialsAuthResult> {
  const result = await signIn("credentials", {
    bridgeToken,
    redirect: false,
  });

  if (!result) {
    return {
      ok: false,
      error: getAuthErrorMessage("default") ?? "Sign-in failed.",
    };
  }

  if (result.error) {
    return {
      ok: false,
      error: getAuthErrorMessage(result.error) ?? "Telegram sign-in failed.",
    };
  }

  if (result.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    error: getAuthErrorMessage("default") ?? "Sign-in failed.",
  };
}

/**
 * Register a student account then sign in, returning inline errors on failure.
 *
 * @param payload - Validated signup fields.
 * @returns Auth result; field errors are returned for register validation failures.
 */
export async function submitStudentSignup(
  payload: SignupInput,
): Promise<CredentialsAuthResult> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      login: payload.login,
      email: payload.email,
      password: payload.password,
      specialty: payload.specialty,
      group: payload.group,
      studentTitle: payload.studentTitle,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    fieldErrors?: Record<string, string>;
  };

  if (!res.ok) {
    const error =
      getAuthErrorMessage(data.error) ??
      (res.status === 409 ? getAuthErrorMessage(data.error) : null) ??
      data.error ??
      "Registration failed.";

    return {
      ok: false,
      error,
      fieldErrors: data.fieldErrors,
    };
  }

  const signInResult = await submitCredentialsLogin(payload.login, payload.password);
  if (!signInResult.ok) {
    return {
      ok: false,
      error: getAuthErrorMessage("signin") ?? "Account created but sign-in failed.",
    };
  }

  return { ok: true };
}
