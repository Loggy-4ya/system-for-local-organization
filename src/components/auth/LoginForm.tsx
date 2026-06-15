/**
 * @fileoverview Login form with client-side validation and native POST fallback (iOS-safe).
 *
 * @module src/components/auth/LoginForm
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { loginSchema } from "@shared/validation/authSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { getAuthErrorMessage } from "@shared/validation/authErrorCodes";

/**
 * Email/password login form inside the Figma auth shell.
 *
 * @returns Login form page content.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") ?? "/profile";
  const callbackUrl = rawCallback.startsWith("/") ? rawCallback : "/profile";
  
  const errorParam = searchParams.get("error");
  const initialError = getAuthErrorMessage(errorParam);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /**
   * Handle form submission.
   * Validates inputs on the client side before allowing native POST submission.
   *
   * @param e - Form submit event.
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    setFormError(null);
    setFieldErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      e.preventDefault();
      const formatted = formatZodErrors(result.error);
      setFormError(formatted.formError || "Please correct the validation errors.");
      setFieldErrors(formatted.fieldErrors);
    }
  }

  return (
    <AuthShell title="Sign in">
      <form
        method="POST"
        action="/api/auth/login"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        noValidate
      >
        <input type="hidden" name="redirectTo" value={callbackUrl} />

        {formError && (
          <FormAlert variant="error">
            {formError}
          </FormAlert>
        )}

        <FormField
          label="Email"
          htmlFor="login-email"
          error={fieldErrors.email}
        >
          <Input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="login-password"
          error={fieldErrors.password}
        >
          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </FormField>

        <Button type="submit" className="h-12 w-full mt-2">
          Sign in
        </Button>

        <p className="text-center text-sm text-(--color-text-secondary) mt-2">
          No account?{" "}
          <Link href="/signup" className="text-(--color-accent-user) no-underline hover:underline">
            Create account
          </Link>
        </p>
      </form>

      <OAuthButtonRow callbackUrl={callbackUrl} />
    </AuthShell>
  );
}

export default LoginForm;
