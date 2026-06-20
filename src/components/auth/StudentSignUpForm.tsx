/**
 * @fileoverview Student signup form with client-side validation and inline errors.
 *
 * @module src/components/auth/StudentSignUpForm
 */

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import {
  SignupSociumRoleSelect,
  type SignupSociumRole,
} from "@/components/auth/SignupSociumRoleSelect";
import { CreatableCatalogSelect } from "@/components/auth/CreatableCatalogSelect";
import { PasswordStrengthField } from "@/components/auth/PasswordStrengthField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";
import { submitStudentSignup } from "@/lib/credentialsAuthClient";
import {
  clearSignupFormDraft,
  readSignupFormDraft,
  resolveSignupFormInitialState,
  stripSignupErrorQueryParam,
  writeSignupFormDraft,
  type SignupFormDraft,
} from "@/lib/signupFormDraft";
import { signupSchema } from "@shared/validation/authSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { getAuthErrorMessage } from "@shared/validation/authErrorCodes";

/**
 * Student registration form with credentials and OAuth options.
 *
 * @returns Signup form page content.
 */
export function StudentSignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const initialError = getAuthErrorMessage(errorParam);

  const queryParams = {
    login: searchParams.get("login") ?? "",
    email: searchParams.get("email") ?? "",
    name: searchParams.get("name") ?? "",
    surname: searchParams.get("surname") ?? "",
    phone: searchParams.get("phone") ?? "",
    specialty: searchParams.get("specialty") ?? "",
    group: searchParams.get("group") ?? "",
  };

  const urlInitial = resolveSignupFormInitialState(queryParams, null);

  const [login, setLogin] = useState(urlInitial.login);
  const [email, setEmail] = useState(urlInitial.email);
  const [name, setName] = useState(urlInitial.name);
  const [surname, setSurname] = useState(urlInitial.surname);
  const [phone, setPhone] = useState(urlInitial.phone);
  const [password, setPassword] = useState(urlInitial.password);
  const [confirmPassword, setConfirmPassword] = useState(urlInitial.confirmPassword);
  const [specialty, setSpecialty] = useState(urlInitial.specialty);
  const [group, setGroup] = useState(urlInitial.group);
  const [signupSociumRole, setSignupSociumRole] = useState<SignupSociumRole>(
    urlInitial.signupSociumRole,
  );
  const [applyForSelfGovernment, setApplyForSelfGovernment] = useState(
    urlInitial.applyForSelfGovernment,
  );
  const [personalDataConsent, setPersonalDataConsent] = useState(urlInitial.personalDataConsent);
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  /** Restore a saved draft once after mount (avoids SSR/client hydration mismatch). */
  useEffect(() => {
    const draft = readSignupFormDraft();
    if (!draft) return;

    const restored = resolveSignupFormInitialState(queryParams, draft);
    setLogin(restored.login);
    setEmail(restored.email);
    setName(restored.name);
    setSurname(restored.surname);
    setPhone(restored.phone);
    setPassword(restored.password);
    setConfirmPassword(restored.confirmPassword);
    setSpecialty(restored.specialty);
    setGroup(restored.group);
    setSignupSociumRole(restored.signupSociumRole);
    setApplyForSelfGovernment(restored.applyForSelfGovernment);
    setPersonalDataConsent(restored.personalDataConsent);
    // Intentionally run once on mount — draft must not overwrite in-progress edits later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Load approved specialty/group labels for creatable dropdowns. */
  useEffect(() => {
    let cancelled = false;

    async function loadOptions() {
      try {
        const res = await fetch("/api/auth/signup-options");
        if (!res.ok) return;
        const data = (await res.json()) as { specialties?: string[]; groups?: string[] };
        if (cancelled) return;
        setSpecialtyOptions(data.specialties ?? []);
        setGroupOptions(data.groups ?? []);
      } catch {
        // Dropdowns still work via free-text custom entry.
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Strip legacy redirect error query params without remounting the form. */
  useEffect(() => {
    stripSignupErrorQueryParam(errorParam);
  }, [errorParam]);

  /**
   * Snapshot current form values for retry after a failed submission.
   *
   * @returns Serializable draft of all controlled fields.
   */
  function currentSignupDraft(): SignupFormDraft {
    return {
      login,
      email,
      name,
      surname,
      phone,
      password,
      confirmPassword,
      specialty,
      group,
      signupSociumRole,
      applyForSelfGovernment,
      personalDataConsent,
    };
  }

  /**
   * Validate and register without a full-page reload on failure.
   *
   * @param e - Form submit event.
   */
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const result = signupSchema.safeParse({
      login,
      email: email || null,
      password,
      confirmPassword,
      name: name || undefined,
      surname: surname || null,
      phone: phone || null,
      specialty: specialty || null,
      group: group || null,
      signupSociumRole,
      applyForSelfGovernment,
      personalDataConsent,
    });

    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      setFormError(formatted.formError || "Please correct the validation errors.");
      setFieldErrors(formatted.fieldErrors);
      writeSignupFormDraft(currentSignupDraft());
      return;
    }

    setLoading(true);
    writeSignupFormDraft(currentSignupDraft());

    try {
      const authResult = await submitStudentSignup(result.data, confirmPassword);
      if (!authResult.ok) {
        setFormError(authResult.error ?? getAuthErrorMessage("default"));
        if (authResult.fieldErrors) {
          setFieldErrors(authResult.fieldErrors);
        }
        writeSignupFormDraft(currentSignupDraft());
        return;
      }

      clearSignupFormDraft();
      router.push("/profile");
      router.refresh();
    } catch {
      setFormError(getAuthErrorMessage("default"));
      writeSignupFormDraft(currentSignupDraft());
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError && (
          <FormAlert variant="error" className="auth-shell__alert">
            {formError}
          </FormAlert>
        )}

        <FormField
          label="Login"
          htmlFor="signup-login"
          error={fieldErrors.login}
        >
          <Input
            id="signup-login"
            name="login"
            type="text"
            autoComplete="username"
            spellCheck={false}
            placeholder="e.g. ivan.petrenko"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={loading}
            required
          />
        </FormField>

        <FormField
          label="Email"
          htmlFor="signup-email"
          error={fieldErrors.email}
          hint="Optional — link email for OAuth merge and notifications."
        >
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@university.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="First name"
            htmlFor="signup-name"
            error={fieldErrors.name}
          >
            <Input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
            />
          </FormField>

          <FormField
            label="Surname"
            htmlFor="signup-surname"
            error={fieldErrors.surname}
          >
            <Input
              id="signup-surname"
              name="surname"
              type="text"
              autoComplete="family-name"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              disabled={loading}
            />
          </FormField>
        </div>

        <FormField
          label="Phone"
          htmlFor="signup-phone"
          error={fieldErrors.phone}
          hint="Optional but recommended. Required if you apply for self-government membership."
        >
          <Input
            id="signup-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+380 XX XXX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={loading}
          />
        </FormField>

        <PasswordStrengthField
          id="signup-password"
          label="Password"
          value={password}
          onChange={setPassword}
          login={login}
          error={fieldErrors.password}
          disabled={loading}
        />

        <FormField
          label="Confirm password"
          htmlFor="signup-confirm-password"
          error={fieldErrors.confirmPassword}
        >
          <Input
            id="signup-confirm-password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Specialty"
            htmlFor="signup-specialty"
            error={fieldErrors.specialty}
            hint="Pick from the list or type a new specialty — admins review new entries."
          >
            <CreatableCatalogSelect
              id="signup-specialty"
              value={specialty}
              onChange={setSpecialty}
              options={specialtyOptions}
              placeholder="e.g. Software Engineering"
              disabled={loading}
            />
          </FormField>

          <FormField
            label="Group"
            htmlFor="signup-group"
            error={fieldErrors.group}
            hint="Pick from the list or enter your group number — admins review new entries."
          >
            <CreatableCatalogSelect
              id="signup-group"
              value={group}
              onChange={setGroup}
              options={groupOptions}
              placeholder="e.g. 42"
              disabled={loading}
              numericOnly
            />
          </FormField>
        </div>

        <SignupSociumRoleSelect
          value={signupSociumRole}
          onChange={setSignupSociumRole}
          disabled={loading}
        />

        <div className="flex flex-col gap-3 rounded-lg border border-(--color-border-default) bg-(--color-bg-panel) p-4">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-(--color-text-primary)">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent-user)]"
              checked={applyForSelfGovernment}
              onChange={(e) => setApplyForSelfGovernment(e.target.checked)}
              disabled={loading}
            />
            <span>
              I want to apply for membership in the student self-government
              <span className="mt-1 block text-xs text-(--color-text-secondary)">
                This records your intent only. Administrators review applications and assign roles.
              </span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 text-sm text-(--color-text-primary)">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent-user)]"
              checked={personalDataConsent}
              onChange={(e) => setPersonalDataConsent(e.target.checked)}
              disabled={loading}
              aria-invalid={Boolean(fieldErrors.personalDataConsent)}
            />
            <span>
              I consent to the processing of my personal data
              <span className="mt-1 block text-xs text-(--color-text-secondary)">
                Required to create an account. Data is used for institutional management and
                student council operations.
              </span>
            </span>
          </label>
          {fieldErrors.personalDataConsent && (
            <p className="text-xs text-[var(--color-accent-warning,#f59e0b)]">
              {fieldErrors.personalDataConsent}
            </p>
          )}
        </div>

        <Button type="submit" className="mt-2 h-12 w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner className="size-4" />
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>

        <p className="mt-2 text-center text-sm text-(--color-text-secondary)">
          Already have an account?{" "}
          <Link href="/login" className="text-(--color-accent-user) no-underline hover:underline">
            Sign in
          </Link>
        </p>
      </form>

      <OAuthButtonRow callbackUrl="/profile" />
    </AuthShell>
  );
}

export default StudentSignUpForm;
