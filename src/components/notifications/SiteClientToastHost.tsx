"use client";

/**
 * @fileoverview Host for ephemeral client-side action toasts (editor saves, etc.).
 *
 * @module src/components/notifications/SiteClientToastHost
 */

import { useCallback, useSyncExternalStore } from "react";
import {
  dismissSiteClientToast,
  getSiteClientToasts,
  subscribeSiteClientToasts,
} from "@/lib/siteClientToast";
import { SiteToastCard } from "@/components/notifications/SiteToastCard";

/**
 * Renders locally triggered toasts in the shared bottom-right notification stack.
 *
 * @returns Client toast host markup or null when empty.
 */
export function SiteClientToastHost() {
  const toasts = useSyncExternalStore(
    subscribeSiteClientToasts,
    getSiteClientToasts,
    getSiteClientToasts,
  );

  const handleDismissComplete = useCallback((id: string) => {
    dismissSiteClientToast(id);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="site-notification-toast-group" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <SiteToastCard
          key={toast.id}
          variant={toast.variant}
          dismissLabel="Dismiss notification"
          autoDismissMs={toast.durationMs}
          onDismissComplete={() => handleDismissComplete(toast.id)}
        >
          <p className="site-broadcast-toast__title">{toast.title}</p>
          {toast.body ? <p className="site-broadcast-toast__body">{toast.body}</p> : null}
        </SiteToastCard>
      ))}
    </div>
  );
}

export default SiteClientToastHost;
