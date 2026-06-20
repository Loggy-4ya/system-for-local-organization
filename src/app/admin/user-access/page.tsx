/**
 * @fileoverview Admin page for global user access and permission settings.
 *
 * @module src/app/admin/user-access/page
 */

import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { UserAccessEditorShell } from "@/components/access-control/UserAccessEditorShell";
import { requireAccessControlManagerPage } from "@/lib/adminPageGuards";

/**
 * User access settings admin page — `/admin/user-access`.
 *
 * @returns Server-rendered permissions editor.
 */
export default async function UserAccessAdminPage() {
  await requireAccessControlManagerPage();

  const doc = await AccessControlDomain.loadOrSeed();
  const config = AccessControlDomain.toPublicConfig(doc);

  return <UserAccessEditorShell initialConfig={config} />;
}
