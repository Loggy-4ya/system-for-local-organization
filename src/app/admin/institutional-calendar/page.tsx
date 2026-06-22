/**
 * @fileoverview Admin page for institutional yearly calendar rules.
 *
 * @module src/app/admin/institutional-calendar/page
 */

import { InstitutionalCalendarEditorShell } from "@/components/admin/InstitutionalCalendarEditorShell";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/**
 * Institutional calendar admin page.
 *
 * @returns Server-rendered calendar editor.
 */
export default async function InstitutionalCalendarAdminPage() {
  await requireLegacyAdminPage("/admin/institutional-calendar");
  return <InstitutionalCalendarEditorShell />;
}
