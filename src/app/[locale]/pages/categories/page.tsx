/**
 * @fileoverview Legacy redirect — catalog lives on `/pages`.
 *
 * @module src/app/pages/categories/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";

/**
 * Redirect `/pages/categories` → `/pages`.
 *
 * @param props - Locale route params.
 */
export default async function LegacyPageCategoriesRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return await redirect("/pages");
}
