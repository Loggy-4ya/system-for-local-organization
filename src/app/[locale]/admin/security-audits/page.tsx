/**
 * @fileoverview Admin page for security content sanitization audit log.
 *
 * Legacy route — redirects to the unified system logs page.
 *
 * @module src/app/admin/security-audits/page
 */

import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/**
 * Legacy sanitization audit route — redirects to `/admin/logs`.
 *
 * @param props - Locale route params.
 */
export default async function SecurityAuditsAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  await requireLegacyAdminPage("/admin/security-audits");
  return await redirect("/admin/logs?section=content-sanitization");
}
