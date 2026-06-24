/**
 * @fileoverview Client helpers for Telegram Mini App initData authentication.
 *
 * @module src/lib/telegramMiniAppAuthClient
 */

import { signIn } from "next-auth/react";

/** Response from POST `/api/auth/telegram/mini-app`. */
export interface TelegramMiniAppAuthResponse {
  needsOnboarding?: boolean;
  bridgeToken?: string;
  userId?: string;
  harvestedPhone?: string | null;
  telegramUser?: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    photo_url?: string;
  };
  error?: string;
}

/**
 * Read signed Mini App `initData` from the Telegram WebView SDK.
 *
 * @returns Raw initData query string or null when unavailable.
 */
export function readTelegramWebAppInitData(): string | null {
  if (typeof window === "undefined") return null;
  const initData = window.Telegram?.WebApp?.initData?.trim();
  return initData || null;
}

/**
 * POST initData to the Mini App auth endpoint.
 *
 * @param initData - Signed Telegram WebApp initData string.
 * @returns Parsed JSON response from the server.
 */
export async function postTelegramMiniAppAuth(
  initData: string,
): Promise<TelegramMiniAppAuthResponse> {
  const res = await fetch("/api/auth/telegram/mini-app", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ initData }),
  });

  const data = (await res.json()) as TelegramMiniAppAuthResponse;
  if (!res.ok) {
    throw new Error(data.error ?? "Telegram sign-in failed.");
  }

  return data;
}

/**
 * Complete Auth.js session sign-in using a server-issued bridge token.
 *
 * @param bridgeToken - Short-lived HMAC bridge token.
 * @param callbackUrl - Post-auth redirect path.
 */
export async function signInWithTelegramBridgeToken(
  bridgeToken: string,
  callbackUrl: string,
): Promise<void> {
  const result = await signIn("credentials", {
    bridgeToken,
    redirect: false,
    callbackUrl,
  });

  if (result?.error) {
    throw new Error("Telegram sign-in failed.");
  }

  window.location.assign(callbackUrl);
}

/**
 * Run the full Mini App sign-in flow for an already-open WebView session.
 *
 * @param callbackUrl - Where to land after a successful bridge sign-in.
 * @returns Onboarding metadata when the Telegram user has no Nexus account yet.
 */
export async function signInViaTelegramMiniApp(
  callbackUrl: string,
): Promise<{ needsOnboarding: true; harvestedPhone: string | null } | { needsOnboarding: false }> {
  const initData = readTelegramWebAppInitData();
  if (!initData) {
    throw new Error("Open this page from the Nexus bot inside Telegram.");
  }

  window.Telegram?.WebApp?.ready?.();
  window.Telegram?.WebApp?.expand?.();

  const data = await postTelegramMiniAppAuth(initData);

  if (data.needsOnboarding) {
    return { needsOnboarding: true, harvestedPhone: data.harvestedPhone ?? null };
  }

  if (!data.bridgeToken) {
    throw new Error("Telegram sign-in failed.");
  }

  await signInWithTelegramBridgeToken(data.bridgeToken, callbackUrl);
  return { needsOnboarding: false };
}
