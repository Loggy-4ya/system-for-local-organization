/**
 * @fileoverview Mount Telegram Login Widget and detect Mini App WebView context.
 *
 * The widget embeds an iframe from `oauth.telegram.org` and must not be shown inside
 * the Telegram Mini App (use Mini App `initData` auth instead).
 *
 * @module src/lib/telegramLoginWidget
 */

/** Options for {@link mountTelegramLoginWidget}. */
export interface MountTelegramLoginWidgetOptions {
  /** Bot username without `@`. */
  botUsername: string;
  /** Global callback name registered on `window` before the script loads. */
  onAuthCallbackName: string;
  /** Widget size — Telegram SDK attribute. */
  size?: "large" | "medium" | "small";
}

/**
 * Whether the page runs inside the Telegram Mini App WebView.
 *
 * The Login Widget is for external browsers only — use {@link TelegramWebAppAuthButton}
 * when this returns true.
 *
 * @returns True when the Telegram WebApp SDK is active in this WebView.
 */
export function isTelegramWebAppClient(): boolean {
  if (typeof window === "undefined") return false;
  if (window.Telegram?.WebApp) return true;
  return document.documentElement.getAttribute("data-telegram-webapp") === "true";
}

/**
 * Read the per-request CSP nonce exposed by the root layout meta tag.
 *
 * @returns Nonce string or undefined when nonce mode is off.
 */
export function readCspNonceFromDocument(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = document.querySelector('meta[name="csp-nonce"]')?.getAttribute("content");
  return value?.trim() || undefined;
}

/**
 * Inject the official Telegram Login Widget script into a container element.
 *
 * @param container - Mount target cleared before each render.
 * @param options - Bot username and global auth callback name.
 */
export function mountTelegramLoginWidget(
  container: HTMLElement,
  options: MountTelegramLoginWidgetOptions,
): void {
  container.innerHTML = "";

  const script = document.createElement("script");
  script.src = "https://telegram.org/js/telegram-widget.js?22";
  script.async = true;

  const nonce = readCspNonceFromDocument();
  if (nonce) {
    script.nonce = nonce;
  }

  script.setAttribute("data-telegram-login", options.botUsername);
  script.setAttribute("data-size", options.size ?? "medium");
  script.setAttribute("data-radius", "8");
  script.setAttribute("data-onauth", `${options.onAuthCallbackName}(user)`);
  script.setAttribute("data-request-access", "write");
  container.appendChild(script);
}
