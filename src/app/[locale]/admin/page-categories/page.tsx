/**
 * @fileoverview Legacy redirect — catalog editor lives on `/pages/edit`.
 *
 * @module src/app/admin/page-categories/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";

/**
 * Redirect `/admin/page-categories` → `/pages/edit`.
 *
 * @param props - Locale route params.
 */
export default async function LegacyPageCategoriesAdminRedirect({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return await redirect("/pages/edit");
}
