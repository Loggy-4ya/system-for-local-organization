/**
 * @fileoverview Session-scoped signup form draft persistence across failed submissions.
 *
 * Restores user input when registration or post-register sign-in fails so fields
 * are not cleared on error.
 *
 * @module src/lib/signupFormDraft
 */

import type { SignupSociumRole } from "@/components/auth/SignupSociumRoleSelect";

/** Session storage key for the signup draft payload. */
export const SIGNUP_FORM_DRAFT_KEY = "nexus:signup-form-draft";

/** Serializable signup form snapshot (tab-scoped via sessionStorage). */
export interface SignupFormDraft {
  login: string;
  email: string;
  name: string;
  surname: string;
  phone: string;
  password: string;
  confirmPassword: string;
  specialty: string;
  group: string;
  signupSociumRole: SignupSociumRole;
  applyForSelfGovernment: boolean;
  personalDataConsent: boolean;
  /** Local blob preview URL — not restored after reload (pending file is in React state only). */
  avatar: string;
}

/**
 * Read a previously saved signup draft from sessionStorage.
 *
 * @returns Parsed draft or null when unavailable.
 */
export function readSignupFormDraft(): SignupFormDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(SIGNUP_FORM_DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SignupFormDraft;
  } catch {
    return null;
  }
}

/**
 * Persist the current signup form values for retry after a failed submission.
 *
 * @param draft - Full form snapshot to store.
 */
export function writeSignupFormDraft(draft: SignupFormDraft): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(SIGNUP_FORM_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Ignore quota / private-mode errors — form state still lives in React.
  }
}

/**
 * Remove the signup draft after a successful registration.
 */
export function clearSignupFormDraft(): void {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.removeItem(SIGNUP_FORM_DRAFT_KEY);
  } catch {
    // No-op.
  }
}

/**
 * Build initial field values from URL query params, an optional draft, and defaults.
 *
 * Draft wins over query params so client-side failures keep the latest input.
 *
 * @param params - Query string values from the signup URL.
 * @param draft - Restored session draft, if any.
 * @returns Initial controlled field values for {@link StudentSignUpForm}.
 */
export function resolveSignupFormInitialState(params: {
  login: string;
  email: string;
  name: string;
  surname: string;
  phone: string;
  specialty: string;
  group: string;
}, draft: SignupFormDraft | null): SignupFormDraft {
  return {
    login: draft?.login ?? params.login,
    email: draft?.email ?? params.email,
    name: draft?.name ?? params.name,
    surname: draft?.surname ?? params.surname,
    phone: draft?.phone ?? params.phone,
    password: draft?.password ?? "",
    confirmPassword: draft?.confirmPassword ?? "",
    specialty: draft?.specialty ?? params.specialty,
    group: draft?.group ?? params.group,
    signupSociumRole: draft?.signupSociumRole ?? "Student",
    applyForSelfGovernment: draft?.applyForSelfGovernment ?? false,
    personalDataConsent: draft?.personalDataConsent ?? false,
    avatar: draft?.avatar ?? "",
  };
}

/**
 * Strip the `error` query param without triggering a Next.js navigation remount.
 *
 * @param errorParam - Current error query value.
 */
export function stripSignupErrorQueryParam(errorParam: string | null): void {
  if (typeof window === "undefined" || !errorParam) return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has("error")) return;

  url.searchParams.delete("error");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", next);
}
