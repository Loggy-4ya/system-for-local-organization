/**
 * @fileoverview Admin page for institutional general rules.
 *
 * @module src/app/admin/general-rules/page
 */

import { GeneralRulesDomain } from "@shared/domains/GeneralRulesDomain";
import { GeneralRulesEditorShell } from "@/components/admin/GeneralRulesEditorShell";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/**
 * General rules admin page — `/admin/general-rules`.
 *
 * @returns Server-rendered general rules editor.
 */
export default async function GeneralRulesAdminPage() {
  await requireLegacyAdminPage("/admin/general-rules");

  const doc = await GeneralRulesDomain.loadOrSeed();
  const config = GeneralRulesDomain.toPublicConfig(doc);

  return <GeneralRulesEditorShell initialConfig={config} />;
}
