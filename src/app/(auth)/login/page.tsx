/**
 * @fileoverview Login page route.
 *
 * @module src/app/(auth)/login/page
 */

import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { SiteLoader } from "@/components/ui/SiteLoader";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/**
 * Student and staff login page.
 *
 * @returns Login page with suspense boundary for useSearchParams.
 */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <StaticPageShell
          contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/login"]}
          className="items-center justify-center"
        >
          <SiteLoader label="Loading…" />
        </StaticPageShell>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
