/**
 * @fileoverview Admin page for Telegram project workspace automation policy.
 *
 * @module src/app/admin/telegram-workspaces/page
 */

import { TelegramWorkspaceEditorShell } from "@/components/admin/TelegramWorkspaceEditorShell";
import { TelegramWorkspaceDomain } from "@shared/domains/TelegramWorkspaceDomain";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/**
 * Telegram workspace automation admin page.
 *
 * @returns Server-rendered policy editor.
 */
export default async function TelegramWorkspacesAdminPage() {
  await requireLegacyAdminPage("/admin/telegram-workspaces");
  const initialConfig = await TelegramWorkspaceDomain.getPublicConfig();
  return <TelegramWorkspaceEditorShell initialConfig={initialConfig} />;
}
