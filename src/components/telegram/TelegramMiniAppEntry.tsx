/**
 * @fileoverview Telegram Mini App entry — auto-login and first-visit onboarding.
 *
 * Loads inside the Telegram WebView at `/telegram`. Verifies `initData` server-side,
 * signs returning users in via bridge token, and shows onboarding for new visitors.
 *
 * @module src/components/telegram/TelegramMiniAppEntry
 */

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { StudentTitle } from "@shared/models/User";
import type { TelegramMiniAppPublicUser } from "@shared/domains/AuthDomain";
import { RoleChipGroup } from "@/components/auth/RoleChipGroup";
import {
  TelegramErrorCard,
  TelegramLoadingCard,
  TelegramNotConfiguredCard,
  TelegramOutsideAppCard,
} from "@/components/telegram/TelegramMiniAppStatusCard";
import { NEXUS_TELEGRAM_WEBAPP_READY_EVENT } from "@/components/telegram/TelegramWebAppViewportHost";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { FormAlert } from "@/components/ui/form-alert";
import { Spinner } from "@/components/ui/spinner";
import { submitTelegramBridgeSignIn } from "@/lib/credentialsAuthClient";
import { phoneInputProps, autocorrectPhoneFieldValue } from "@/lib/phoneInputProps";
import { filterPhoneInputChange } from "@shared/validation/phoneSchema";
import { signupSchema } from "@shared/validation/authSchemas";
import { formatZodErrors } from "@shared/validation/formatValidationErrors";
import { getAuthErrorMessage } from "@shared/validation/authErrorCodes";

type EntryPhase =
  | "loading"
  | "not_configured"
  | "outside_telegram"
  | "onboarding"
  | "error";

/** Props for {@link TelegramMiniAppEntry}. */
export interface TelegramMiniAppEntryProps {
  /** Whether server env has bot token and public username configured. */
  botConfigured: boolean;
  /** Public bot username when configured (for outside-Telegram guidance). */
  botUsername?: string | null;
}

/**
 * Mini App bootstrap UI — auto-auth or onboarding form.
 *
 * @param props - See {@link TelegramMiniAppEntryProps}.
 * @returns Telegram Mini App entry JSX.
 */
