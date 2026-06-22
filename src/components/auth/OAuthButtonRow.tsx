/**
 * @fileoverview OAuth and Telegram sign-in button row for auth pages.
 *
 * @module src/components/auth/OAuthButtonRow
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { OAUTH_LINK_USER_COOKIE } from "@/lib/oauthLinkCookie";
import type { TelegramWidgetPayload } from "@shared/domains/AuthDomain";

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
 * Row of third-party sign-in options: Google, Apple, and Telegram Login Widget.
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
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  /**
   * Set a short-lived cookie so Auth.js merges OAuth into the signed-in account.
   *
   * @param userId - MongoDB user id to link.
   */
  const setOAuthLinkCookie = useCallback((userId: string) => {
    document.cookie = `${OAUTH_LINK_USER_COOKIE}=${encodeURIComponent(userId)}; path=/; max-age=300; samesite=lax`;
  }, []);

  /**
   * Start OAuth sign-in, optionally linking to an existing account.
   *
   * @param provider - Auth.js provider id.
   */
  const handleOAuthSignIn = useCallback(
    (provider: "google" | "apple") => {
      if (linkUserId) {
        setOAuthLinkCookie(linkUserId);
      }
      void signIn(provider, { callbackUrl });
    },
    [callbackUrl, linkUserId, setOAuthLinkCookie],
  );

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

    if (!botUsername || !telegramRef.current) return;

    telegramRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    telegramRef.current.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, handleTelegramAuth]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--color-border-default)]" />
        <span className="text-xs text-[var(--color-text-secondary)]">or continue with</span>
        <div className="h-px flex-1 bg-[var(--color-border-default)]" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => handleOAuthSignIn("google")}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => handleOAuthSignIn("apple")}
        >
          Apple
        </Button>
      </div>

      {botUsername ? (
        <div ref={telegramRef} className="flex justify-center" />
      ) : (
        <p className="text-center text-xs text-[var(--color-text-secondary)]">
          Telegram sign-in unavailable (bot not configured)
        </p>
      )}
    </div>
  );
}

export default OAuthButtonRow;
