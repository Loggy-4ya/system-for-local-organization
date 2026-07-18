/**
 * @fileoverview Legacy redirect — catalog editor lives on `/pages/edit`.
 *
 * @module src/app/pages/categories/edit/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";

/**
 * Redirect `/pages/categories/edit` → `/pages/edit`.
 *
 * @param props - Locale route params.
 */
export default async function LegacyPageCategoriesEditRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return await redirect("/pages/edit");
}
