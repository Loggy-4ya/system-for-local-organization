/**
 * @fileoverview Admin page for security content sanitization audit log.
 *
 * Legacy route — redirects to the unified system logs page.
 *
 * @module src/app/admin/security-audits/page
 */

import { redirect } from "next/navigation";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/**
 * Legacy sanitization audit route — redirects to `/admin/logs`.
 */
export default async function SecurityAuditsAdminPage() {
  await requireLegacyAdminPage("/admin/security-audits");
  redirect("/admin/logs?section=content-sanitization");
}
