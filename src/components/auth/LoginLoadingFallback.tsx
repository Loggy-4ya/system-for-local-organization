"use client";

/**
 * @fileoverview Localized Suspense fallback for the login route.
 *
 * @module src/components/auth/LoginLoadingFallback
 */

import { useTranslations } from "next-intl";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { SiteLoader } from "@/components/ui/SiteLoader";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/**
 * Centered loader shown while {@link LoginForm} hydrates search params.
 *
 * @returns Login page loading shell.
 */
export function LoginLoadingFallback() {
  const t = useTranslations("common");

  return (
    <StaticPageShell
      contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH}
      className="items-center justify-center"
    >
      <SiteLoader label={t("loading")} />
    </StaticPageShell>
  );
}

export default LoginLoadingFallback;
