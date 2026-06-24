/**
 * @fileoverview Site-wide broadcast toast host — polls active messages for signed-in users.
 *
 * @module src/components/notifications/SiteBroadcastToastHost
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { SiteToastCard } from "@/components/notifications/SiteToastCard";

/** Active toast payload from GET /api/notifications/broadcasts. */
interface BroadcastToast {
  id: string;
  title: string | null;
  body: string;
  variant: "info" | "success" | "warning" | "error";
  createdAt: string;
}

/**
 * Fixed toast stack for institution-wide broadcast messages.
 *
 * @returns Toast host portal markup or null when empty / signed out.
 */
export function SiteBroadcastToastHost() {
  const { status } = useSession();
  const [toasts, setToasts] = useState<BroadcastToast[]>([]);

  const loadToasts = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/broadcasts");
      if (!res.ok) return;
      const data = (await res.json()) as { toasts?: BroadcastToast[] };
      setToasts(data.toasts ?? []);
    } catch {
      // Non-fatal — toasts are best-effort.
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      setToasts([]);
      return;
    }

    void loadToasts();
    const interval = window.setInterval(() => {
      void loadToasts();
    }, 60_000);

    return () => window.clearInterval(interval);
  }, [loadToasts, status]);

  /**
   * Remove a toast locally after its exit animation and persist dismissal server-side.
   *
   * @param id - Broadcast document id.
   */
  const finalizeDismiss = useCallback(async (id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    try {
      await fetch(`/api/notifications/broadcasts/${encodeURIComponent(id)}/dismiss`, {
        method: "POST",
      });
    } catch {
      // Optimistic UI already removed the toast.
    }
  }, []);

  if (status !== "authenticated" || toasts.length === 0) {
    return null;
  }

  return (
    <div
      className="site-broadcast-toast-host"
      role="region"
      aria-label="System announcements"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <SiteToastCard
          key={toast.id}
          variant={toast.variant}
          dismissLabel="Dismiss announcement"
          onDismissComplete={() => void finalizeDismiss(toast.id)}
        >
          {toast.title ? <p className="site-broadcast-toast__title">{toast.title}</p> : null}
          <p className="site-broadcast-toast__body">{toast.body}</p>
        </SiteToastCard>
      ))}
    </div>
  );
}

export default SiteBroadcastToastHost;
