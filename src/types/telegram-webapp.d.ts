/**
 * @fileoverview Telegram Mini App WebApp global typings shared across client entry points.
 */

/** Telegram Web App SDK object exposed on `window.Telegram.WebApp`. */
interface TelegramWebApp {
  initData?: string;
  viewportHeight: number;
  viewportStableHeight?: number;
  ready: () => void;
  expand: () => void;
  setBackgroundColor?: (color: string) => void;
  setHeaderColor?: (color: string) => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  onViewportChanged?: (callback: () => void) => void;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
