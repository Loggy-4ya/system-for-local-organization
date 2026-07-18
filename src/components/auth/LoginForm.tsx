/**
 * @fileoverview Login form with client-side validation and inline credential errors.
 *
 * @module src/components/auth/LoginForm
 */

"use client";

import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { OAuthButtonRow } from "@/components/auth/OAuthButtonRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";
import { stripLocalePrefix } from "@/lib/localePathLogic";
import { submitCredentialsLogin } from "@/lib/credentialsAuthClient";
import { loginSchema } from "@shared/validation/authSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { getAuthErrorMessage } from "@shared/validation/authErrorCodes";

/**
 * Email/password login form inside the Figma auth shell.
 *
 * @returns Login form page content.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  const rawCallback = searchParams.get("callbackUrl") ?? "/profile";
  const callbackUrl = stripLocalePrefix(
    rawCallback.startsWith("/") ? rawCallback : "/profile",
  );

  const errorParam = searchParams.get("error");
  const initialError = getAuthErrorMessage(errorParam);

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(initialError);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!errorParam) return;

    const nextParams = new URLSearchParams();
    if (callbackUrl !== "/profile") {
      nextParams.set("callbackUrl", callbackUrl);
    }
    const query = nextParams.toString();
    router.replace(query ? `/login?${query}` : "/login", { scroll: false });
  }, [callbackUrl, errorParam, router]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const result = loginSchema.safeParse({ login, password });
    if (!result.success) {
      const formatted = formatZodErrors(result.error);
      setFormError(formatted.formError || tc("validationFix"));
      setFieldErrors(formatted.fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const authResult = await submitCredentialsLogin(result.data.login, result.data.password);
      if (!authResult.ok) {
        setFormError(authResult.error ?? getAuthErrorMessage("credentials"));
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setFormError(getAuthErrorMessage("default"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title={t("signInTitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError && (
          <FormAlert variant="error" className="auth-shell__alert">
            {formError}
          </FormAlert>
        )}

        <FormField label={t("loginLabel")} htmlFor="login-handle" error={fieldErrors.login}>
          <Input
            id="login-handle"
            name="login"
            type="text"
            autoComplete="username"
            spellCheck={false}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            disabled={loading}
            required
          />
        </FormField>

        <FormField label={t("passwordLabel")} htmlFor="login-password" error={fieldErrors.password}>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </FormField>

        <Button type="submit" className="mt-2 h-12 w-full" disabled={loading}>
          {loading ? (
            <>
              <Spinner className="size-4" />
              {t("signingIn")}
            </>
          ) : (
            t("signInButton")
          )}
        </Button>

        <p className="mt-2 text-center text-sm text-(--color-text-secondary)">
          {t("noAccount")}{" "}
          <Link href="/signup" className="text-(--color-accent-user) no-underline hover:underline">
            {tc("createAccount")}
          </Link>
        </p>
      </form>

      <OAuthButtonRow callbackUrl={callbackUrl} />
    </AuthShell>
  );
}

export default LoginForm;
