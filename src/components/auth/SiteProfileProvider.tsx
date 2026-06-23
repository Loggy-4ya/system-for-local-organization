/**
 * @fileoverview Client provider that bootstraps basic profile data on site entry.
 *
 * Seeds from the server-hydrated Auth.js session, then refreshes from
 * `GET /api/me` so header chrome stays aligned with MongoDB after login and
 * profile edits without requiring a full document reload.
 *
 * @module src/components/auth/SiteProfileProvider
 */

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { signOut, useSession } from "next-auth/react";
import type { BasicSiteProfile } from "@shared/lib/siteProfileBasic";
import { showAdminPanelForRole } from "@shared/lib/siteProfileBasic";
import { fetchBasicSiteProfile } from "@/lib/siteProfileClient";

/** Values exposed to site chrome via {@link useSiteProfile}. */
export interface SiteProfileContextValue {
  /** Latest basic profile snapshot, or null when signed out. */
  profile: BasicSiteProfile | null;
  /** Whether a signed-in session is active. */
  isAuthenticated: boolean;
  /** Whether admin-only global nav links should render. */
  showAdminPanel: boolean;
  /** True while the entry bootstrap request is in flight. */
  isLoading: boolean;
  /** Re-fetch profile from `/api/me`. */
  refreshProfile: () => Promise<void>;
}

const SiteProfileContext = createContext<SiteProfileContextValue | null>(null);

/** Props for {@link SiteProfileProvider}. */
export interface SiteProfileProviderProps {
  children: ReactNode;
  /** Server-hydrated profile from root layout `auth()` — avoids header flash. */
  initialProfile?: BasicSiteProfile | null;
}

/**
 * Provides basic profile state for global header/footer chrome.
 *
 * @param props - Child tree and optional SSR profile seed.
 * @returns Provider-wrapped children.
 */
export function SiteProfileProvider({
  children,
  initialProfile = null,
}: SiteProfileProviderProps) {
  const { status } = useSession();
  const [profile, setProfile] = useState<BasicSiteProfile | null>(initialProfile);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (status !== "authenticated") {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    try {
      const next = await fetchBasicSiteProfile();
      if (next === null) {
        setProfile(null);
        await signOut({ redirect: false });
        return;
      }
      setProfile(next);
    } catch (err) {
      console.error("[SiteProfileProvider] bootstrap failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      setProfile(null);
      return;
    }

    void refreshProfile();
  }, [status, refreshProfile]);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  const value = useMemo<SiteProfileContextValue>(
    () => ({
      profile,
      isAuthenticated: Boolean(profile?.id),
      showAdminPanel: showAdminPanelForRole(profile?.role),
      isLoading,
      refreshProfile,
    }),
    [profile, isLoading, refreshProfile],
  );

  return (
    <SiteProfileContext.Provider value={value}>{children}</SiteProfileContext.Provider>
  );
}

/**
 * Read the site chrome profile context when the provider is mounted.
 *
 * @returns Site profile state, or `null` outside {@link SiteProfileProvider}.
 */
export function useOptionalSiteProfile(): SiteProfileContextValue | null {
  return useContext(SiteProfileContext);
}

/**
 * Read the site chrome profile context.
 *
 * @returns Site profile state for header rendering.
 * @throws When called outside {@link SiteProfileProvider}.
 */
export function useSiteProfile(): SiteProfileContextValue {
  const ctx = useOptionalSiteProfile();
  if (!ctx) {
    throw new Error("useSiteProfile must be used within SiteProfileProvider.");
  }
  return ctx;
}

export default SiteProfileProvider;
