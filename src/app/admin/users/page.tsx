/**
 * @fileoverview Admin page for the institutional User Directory.
 *
 * @module src/app/admin/users/page
 */

import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { UserDirectoryShell } from "@/components/user-directory/UserDirectoryShell";
import { requireDirectoryViewerPage } from "@/lib/adminPageGuards";

/**
 * User Directory admin page — `/admin/users`.
 *
 * @returns Server-rendered User Directory shell.
 */
export default async function UserDirectoryAdminPage() {
  const user = await requireDirectoryViewerPage();

  const doc = await AccessControlDomain.loadOrSeed();
  const config = AccessControlDomain.toPublicConfig(doc);
  const currentUser = AuthDomain.toPublicUser(user);
  const canMutateDirectory = await AccessControlDomain.canUserMutateDirectory(user);

  return (
    <UserDirectoryShell
      initialConfig={config}
      currentUser={currentUser}
      canMutateDirectory={canMutateDirectory}
    />
  );
}
