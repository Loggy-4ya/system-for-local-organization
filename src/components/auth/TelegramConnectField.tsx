"use client";

/**
 * @fileoverview Telegram Login Widget for connect-only flows (signup, profile link).
 *
 * @module src/components/auth/TelegramConnectField
 */

import { useCallback, useEffect, useRef } from "react";
import type { TelegramWidgetPayload } from "@shared/domains/AuthDomain";
import { FormAlert } from "@/components/ui/form-alert";
import { cn } from "@/lib/utils";

/** Props for {@link TelegramConnectField}. */
export interface TelegramConnectFieldProps {
  /** Verified widget payload when connected. */
  value: TelegramWidgetPayload | null;
  /** Called when the user authorizes via Telegram. */
  onChange: (payload: TelegramWidgetPayload | null) => void;
  /** Disables the widget container. */
  disabled?: boolean;
  /** Optional field-level error message. */
  error?: string | null;
  /** Additional class names on the root container. */
  className?: string;
}

declare global {
  interface Window {
    onNexusTelegramConnect?: (user: TelegramWidgetPayload) => void;
  }
}

/**
 * Telegram Login Widget that stores a verified payload without signing in.
 *
 * @param props - Controlled connect field props.
 * @returns Telegram connect field JSX.
 */
export function TelegramConnectField({
  value,
  onChange,
  disabled = false,
  error = null,
  className,
}: TelegramConnectFieldProps) {
  const telegramRef = useRef<HTMLDivElement>(null);
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  const handleTelegramAuth = useCallback(
    (payload: TelegramWidgetPayload) => {
      onChange(payload);
    },
    [onChange],
  );

  useEffect(() => {
    window.onNexusTelegramConnect = handleTelegramAuth;

    if (!botUsername || !telegramRef.current || disabled) return;

    telegramRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "medium");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onNexusTelegramConnect(user)");
    script.setAttribute("data-request-access", "write");
    telegramRef.current.appendChild(script);

    return () => {
      delete window.onNexusTelegramConnect;
    };
  }, [botUsername, disabled, handleTelegramAuth]);

  if (!botUsername) {
    return (
      <FormAlert variant="info" title="Telegram unavailable">
        Telegram connection is required but the bot is not configured on this server.
      </FormAlert>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <FormAlert variant="success" title="Telegram connected">
          Authorized as {value.username ? `@${value.username}` : value.first_name}. You can reconnect
          below if needed.
        </FormAlert>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)]">
          Tap the button below and approve access in Telegram. Required for self-government
          membership applications.
        </p>
      )}

      <div
        ref={telegramRef}
        className={cn("flex justify-center", disabled && "pointer-events-none opacity-60")}
      />

      {value ? (
        <button
          type="button"
          className="self-start text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          Clear connection
        </button>
      ) : null}

      {error ? <p className="text-xs text-[var(--color-accent-warning,#f59e0b)]">{error}</p> : null}
    </div>
  );
}

export default TelegramConnectField;
