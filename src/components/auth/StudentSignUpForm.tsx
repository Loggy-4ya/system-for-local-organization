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
import { PasswordInput } from "@/components/ui/PasswordInput";
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
import { filterPhoneInputChange, phoneInputProps, phoneInputPlaceholder, autocorrectPhoneFieldValue } from "@/lib/phoneInputProps";
import { AvatarImageField } from "@/components/media/AvatarImageField";
import type { TelegramWidgetPayload } from "@shared/domains/AuthDomain";
import { avatarIsRequiredAtSignup, resolveSelfGovernmentApplicationFieldError, resolveSelfGovernmentMemberProfileHint, SELF_GOVERNMENT_APPLICATION_FIELD_HINT, SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT, SELF_GOVERNMENT_APPLICATION_TELEGRAM_ADVISORY, TEACHER_APPLICATION_FIELD_HINT, TEACHER_APPLICATION_REQUIREMENTS_HINT, TELEGRAM_REQUIRED_AT_MEMBERSHIP_APPLICATION } from "@shared/lib/userProfileCompleteness";
import { isTeacherUser } from "@shared/lib/userSociumHelpers";
import { useContentPolicyFields } from "@/lib/useContentPolicyField";

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
  const [avatar, setAvatar] = useState(urlInitial.avatar);
  const [pendingAvatarFile, setPendingAvatarFile] = useState<File | null>(null);
  const [personalDataConsent, setPersonalDataConsent] = useState(urlInitial.personalDataConsent);
  const [telegramAuth, setTelegramAuth] = useState<TelegramWidgetPayload | null>(null);
  const [specialtyOptions, setSpecialtyOptions] = useState<string[]>([]);
  const [groupOptions, setGroupOptions] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { validateField, fieldError, clearLiveErrors } = useContentPolicyFields();

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
    setAvatar(restored.avatar);
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

  const avatarRequired = avatarIsRequiredAtSignup(
    applyForSelfGovernment,
    signupSociumRole === "Teacher",
  );
  const isTeacherSignup = signupSociumRole === "Teacher";

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
      avatar: avatar.startsWith("blob:") ? "" : avatar,
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
    clearLiveErrors();

    if (avatarRequired && !pendingAvatarFile && !avatar.trim()) {
      const profileSlice = {
        name: name || login,
        surname: surname || null,
        phone: phone || null,
        specialty: specialty || null,
        group: group || null,
        avatar: avatar || null,
        sociumRoles: isTeacherSignup
          ? [{ roleKey: "teacher", roleLabel: "Teacher", kind: "teacher" as const, source: "self" as const, assignedAt: new Date() }]
          : [],
      };
      setFieldErrors({ avatar: resolveSelfGovernmentApplicationFieldError(profileSlice) });
      setFormError(resolveSelfGovernmentApplicationFieldError(profileSlice));
      writeSignupFormDraft(currentSignupDraft());
      return;
    }

    const result = signupSchema.safeParse({
      login,
      email: email || null,
      password,
      confirmPassword,
      name: name || undefined,
      surname: surname || null,
      phone: phone || null,
      avatar: avatar.startsWith("blob:") ? null : avatar || null,
      specialty: specialty || null,
      group: group || null,
      signupSociumRole,
      applyForSelfGovernment,
      personalDataConsent,
      telegramAuth,
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
      const authResult = await submitStudentSignup(
        result.data,
        confirmPassword,
        pendingAvatarFile,
        telegramAuth,
      );
      if (!authResult.ok) {
        setFormError(authResult.error ?? getAuthErrorMessage("default"));
        if (authResult.fieldErrors) {
          setFieldErrors(authResult.fieldErrors);
        }
        writeSignupFormDraft(currentSignupDraft());
        return;
      }

      clearSignupFormDraft();
      clearLiveErrors();
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

        {applyForSelfGovernment ? (
          <FormAlert variant="info" className="auth-shell__alert">
            {SELF_GOVERNMENT_APPLICATION_REQUIREMENTS_HINT}
          </FormAlert>
        ) : null}

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
            error={fieldError("name", fieldErrors.name)}
          >
            <Input
              id="signup-name"
              name="name"
              type="text"
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateField("name", name, "plain-text")}
              disabled={loading}
            />
          </FormField>

          <FormField
            label="Surname"
            htmlFor="signup-surname"
            error={fieldError("surname", fieldErrors.surname)}
            hint={applyForSelfGovernment ? SELF_GOVERNMENT_APPLICATION_FIELD_HINT : undefined}
          >
            <Input
              id="signup-surname"
              name="surname"
              type="text"
              autoComplete="family-name"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              onBlur={() => validateField("surname", surname, "plain-text")}
              disabled={loading}
            />
          </FormField>
        </div>

        <FormField
          label="Phone number"
          htmlFor="signup-phone"
          error={fieldErrors.phone}
          hint={
            applyForSelfGovernment
              ? SELF_GOVERNMENT_APPLICATION_FIELD_HINT
              : "Optional but recommended for general students."
          }
        >
          <Input
            id="signup-phone"
            name="phone"
            {...phoneInputProps}
            placeholder={phoneInputPlaceholder}
            value={phone}
            onChange={(e) => setPhone(filterPhoneInputChange(e.target.value))}
            onBlur={() => {
              const corrected = autocorrectPhoneFieldValue(phone);
              if (corrected !== phone) setPhone(corrected);
            }}
            disabled={loading}
            required={applyForSelfGovernment}
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
          <PasswordInput
            id="signup-confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            required
          />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!isTeacherSignup ? (
            <>
              <FormField
                label="Specialty"
                htmlFor="signup-specialty"
                error={fieldError("specialty", fieldErrors.specialty)}
                hint={
                  applyForSelfGovernment
                    ? SELF_GOVERNMENT_APPLICATION_FIELD_HINT
                    : "Pick from the list or type a new specialty — admins review new entries."
                }
              >
                <CreatableCatalogSelect
                  id="signup-specialty"
                  value={specialty}
                  onChange={setSpecialty}
                  onBlur={() => validateField("specialty", specialty, "plain-text")}
                  options={specialtyOptions}
                  placeholder="e.g. Software Engineering"
                  disabled={loading}
                />
              </FormField>

              <FormField
                label="Group"
                htmlFor="signup-group"
                error={fieldErrors.group}
                hint={
                  applyForSelfGovernment
                    ? SELF_GOVERNMENT_APPLICATION_FIELD_HINT
                    : "Pick from the list or enter your group number — admins review new entries."
                }
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
            </>
          ) : null}
        </div>

        <SignupSociumRoleSelect
          value={signupSociumRole}
          onChange={setSignupSociumRole}
          disabled={loading}
        />

        <FormField
          label="Profile photo"
          htmlFor="signup-avatar-file"
          error={fieldErrors.avatar}
          hint={
            isTeacherSignup || applyForSelfGovernment
              ? isTeacherSignup
                ? TEACHER_APPLICATION_FIELD_HINT
                : SELF_GOVERNMENT_APPLICATION_FIELD_HINT
              : "Optional — upload now or add later in profile settings."
          }
        >
          <AvatarImageField
            id="signup-avatar-file"
            value={avatar}
            onChange={setAvatar}
            deferUpload
            pendingFile={pendingAvatarFile}
            onPendingFileChange={setPendingAvatarFile}
            disabled={loading}
          />
        </FormField>

        <div className="flex flex-col gap-3 rounded-lg border border-(--color-border-default) bg-(--color-bg-panel) p-4">
          {isTeacherSignup ? (
            <p className="text-sm text-(--color-text-secondary)">
              {TEACHER_APPLICATION_REQUIREMENTS_HINT} After registration, institution
              administration or student self-government will review your access application.
            </p>
          ) : (
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
                  {TELEGRAM_REQUIRED_AT_MEMBERSHIP_APPLICATION
                    ? " When checked, every item in the requirements notice — including a linked Telegram account — must be completed before you submit."
                    : " When checked, complete every item in the requirements notice before you submit."}
                </span>
              </span>
            </label>
          )}

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

        {applyForSelfGovernment && TELEGRAM_REQUIRED_AT_MEMBERSHIP_APPLICATION ? (
          <FormAlert variant="info" title="After approval">
            {SELF_GOVERNMENT_APPLICATION_TELEGRAM_ADVISORY}
          </FormAlert>
        ) : null}

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
