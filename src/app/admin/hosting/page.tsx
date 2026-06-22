/**
 * @fileoverview Admin page for hosting mode diagnostics.
 *
 * @module src/app/admin/hosting/page
 */

import { HostingConfigEditorShell } from "@/components/admin/HostingConfigEditorShell";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/**
 * Hosting diagnostics admin page.
 */
export default async function HostingAdminPage() {
  await requireLegacyAdminPage("/admin/hosting");
  return <HostingConfigEditorShell />;
}
