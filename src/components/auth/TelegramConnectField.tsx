"use client";

/**
 * @fileoverview Telegram Login Widget for connect-only flows (signup, profile link).
 *
 * @module src/components/auth/TelegramConnectField
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { TelegramWidgetPayload } from "@shared/domains/AuthDomain";
import { normalizeTelegramBotUsername } from "@shared/lib/telegramBotUsername";
import { devAuthNeedsHttpsTunnel, DEV_AUTH_TUNNEL_HINT } from "@shared/lib/devAuthTunnelHint";
import {
  isTelegramWebAppClient,
  mountTelegramLoginWidget,
} from "@/lib/telegramLoginWidget";
import { TelegramWebAppAuthButton } from "@/components/telegram/TelegramWebAppAuthButton";
import { NEXUS_TELEGRAM_WEBAPP_READY_EVENT } from "@/components/telegram/TelegramWebAppViewportHost";
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
  const t = useTranslations("auth.telegramConnect");
  const telegramRef = useRef<HTMLDivElement>(null);
  const botUsername = normalizeTelegramBotUsername(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME);
  const [needsTunnel, setNeedsTunnel] = useState(false);
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

  const handleTelegramAuth = useCallback(
    (payload: TelegramWidgetPayload) => {
      onChange(payload);
    },
    [onChange],
  );

  useEffect(() => {
    window.onNexusTelegramConnect = handleTelegramAuth;

    if (!botUsername || !telegramRef.current || disabled || telegramContext !== "browser") return;

    mountTelegramLoginWidget(telegramRef.current, {
      botUsername,
      onAuthCallbackName: "onNexusTelegramConnect",
      size: "large",
    });

    return () => {
      delete window.onNexusTelegramConnect;
    };
  }, [botUsername, disabled, handleTelegramAuth, telegramContext]);

  if (!botUsername) {
    return (
      <FormAlert variant="info" title={t("unavailableTitle")}>
        {t("unavailableBody")}
      </FormAlert>
    );
  }

  if (needsTunnel) {
    return (
      <FormAlert variant="info" title={t("tunnelTitle")}>
        {DEV_AUTH_TUNNEL_HINT}
      </FormAlert>
    );
  }

  if (telegramContext === "mini-app") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <p className="text-xs text-[var(--color-text-secondary)]">{t("miniAppHint")}</p>
        <TelegramWebAppAuthButton
          label={t("connectButton")}
          callbackUrl="/signup"
        />
      </div>
    );
  }

  const connectedName = value?.username ? `@${value.username}` : value?.first_name ?? "";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value ? (
        <FormAlert variant="success" title={t("connectedTitle")}>
          {t("connectedBody", { name: connectedName })}
        </FormAlert>
      ) : (
        <p className="text-xs text-[var(--color-text-secondary)]">{t("browserHint")}</p>
      )}

      <div
        ref={telegramRef}
        className={cn(
          "nexus-telegram-login-widget",
          disabled && "pointer-events-none opacity-60",
        )}
      />

      {value ? (
        <button
          type="button"
          className="self-start text-xs text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
          disabled={disabled}
          onClick={() => onChange(null)}
        >
          {t("clearConnection")}
        </button>
      ) : null}

      {error ? <p className="text-xs text-[var(--color-accent-warning,#f59e0b)]">{error}</p> : null}
    </div>
  );
}

export default TelegramConnectField;
