/**
 * @fileoverview Publisher catalog editor — `/pages/edit`.
 *
 * @module src/app/pages/edit/page
 */

import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { auth } from "@/auth";
import {
  canSessionCreatePages,
  requirePageCategoriesHubEditor,
} from "@/lib/pageCategoriesHubAccess";
import { PageManagerShell, type PageManagerNotice } from "../PageManagerShell";

/**
 * Editable Page Manager — drag reorder, domain curation, and new-page FAB.
 *
 * @param props - Next.js search params for redirect notices.
 * @returns Publisher catalog editor JSX.
 */
export default async function PagesEditPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  await requirePageCategoriesHubEditor("/pages/edit");

  const session = await auth();
  const canCreatePages = await canSessionCreatePages(session);

  const [managerPayload, hubDoc, availableDomains, allDomainSegments] = await Promise.all([
    PageCategoriesDomain.resolveManagerPayload(),
    PageCategoriesDomain.loadOrSeed(),
    PageCategoriesDomain.listHubDomainCatalog(),
    PageCategoriesDomain.listAllCatalogDomains(),
  ]);

  const isCatalogAdmin = session?.user?.role === "Admin";

  const notice: PageManagerNotice | undefined =
    error === "reserved-slug" || error === "homepage-code-only" ? error : undefined;

  return (
    <PageManagerShell
      notice={notice}
      canCreatePages={canCreatePages}
      managerSections={managerPayload.sections}
      initialConfig={PageCategoriesDomain.toPublicConfig(hubDoc)}
      availableDomains={availableDomains}
      allDomainSegments={allDomainSegments}
      isCatalogAdmin={isCatalogAdmin}
    />
  );
}
