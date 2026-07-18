/**
 * @fileoverview Login page route.
 *
 * @module src/app/[locale]/(auth)/login/page
 */

import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { LoginForm } from "@/components/auth/LoginForm";
import { LoginLoadingFallback } from "@/components/auth/LoginLoadingFallback";

/**
 * Student and staff login page.
 *
 * @param props - Route params promise with locale segment.
 * @returns Login page with suspense boundary for useSearchParams.
 */
export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <Suspense fallback={<LoginLoadingFallback />}>
      <LoginForm />
    </Suspense>
  );
}
