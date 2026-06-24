"use client";

/**
 * @fileoverview Catalog preview card for Page Manager and public page catalogs.
 *
 * @module src/components/pages/PageCatalogCard
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import type { NewsCatalogPageCard } from "@shared/constants/pageCategoriesHub";
import { PageCategoryBadge } from "@/components/pages/PageCategoryBadge";
import { EditorDragHandle } from "@/components/global-layout/EditorDragHandle";

/** Extended card props for the Page Manager surface. */
export interface PageCatalogCardProps {
  /** Resolved catalog card data. */
  page: NewsCatalogPageCard & { published?: boolean };
  /** When true, show publisher drag handle and action links. */
  editable?: boolean;
  /** Drag-handle pointer props from the sortable context. */
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  /** Extra class names for the outer article. */
  className?: string;
}

/**
 * Single-image area for a catalog card.
 *
 * @param props - Image URL and title fallback.
 * @returns Image or placeholder markup.
 */
function CatalogCardImage({ src, title }: { src: string | null; title: string }) {
  if (!src) {
    return (
      <div className="page-catalog-card__media page-catalog-card__media--placeholder" aria-hidden="true">
        <span className="page-catalog-card__media-fallback">{title}</span>
      </div>
    );
  }

  return (
    <div className="page-catalog-card__media">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="page-catalog-card__media-img" />
    </div>
  );
}

/**
 * Visual page catalog card with category badges and expandable description.
 *
 * @param props - Card data and optional publisher affordances.
 * @returns Catalog card markup.
 */
export function PageCatalogCard({
  page,
  editable = false,
  dragHandleProps,
  className,
}: PageCatalogCardProps) {
  const primaryImage = page.images.map((src) => sanitizeMediaUrl(src)).find(Boolean) ?? null;
  const description = page.description.trim();
  const visibleCategories = page.categories.slice(0, 3);
  const isDraft = page.published === false;

  const cardBody = (
    <article
      className={cn(
        "page-catalog-card glass-panel",
        editable && "page-catalog-card--editable",
        className,
      )}
    >
      <div className="page-catalog-card__media-shell">
        <CatalogCardImage src={primaryImage} title={page.title} />
        {page.publishDate ? (
          <time
            className="page-catalog-card__media-date"
            dateTime={page.publishDateTime || page.publishDate}
            aria-label={`Published ${page.publishDate}`}
          >
            {page.publishDate}
          </time>
        ) : null}
      </div>

      <div className="page-catalog-card__body">
        {editable && dragHandleProps ? (
          <div className="page-catalog-card__editor-toolbar">
            <EditorDragHandle {...dragHandleProps} label="Drag to reorder page" />
          </div>
        ) : null}

        <div className="page-catalog-card__meta">
          <div className="page-catalog-card__title-row">
            <h3 className="page-catalog-card__title">{page.title}</h3>
            {editable ? (
              <span
                className={cn(
                  "page-catalog-card__status",
                  isDraft ? "page-catalog-card__status--draft" : "page-catalog-card__status--live",
                )}
                title={isDraft ? "Draft" : "Published"}
                aria-label={isDraft ? "Draft" : "Published"}
              />
            ) : null}
          </div>

          {visibleCategories.length > 0 ? (
            <ul className="page-catalog-card__categories" aria-label="Categories">
              {visibleCategories.map((category) => (
                <li key={category}>
                  <PageCategoryBadge label={category} className="page-catalog-card__category" />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {description ? (
          <div className="page-catalog-card__description-wrap">
            <p className="page-catalog-card__description">{description}</p>
          </div>
        ) : null}

        {editable ? (
          <div className="page-catalog-card__actions">
            <Link href={`${page.path}/edit`} className="page-catalog-card__action page-catalog-card__action--primary">
              Edit
            </Link>
            <Link href={page.path} className="page-catalog-card__action">
              View
            </Link>
          </div>
        ) : null}
      </div>
    </article>
  );

  if (editable) {
    return cardBody;
  }

  return (
    <Link href={page.href} className="page-catalog-card__link" aria-label={page.title}>
      {cardBody}
    </Link>
  );
}

export default PageCatalogCard;
