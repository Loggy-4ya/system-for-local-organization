/**
 * @fileoverview Publisher-only news catalog curation — `/pages/categories/edit`.
 *
 * @module src/app/pages/categories/edit/page
 */

import { PageCategoriesDomain } from "@shared/domains/PageCategoriesDomain";
import { requirePageCategoriesHubEditor } from "@/lib/pageCategoriesHubAccess";
import { PageCategoriesHubEditor } from "../PageCategoriesHubEditor";

/**
 * News catalog curation editor for page publishers.
 *
 * @returns Server-rendered category hub editor.
 */
export default async function PageCategoriesHubEditPage() {
  await requirePageCategoriesHubEditor("/pages/categories/edit");

  const [doc, availableDomains] = await Promise.all([
    PageCategoriesDomain.loadOrSeed(),
    PageCategoriesDomain.listHubDomainCatalog(),
  ]);

  return (
    <PageCategoriesHubEditor
      initialConfig={PageCategoriesDomain.toPublicConfig(doc)}
      initialAvailableDomains={availableDomains}
    />
  );
}
