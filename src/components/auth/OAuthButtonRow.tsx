/**
 * @fileoverview OAuth and Telegram sign-in button row for auth pages.
 *
 * @module src/components/auth/OAuthButtonRow
 */

"use client";

import { signIn } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

/** Props for {@link OAuthButtonRow}. */
export interface OAuthButtonRowProps {
  /** Post-auth redirect path. */
  callbackUrl?: string;
}

/** Telegram widget user payload shape. */
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

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
export function OAuthButtonRow({ callbackUrl = "/profile" }: OAuthButtonRowProps) {
  const telegramRef = useRef<HTMLDivElement>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  /**
   * Handle Telegram widget callback — verify server-side then bridge to session.
   *
   * @param user - Telegram widget auth payload.
   */
  const handleTelegramAuth = useCallback(
    async (user: TelegramUser) => {
      try {
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
    [callbackUrl]
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
          onClick={() => signIn("google", { callbackUrl })}
        >
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => signIn("apple", { callbackUrl })}
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
