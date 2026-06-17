/**
 * @fileoverview Student signup form with client-side validation and inline errors.
 *
 * @module src/components/auth/StudentSignUpForm
 */

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { StudentTitle } from "@shared/models/User";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import { RoleChipGroup } from "@/components/auth/RoleChipGroup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";
import { submitStudentSignup } from "@/lib/credentialsAuthClient";
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

  const initialLogin = searchParams.get("login") ?? "";
  const initialEmail = searchParams.get("email") ?? "";
  const initialSpecialty = searchParams.get("specialty") ?? "";
  const initialGroup = searchParams.get("group") ?? "";

  const [login, setLogin] = useState(initialLogin);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [group, setGroup] = useState(initialGroup);
  const [studentTitle, setStudentTitle] = useState<StudentTitle | null>("Neither");
  const [formError, setFormError] = useState<string | null>(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  /** Strip legacy redirect error query params after hydrating the inline alert. */
  useEffect(() => {
    if (!errorParam) return;
    router.replace("/signup", { scroll: false });
  }, [errorParam, router]);

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
      specialty: specialty || null,
      group: group || null,
      studentTitle: studentTitle ?? "Neither",
    });

    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      setFormError(formatted.formError || "Please correct the validation errors.");
      setFieldErrors(formatted.fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const authResult = await submitStudentSignup(result.data);
      if (!authResult.ok) {
        setFormError(authResult.error ?? getAuthErrorMessage("default"));
        if (authResult.fieldErrors) {
          setFieldErrors(authResult.fieldErrors);
        }
        return;
      }

      router.push("/profile");
      router.refresh();
    } catch {
      setFormError(getAuthErrorMessage("default"));
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

        <FormField
          label="Password"
          htmlFor="signup-password"
          error={fieldErrors.password}
        >
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </FormField>

        <FormField
          label="Specialty"
          htmlFor="specialty"
          error={fieldErrors.specialty}
        >
          <Input
            id="specialty"
            name="specialty"
            type="text"
            placeholder="e.g. Software Engineering"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            disabled={loading}
          />
        </FormField>

        <FormField
          label="Group"
          htmlFor="group"
          error={fieldErrors.group}
        >
          <Input
            id="group"
            name="group"
            type="text"
            placeholder="e.g. SE-42"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            disabled={loading}
          />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Role</span>
          <RoleChipGroup value={studentTitle} onChange={setStudentTitle} />
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
