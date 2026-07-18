/**
 * @fileoverview Public pages catalog — read-only browse at `/pages`.
 *
 * @module src/app/pages/page
 */

import { setRequestLocale } from "next-intl/server";
import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { inferAccessLevelIndex } from "@shared/lib/accessControlLogic";
import { auth } from "@/auth";
import { canSessionManagePageCategoriesHub } from "@/lib/pageCategoriesHubAccess";
import { PagesBrowseShell } from "./PagesBrowseShell";

/**
 * Public pages catalog — published pages by domain for all visitors.
 *
 * Publishers see a **Manage catalog** link to `/pages/edit`.
 *
 * @returns Read-only catalog JSX.
 */
export default async function PagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  let viewerAccessLevelIndex: ReturnType<typeof inferAccessLevelIndex> | null = null;
  if (session?.user?.id) {
    const user = await AuthDomain.getUserById(session.user.id);
    if (user) {
      viewerAccessLevelIndex = inferAccessLevelIndex({
        role: user.role,
        accessLevelIndex: user.accessLevelIndex,
      });
    }
  }

  const [payload, showCatalogEditLink] = await Promise.all([
    PageCategoriesDomain.resolveHubPayload({ viewerAccessLevelIndex }),
    canSessionManagePageCategoriesHub(session),
  ]);

  return (
    <PagesBrowseShell
      sections={payload.sections}
      showCatalogEditLink={showCatalogEditLink}
    />
  );
}
