/**
 * @fileoverview Public page categories catalog — `/pages/categories`.
 *
 * @module src/app/pages/categories/page
 */

import { auth } from "@/auth";
import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { canSessionManagePageCategoriesHub } from "@/lib/pageCategoriesHubAccess";
import { PageCategoriesCatalogShell } from "./PageCategoriesCatalogShell";

/**
 * Public catalog of published Puck pages grouped by path domain.
 *
 * @returns Server-rendered browse page for all visitors.
 */
export default async function PageCategoriesCatalogPage() {
  const [payload, session] = await Promise.all([
    PageCategoriesDomain.resolveHubPayload(),
    auth(),
  ]);
  const showEditLink = await canSessionManagePageCategoriesHub(session);

  return <PageCategoriesCatalogShell payload={payload} showEditLink={showEditLink} />;
}
