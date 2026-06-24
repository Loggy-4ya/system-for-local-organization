"use client";

/**
 * @fileoverview Visibility select for catalog domain sections on `/pages/edit`.
 *
 * @module src/components/pages/PageCatalogDomainVisibilityField
 */

import type { PageCatalogDomainVisibilityFields } from "@shared/constants/pageCatalogDomainVisibility";
import {
  buildPageCatalogVisibilitySelectOptions,
  decodePageCatalogVisibilitySelectValue,
  encodePageCatalogVisibilitySelectValue,
} from "@shared/lib/pageCatalogDomainVisibilityLogic";
import { PageCatalogSelect } from "@/components/pages/PageCatalogSelect";

/** Props for {@link PageCatalogDomainVisibilityField}. */
export interface PageCatalogDomainVisibilityFieldProps {
  value: PageCatalogDomainVisibilityFields;
  onChange: (next: Required<PageCatalogDomainVisibilityFields>) => void;
  disabled?: boolean;
}

const VISIBILITY_OPTIONS = buildPageCatalogVisibilitySelectOptions();

/**
 * Compact audience picker for a catalog domain section.
 *
 * @param props - Current visibility and change handler.
 * @returns Visibility select UI.
 */
export function PageCatalogDomainVisibilityField({
  value,
  onChange,
  disabled = false,
}: PageCatalogDomainVisibilityFieldProps) {
  return (
    <div className="page-catalog-visibility-field">
      <span className="page-catalog-visibility-field__label">Audience</span>
      <PageCatalogSelect
        aria-label="Catalog audience"
        value={encodePageCatalogVisibilitySelectValue(value)}
        options={VISIBILITY_OPTIONS}
        disabled={disabled}
        triggerClassName="page-catalog-visibility-field__trigger"
        onValueChange={(next) => onChange(decodePageCatalogVisibilitySelectValue(next))}
      />
    </div>
  );
}

export default PageCatalogDomainVisibilityField;
