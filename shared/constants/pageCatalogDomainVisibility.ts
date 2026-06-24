/**
 * @fileoverview Catalog domain visibility modes for `/pages` hub sections.
 *
 * @module shared/constants/pageCatalogDomainVisibility
 */

import type { AccessLevelIndex } from "./accessControl";

/** Who may see a domain section on the public pages catalog. */
export type PageCatalogDomainVisibility = "public" | "hidden" | "level";

/** Hub section visibility fields persisted in `page_categories_settings`. */
export interface PageCatalogDomainVisibilityFields {
  /** Catalog audience mode — defaults to `public`. */
  catalogVisibility?: PageCatalogDomainVisibility;
  /**
   * When {@link catalogVisibility} is `level`, users with
   * `accessLevelIndex <= catalogVisibleThroughLevel` may view the section.
   */
  catalogVisibleThroughLevel?: AccessLevelIndex;
}
