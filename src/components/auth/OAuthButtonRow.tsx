/**
 * @fileoverview OAuth and Telegram sign-in button row for auth pages.
 *
 * @module src/components/auth/OAuthButtonRow
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormAlert } from "@/components/ui/form-alert";
import type { TelegramWidgetPayload } from "@shared/domains/AuthDomain";
import { normalizeTelegramBotUsername } from "@shared/lib/telegramBotUsername";
import { devAuthNeedsHttpsTunnel, DEV_AUTH_TUNNEL_HINT } from "@shared/lib/devAuthTunnelHint";
import {
  isTelegramWebAppClient,
  mountTelegramLoginWidget,
} from "@/lib/telegramLoginWidget";
import { TelegramWebAppAuthButton } from "@/components/telegram/TelegramWebAppAuthButton";
import { NEXUS_TELEGRAM_WEBAPP_READY_EVENT } from "@/components/telegram/TelegramWebAppViewportHost";

/** Props for {@link OAuthButtonRow}. */
export interface OAuthButtonRowProps {
  /** Post-auth redirect path. */
  callbackUrl?: string;
  /** When set, OAuth sign-in links the provider onto this existing user instead of creating a new account. */
  linkUserId?: string | null;
}

/** Telegram widget user payload shape. */
type TelegramUser = TelegramWidgetPayload;

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramUser) => void;
  }
}

/**
 * Row of third-party sign-in options: Telegram (widget or Mini App button).
 *
 * @param props - See {@link OAuthButtonRowProps}.
 * @returns OAuth button row JSX.
 */
export function OAuthButtonRow({
  callbackUrl = "/profile/settings?onboarding=1",
  linkUserId = null,
}: OAuthButtonRowProps) {
  const router = useRouter();
  const telegramRef = useRef<HTMLDivElement>(null);
  const botUsername = normalizeTelegramBotUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME);
  const [needsTunnel, setNeedsTunnel] = useState(false);
  /** `unknown` until the WebApp SDK loads or times out — avoids mounting the Login Widget in Telegram. */
  const [telegramContext, setTelegramContext] = useState<"unknown" | "mini-app" | "browser">(
    "unknown",
  );

  useEffect(() => {
    const detectTelegramContext = () => {
      setNeedsTunnel(
        devAuthNeedsHttpsTunnel(window.location.protocol, window.location.hostname),
      );
      if (isTelegramWebAppClient()) {
        setTelegramContext("mini-app");
        return;
      }
      if (window.Telegram !== undefined) {
        setTelegramContext("browser");
      }
    };

    const onTelegramSdkReady = () => {
      setTelegramContext(isTelegramWebAppClient() ? "mini-app" : "browser");
    };

    detectTelegramContext();
    window.addEventListener(NEXUS_TELEGRAM_WEBAPP_READY_EVENT, onTelegramSdkReady);

    const browserFallbackTimer = window.setTimeout(() => {
      setTelegramContext((current) => (current === "unknown" ? "browser" : current));
    }, 1500);

    return () => {
      window.removeEventListener(NEXUS_TELEGRAM_WEBAPP_READY_EVENT, onTelegramSdkReady);
      window.clearTimeout(browserFallbackTimer);
    };
  }, []);

  /**
   * Handle Telegram widget callback — verify server-side then bridge to session.
   *
   * @param user - Telegram widget auth payload.
   */
  const handleTelegramAuth = useCallback(
    async (user: TelegramUser) => {
      try {
        if (linkUserId) {
          const res = await fetch("/api/profile/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(user),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error ?? "Failed to link Telegram.");

          router.push(callbackUrl);
          router.refresh();
          return;
        }

        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Telegram sign-in failed.");

        await signIn("credentials", {
          bridgeToken: data.bridgeToken,
          redirect: true,
          callbackUrl,
        });
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Telegram sign-in failed.");
      }
    },
    [callbackUrl, linkUserId, router],
  );

  useEffect(() => {
    window.onTelegramAuth = handleTelegramAuth;

    if (!botUsername || !telegramRef.current || telegramContext !== "browser") return;

    mountTelegramLoginWidget(telegramRef.current, {
      botUsername,
      onAuthCallbackName: "onTelegramAuth",
      size: "large",
    });

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, handleTelegramAuth, telegramContext]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border-default)]" />
        <span className="text-xs text-[var(--color-text-secondary)]">or continue with</span>
        <div className="h-px flex-1 bg-[var(--color-border-default)]" />
      </div>

      <div className="flex w-full flex-col gap-2">
        {telegramContext === "mini-app" && !linkUserId ? (
          <TelegramWebAppAuthButton
            callbackUrl={callbackUrl}
            label="Sign in with Telegram"
            variant="outline"
            fullWidth
            showIcon
            className="h-12"
          />
        ) : null}

        {botUsername && telegramContext === "browser" ? (
          <div ref={telegramRef} className="nexus-telegram-login-widget" />
        ) : null}
      </div>

      {needsTunnel ? (
        <FormAlert variant="info" title="HTTPS tunnel required">
          {DEV_AUTH_TUNNEL_HINT}
        </FormAlert>
      ) : null}

      {telegramContext === "mini-app" && linkUserId ? (
        <FormAlert variant="info" title="Link Telegram in the bot">
          Open Nexus from your bot chat to link Telegram automatically, or use the Login Widget in a
          regular browser tab.
        </FormAlert>
      ) : null}

      {telegramContext === "browser" && !botUsername ? (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Telegram sign-in unavailable (bot not configured)
        </p>
      ) : null}
    </div>
  );
}

export default OAuthButtonRow;
