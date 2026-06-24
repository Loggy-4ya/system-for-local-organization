/**
 * @fileoverview Ephemeral client-side toast queue for in-app action feedback.
 *
 * Used for editor save/publish confirmations and other local UI events.
 * Server-driven broadcasts use {@link SiteBroadcastToastHost} instead.
 *
 * @module src/lib/siteClientToast
 */

import { SITE_TOAST_DEFAULT_AUTO_DISMISS_MS } from "@/lib/siteToastMotion";

/** Visual variant for client toasts (matches broadcast toast tokens). */
export type SiteClientToastVariant = "info" | "success" | "warning" | "error";

/** Single client toast entry. */
export interface SiteClientToast {
  /** Stable id for dismiss + React keys. */
  id: string;
  /** Short headline. */
  title: string;
  /** Optional supporting copy. */
  body?: string;
  /** Colour accent variant. */
  variant: SiteClientToastVariant;
  /** Creation timestamp (milliseconds). */
  createdAt: number;
  /** Auto-dismiss delay passed to {@link SiteToastCard}. */
  durationMs: number;
}

/** Payload accepted by {@link showSiteClientToast}. */
export interface ShowSiteClientToastInput {
  /** Short headline. */
  title: string;
  /** Optional supporting copy. */
  body?: string;
  /** Colour accent variant. */
  variant?: SiteClientToastVariant;
  /** Auto-dismiss delay in milliseconds (0 = manual dismiss only). */
  durationMs?: number;
}

const DEFAULT_DURATION_MS = SITE_TOAST_DEFAULT_AUTO_DISMISS_MS;
const MAX_TOASTS = 4;

let toasts: SiteClientToast[] = [];
const listeners = new Set<() => void>();

/**
 * Read the current client toast snapshot.
 *
 * @returns Active toasts newest-first.
 */
export function getSiteClientToasts(): readonly SiteClientToast[] {
  return toasts;
}

/**
 * Subscribe to client toast updates (for `useSyncExternalStore`).
 *
 * @param listener - React external-store listener.
 * @returns Unsubscribe function.
 */
export function subscribeSiteClientToasts(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Remove a client toast after its exit animation completes.
 *
 * @param id - Toast id.
 */
export function dismissSiteClientToast(id: string): void {
  const next = toasts.filter((toast) => toast.id !== id);
  if (next.length === toasts.length) return;
  toasts = next;
  listeners.forEach((listener) => listener());
}

/**
 * Push a short-lived client toast (e.g. editor save confirmation).
 *
 * @param input - Toast copy and optional variant/duration.
 * @returns Created toast id.
 */
export function showSiteClientToast(input: ShowSiteClientToastInput): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const toast: SiteClientToast = {
    id,
    title: input.title,
    body: input.body,
    variant: input.variant ?? "success",
    createdAt: Date.now(),
    durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
  };

  toasts = [toast, ...toasts.filter((entry) => entry.id !== id)].slice(0, MAX_TOASTS);
  listeners.forEach((listener) => listener());

  return id;
}

/**
 * Clear all client toasts (e.g. on sign-out).
 */
export function clearSiteClientToasts(): void {
  if (toasts.length === 0) return;
  toasts = [];
  listeners.forEach((listener) => listener());
}
