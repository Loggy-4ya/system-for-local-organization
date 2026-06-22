/**
 * @fileoverview Admin page for membership application review.
 *
 * @module src/app/admin/membership-applications/page
 */

import { MembershipApplicationsEditorShell } from "@/components/admin/MembershipApplicationsEditorShell";
import { requireSociumRoleAssignerPage } from "@/lib/adminPageGuards";

/**
 * Membership applications admin page.
 *
 * @returns Server-rendered review queue.
 */
export default async function MembershipApplicationsAdminPage() {
  await requireSociumRoleAssignerPage("/admin/membership-applications");
  return <MembershipApplicationsEditorShell />;
}
