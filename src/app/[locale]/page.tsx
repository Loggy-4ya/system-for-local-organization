/**
 * @fileoverview Nexus root homepage — code-only marketing landing (not Puck-managed).
 *
 * @module src/app/[locale]/page
 */

import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HomeLandingShell } from "@/components/marketing/HomeLandingShell";

/**
 * Localized document metadata for the public homepage.
 *
 * @param props - Route params promise with locale segment.
 * @returns Page metadata for the active locale.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("homeTitle"),
    description: t("homeDescription"),
  };
}

/**
 * Site entry point — brief platform overview with a link to the public page catalog.
 *
 * @param props - Route params promise with locale segment.
 * @returns Homepage JSX inside global header/footer chrome.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeLandingShell />;
}
