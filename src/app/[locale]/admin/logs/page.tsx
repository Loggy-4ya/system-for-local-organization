/**
 * @fileoverview Admin page for multi-section system audit logs.
 *
 * @module src/app/admin/logs/page
 */

import { AdminSystemLogsShell } from "@/components/admin/AdminSystemLogsShell";
import { resolveSystemLogsSectionId } from "@/lib/systemLogsSections";
import { requireLegacyAdminPage } from "@/lib/adminPageGuards";

/** Route search params for `/admin/logs`. */
interface SystemLogsPageProps {
  searchParams: Promise<{ section?: string; targetUserId?: string }>;
}

/**
 * System logs hub — `/admin/logs`.
 *
 * @param props - Next.js page props including `section` query.
 * @returns Server-rendered multi-section logs shell.
 */
export default async function SystemLogsAdminPage({ searchParams }: SystemLogsPageProps) {
  await requireLegacyAdminPage("/admin/logs");
  const params = await searchParams;
  const initialSection = resolveSystemLogsSectionId(params.section);
  const initialTargetUserId = params.targetUserId?.trim() || undefined;

  return (
    <AdminSystemLogsShell
      initialSection={initialSection}
      initialTargetUserId={initialTargetUserId}
    />
  );
}
