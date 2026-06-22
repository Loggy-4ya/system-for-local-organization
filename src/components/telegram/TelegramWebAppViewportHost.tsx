/**
 * @fileoverview Root-layout host — Telegram Mini App viewport sync.
 *
 * When `window.Telegram.WebApp` is present, expands the WebView, mirrors stable viewport
 * height onto CSS variables, paints host chrome to match Nexus surfaces, and tags the
 * document so global CSS can fill the WebView backing without white strips.
 *
 * @module src/components/telegram/TelegramWebAppViewportHost
 */

"use client";

import Script from "next/script";
import { useEffect } from "react";
import {
  buildTelegramWebAppViewportStyleVars,
  normalizeTelegramWebAppChromeColor,
  TG_WEBAPP_ROOT_ATTR,
  type TelegramWebAppViewportSource,
} from "@shared/lib/telegramWebAppViewport";

/** Telegram Web App SDK URL (also injected natively on some clients). */
const TELEGRAM_WEB_APP_SDK = "https://telegram.org/js/telegram-web-app.js";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebAppViewportSource & { initData?: string };
    };
  }
}

/** Dispatched when the Telegram WebApp SDK is ready for Mini App auth bootstrap. */
export const NEXUS_TELEGRAM_WEBAPP_READY_EVENT = "nexus-telegram-webapp-ready";

function readTelegramWindowMetrics(): { innerWidth: number; innerHeight: number } {
  if (typeof window === "undefined") {
    return { innerWidth: 1, innerHeight: 1 };
  }

  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
  };
}

/**
 * Apply viewport CSS variables and host chrome colors from the WebApp instance.
 *
 * @param webApp - Active Telegram WebApp object.
 */
function syncTelegramWebAppViewport(webApp: TelegramWebAppViewportSource): void {
  const root = document.documentElement;
  const vars = buildTelegramWebAppViewportStyleVars(webApp, readTelegramWindowMetrics());
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }

  const surface = normalizeTelegramWebAppChromeColor(
    getComputedStyle(root).getPropertyValue("--color-bg-surface"),
  );
  webApp.setBackgroundColor?.(surface);
  webApp.setHeaderColor?.(surface);
}

/**
 * Re-expand and resync viewport metrics — Desktop Telegram applies expanded size a frame late.
 *
 * @param webApp - Active Telegram WebApp object.
 */
function resyncTelegramWebAppViewport(webApp: TelegramWebAppViewportSource): void {
  webApp.expand?.();
  syncTelegramWebAppViewport(webApp);

  if (typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    webApp.expand?.();
    syncTelegramWebAppViewport(webApp);
  });
}

/**
 * Initialize Telegram WebApp viewport behavior when the SDK is available.
 *
 * @returns Cleanup for listeners, or undefined when not inside Telegram.
 */
function bootstrapTelegramWebAppViewport(): (() => void) | undefined {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) return undefined;

  document.documentElement.setAttribute(TG_WEBAPP_ROOT_ATTR, "true");

  webApp.ready();
  resyncTelegramWebAppViewport(webApp);

  const resync = () => resyncTelegramWebAppViewport(webApp);

  webApp.onEvent?.("viewportChanged", resync);
  webApp.onViewportChanged?.(resync);
  window.addEventListener("resize", resync);
  window.dispatchEvent(new Event(NEXUS_TELEGRAM_WEBAPP_READY_EVENT));

  return () => {
    window.removeEventListener("resize", resync);
    document.documentElement.removeAttribute(TG_WEBAPP_ROOT_ATTR);
    document.documentElement.style.removeProperty("--tg-viewport-stable-height");
    document.documentElement.style.removeProperty("--tg-viewport-height");
    document.documentElement.style.removeProperty("--tg-viewport-width");
    document.documentElement.style.removeProperty("--tg-viewport-window-height");
  };
}

/**
 * Silent root-layout child — no UI; syncs Telegram Mini App viewport on mount.
 *
 * @returns SDK script + null render target.
 */
export function TelegramWebAppViewportHost() {
  useEffect(() => {
    return bootstrapTelegramWebAppViewport();
  }, []);

  return (
    <Script
      id="telegram-web-app-sdk"
      src={TELEGRAM_WEB_APP_SDK}
      strategy="afterInteractive"
      onLoad={() => {
        bootstrapTelegramWebAppViewport();
      }}
    />
  );
}

export default TelegramWebAppViewportHost;
