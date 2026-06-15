/**
 * @fileoverview Student signup page route.
 *
 * @module src/app/(auth)/signup/page
 */

import { Suspense } from "react";
import { StudentSignUpForm } from "@/components/auth/StudentSignUpForm";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { SiteLoader } from "@/components/ui/SiteLoader";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/**
 * Student registration page matching Figma Auth/StudentSignUp.
 *
 * @returns Signup page with suspense boundary for useSearchParams.
 */
export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <StaticPageShell
          contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/signup"]}
          className="items-center justify-center"
        >
          <SiteLoader label="Loading…" />
        </StaticPageShell>
      }
    >
      <StudentSignUpForm />
    </Suspense>
  );
}