export function TelegramMiniAppEntry({
  botConfigured,
  botUsername = null,
}: TelegramMiniAppEntryProps) {
  const router = useRouter();

  const [phase, setPhase] = useState<EntryPhase>(
    botConfigured ? "loading" : "not_configured",
  );
  const [telegramUser, setTelegramUser] = useState<TelegramMiniAppPublicUser | null>(null);
  const [initData, setInitData] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [login, setLogin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [phonePrefilledFromBot, setPhonePrefilledFromBot] = useState(false);
  const [specialty, setSpecialty] = useState("");
  const [group, setGroup] = useState("");
  const [studentTitle, setStudentTitle] = useState<StudentTitle | null>("Neither");

  /**
   * Complete sign-in with a server-issued bridge token.
   *
   * @param bridgeToken - Short-lived HMAC bridge token.
   */
  const completeBridgeSignIn = useCallback(
    async (bridgeToken: string) => {
      const result = await submitTelegramBridgeSignIn(bridgeToken);
      if (!result.ok) {
        setFormError(result.error ?? getAuthErrorMessage("default"));
        setPhase("error");
        return;
      }

      router.push("/profile");
      router.refresh();
    },
    [router],
  );

  /**
   * Authenticate via initData on mount.
   *
   * @param rawInitData - Telegram WebApp initData query string.
   */
  const authenticate = useCallback(
    async (rawInitData: string) => {
      setFormError(null);

      try {
        const res = await fetch("/api/auth/telegram/mini-app", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: rawInitData }),
        });

        const data = (await res.json()) as {
          error?: string;
          needsOnboarding?: boolean;
          bridgeToken?: string;
          telegramUser?: TelegramMiniAppPublicUser;
          harvestedPhone?: string | null;
        };

        if (res.status === 503) {
          setPhase("not_configured");
          return;
        }

        if (!res.ok) {
          throw new Error(data.error ?? "Telegram authentication failed.");
        }

        if (data.bridgeToken) {
          await completeBridgeSignIn(data.bridgeToken);
          return;
        }

        if (data.needsOnboarding && data.telegramUser) {
          setTelegramUser(data.telegramUser);
          const suggestedLogin = data.telegramUser.username
            ? data.telegramUser.username.toLowerCase().replace(/[^a-z0-9._-]/g, "")
            : `tg${data.telegramUser.id}`;
          setLogin(suggestedLogin.slice(0, 32));
          if (data.harvestedPhone) {
            setPhone(data.harvestedPhone);
            setPhonePrefilledFromBot(true);
          }
          setPhase("onboarding");
          return;
        }

        throw new Error("Unexpected Telegram auth response.");
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Telegram authentication failed.");
        setPhase("error");
      }
    },
    [completeBridgeSignIn],
  );

  /** Initialize Telegram WebApp SDK after script load. */
  const bootstrapTelegram = useCallback(() => {
    if (!botConfigured) {
      setPhase("not_configured");
      return;
    }

    const webApp = window.Telegram?.WebApp;
    if (!webApp || !webApp.initData) {
      setPhase("outside_telegram");
      return;
    }

    webApp.ready();
    webApp.expand();
    setInitData(webApp.initData);
    void authenticate(webApp.initData);
  }, [authenticate, botConfigured]);

  useEffect(() => {
    if (!botConfigured) return;

    const tryBootstrap = () => {
      if (window.Telegram?.WebApp?.initData) {
        bootstrapTelegram();
      }
    };

    tryBootstrap();
    window.addEventListener(NEXUS_TELEGRAM_WEBAPP_READY_EVENT, tryBootstrap);
    return () => {
      window.removeEventListener(NEXUS_TELEGRAM_WEBAPP_READY_EVENT, tryBootstrap);
    };
  }, [bootstrapTelegram, botConfigured]);

  /**
   * Submit Mini App onboarding registration.
   *
   * @param e - Form submit event.
   */
  async function handleOnboardingSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const parsed = signupSchema.safeParse({
      login,
      email: email || null,
      password,
      phone: phone || null,
      specialty: specialty || null,
      group: group || null,
      studentTitle: studentTitle ?? "Neither",
    });

    if (!parsed.success) {
      const formatted = formatZodErrors(parsed.error);
      setFormError(formatted.formError || "Please correct the validation errors.");
      setFieldErrors(formatted.fieldErrors);
      return;
    }

    if (!initData) {
      setFormError("Telegram session expired. Close and reopen the Mini App.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/telegram/mini-app/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData,
          login: parsed.data.login,
          password: parsed.data.password,
          email: parsed.data.email,
          phone: parsed.data.phone,
          specialty: parsed.data.specialty,
          group: parsed.data.group,
          studentTitle: parsed.data.studentTitle,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        fieldErrors?: Record<string, string>;
        bridgeToken?: string;
      };

      if (res.status === 503) {
        setPhase("not_configured");
        return;
      }

      if (!res.ok) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        throw new Error(data.error ?? "Registration failed.");
      }

      if (!data.bridgeToken) {
        throw new Error("Registration succeeded but sign-in token was missing.");
      }

      await completeBridgeSignIn(data.bridgeToken);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const [miniAppUrl, setMiniAppUrl] = useState("/telegram");

  useEffect(() => {
    setMiniAppUrl(`${window.location.origin}/telegram`);
  }, []);

  if (phase === "not_configured") {
    return <TelegramNotConfiguredCard miniAppUrl={miniAppUrl} />;
  }

  if (phase === "loading") {
    return <TelegramLoadingCard />;
  }

  if (phase === "outside_telegram") {
    return <TelegramOutsideAppCard botUsername={botUsername} />;
  }

  if (phase === "error") {
    return <TelegramErrorCard message={formError} />;
  }

  const greeting = telegramUser
    ? `Welcome, ${telegramUser.first_name}!`
    : "Create your Nexus account";

  return (
    <div className="glass-panel w-full rounded-lg p-6 md:p-8">
      <h1 className="text-xl font-semibold text-(--color-text-primary)">{greeting}</h1>
      <p className="mt-2 text-sm text-(--color-text-secondary)">
        Set a login and password to finish linking your Telegram account to Nexus. Share your phone
        with the bot first to pre-fill it here.
      </p>

      <form onSubmit={handleOnboardingSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        {formError && <FormAlert variant="error">{formError}</FormAlert>}

        <FormField label="Login" htmlFor="tg-login" error={fieldErrors.login}>
          <Input
            id="tg-login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            spellCheck={false}
            disabled={submitting}
            required
          />
        </FormField>

        <FormField
          label="Email"
          htmlFor="tg-email"
          error={fieldErrors.email}
          hint="Optional — for OAuth merge and notifications."
        >
          <Input
            id="tg-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="Password" htmlFor="tg-password" error={fieldErrors.password}>
          <Input
            id="tg-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={submitting}
            required
          />
        </FormField>

        <FormField
          label="Phone"
          htmlFor="tg-phone"
          error={fieldErrors.phone}
          hint={
            phonePrefilledFromBot
              ? "Imported from your Telegram bot contact share — you can edit it."
              : "Optional — share your contact with the bot via /start, then reopen this form."
          }
        >
          <Input
            id="tg-phone"
            value={phone}
            onChange={(e) => setPhone(filterPhoneInputChange(e.target.value))}
            onBlur={() => {
              const corrected = autocorrectPhoneFieldValue(phone);
              if (corrected !== phone) setPhone(corrected);
            }}
            disabled={submitting}
            {...phoneInputProps}
          />
        </FormField>

        <FormField label="Specialty" htmlFor="tg-specialty" error={fieldErrors.specialty}>
          <Input
            id="tg-specialty"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="Group" htmlFor="tg-group" error={fieldErrors.group}>
          <Input
            id="tg-group"
            value={group}
            onChange={(e) => setGroup(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-(--color-text-primary)">Role</span>
          <RoleChipGroup value={studentTitle} onChange={setStudentTitle} />
        </div>

        <Button type="submit" className="mt-2 h-12 w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner className="size-4" />
              Creating account…
            </>
          ) : (
            "Continue to Nexus"
          )}
        </Button>
      </form>
    </div>
  );
}

export default TelegramMiniAppEntry;
