"use client";

/**
 * @fileoverview Render layer for the News Catalog Puck block (Figma news hub layout).
 *
 * Catalog preview cards show publication images, title, date, categories, and description.
 * Image count and featured size are configured per page in Publication settings.
 *
 * @module src/components/puck/blocks/news/NexusNewsCatalogRender
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import type {
  NewsCatalogHubSection,
  NewsCatalogPageCard,
} from "@shared/constants/pageCategoriesHub";
import { buttonVariants } from "@/components/ui/button";
import { PageCatalogSectionView } from "@/components/pages/PageCatalogSectionView";
import { formatPageDomainLabel } from "@shared/lib/pagePathLogic";

/** Props for {@link NexusNewsCatalogRender}. */
export interface NexusNewsCatalogRenderProps {
  sections: NewsCatalogHubSection[];
  /** @deprecated Tab mode removed — all sections render in one scrollable page. */
  activeSectionId?: string | null;
  /** @deprecated Tab mode removed. */
  onActiveSectionChange?: (sectionId: string) => void;
  emptyMessage?: string;
  /** When set, show a link to the Page Manager. */
  settingsHref?: string | null;
  /** When true, use the unified stacked domain layout (default). */
  stacked?: boolean;
  /** When true, public sections auto-advance the carousel when eligible. */
  autoplayCarousel?: boolean;
}

/**
 * Multi-image area for a catalog card (featured hero layout in embedded blocks).
 *
 * @param props - Image URLs, title fallback, and layout variant.
 * @returns Image strip UI.
 */
function CatalogCardImages({
  images,
  title,
  variant,
}: {
  images: string[];
  title: string;
  variant: "featured" | "tile";
}) {
  const safeImages = images.map((src) => sanitizeMediaUrl(src)).filter(Boolean);

  if (safeImages.length === 0) {
    return (
      <div
        className={cn(
          "nexus-news-catalog__media nexus-news-catalog__media--placeholder",
          `nexus-news-catalog__media--${variant}`,
        )}
      >
        <span className="nexus-news-catalog__media-fallback-title">{title}</span>
      </div>
    );
  }

  if (safeImages.length === 1) {
    return (
      <div className={cn("nexus-news-catalog__media", `nexus-news-catalog__media--${variant}`)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safeImages[0]!} alt="" className="nexus-news-catalog__media-img" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "nexus-news-catalog__media nexus-news-catalog__media--multi",
        `nexus-news-catalog__media--${variant}`,
        safeImages.length >= 3 && "nexus-news-catalog__media--triple",
      )}
    >
      {safeImages.map((src, index) => (
        <div key={`${src}-${index}`} className="nexus-news-catalog__media-cell">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="nexus-news-catalog__media-img" />
        </div>
      ))}
    </div>
  );
}

/**
 * Legacy featured-layout catalog card for embedded Puck blocks.
 *
 * @param props - Card data and size variant.
 * @returns Visual catalog card UI.
 */
function VisualCatalogCard({
  page,
  variant,
}: {
  page: NewsCatalogPageCard;
  variant: "featured" | "tile";
}) {
  const hasImages = page.images.some((src) => sanitizeMediaUrl(src));
  const TitleTag = variant === "featured" ? "h2" : "h3";
  const description = page.description.trim();

  return (
    <Link
      href={page.href}
      className={cn(
        "nexus-news-catalog__card-link",
        variant === "featured"
          ? "nexus-news-catalog__featured-link"
          : "nexus-news-catalog__tile-link",
      )}
      aria-label={description ? `${page.title}. ${description}` : page.title}
    >
      <article
        className={cn(
          "nexus-news-catalog__card glass-panel",
          variant === "featured" ? "nexus-news-catalog__featured" : "nexus-news-catalog__tile",
        )}
      >
        <div
          className={cn(
            "nexus-news-catalog__card-media-wrap",
            !hasImages && "nexus-news-catalog__card-media-wrap--no-image",
          )}
        >
          <CatalogCardImages images={page.images} title={page.title} variant={variant} />
          <div className="nexus-news-catalog__card-caption">
            <TitleTag
              className={
                variant === "featured"
                  ? "nexus-news-catalog__featured-title"
                  : "nexus-news-catalog__tile-title"
              }
            >
              {page.title}
            </TitleTag>
            {page.publishDate ? (
              <time
                className={
                  variant === "featured"
                    ? "nexus-news-catalog__featured-date"
                    : "nexus-news-catalog__tile-date"
                }
                dateTime={page.publishDate}
              >
                {page.publishDate}
              </time>
            ) : null}
          </div>
        </div>
        {description ? (
          <div className="nexus-news-catalog__card-body">
            <p className="nexus-news-catalog__card-description">{description}</p>
          </div>
        ) : null}
      </article>
    </Link>
  );
}

/**
 * Resolve whether a section uses the featured hero layout (embedded block only).
 *
 * @param pages - Ordered section cards.
 * @returns Featured hero page and remaining tiles, or null for uniform grid.
 */
function resolveFeaturedHeroPage(
  pages: readonly NewsCatalogPageCard[],
): NewsCatalogPageCard | null {
  if (pages.length < 3) return null;
  return pages.find((page) => page.cardVariant === "featured") ?? null;
}

/**
 * Render one hub section using per-page preview settings (featured hero layout).
 *
 * @param props - Section payload.
 * @returns Section grid UI.
 */
function CatalogSectionFeaturedGrid({ section }: { section: NewsCatalogHubSection }) {
  if (section.pages.length === 0) {
    return (
      <div className="nexus-news-catalog__empty-section glass-panel" aria-hidden="true">
        <span className="nexus-news-catalog__empty-section-icon" />
      </div>
    );
  }

  const featuredHero = resolveFeaturedHeroPage(section.pages);

  if (!featuredHero) {
    return (
      <div className="nexus-news-catalog__uniform-grid">
        {section.pages.map((page) => (
          <VisualCatalogCard key={page.path} page={page} variant="tile" />
        ))}
      </div>
    );
  }

  const tilePages = section.pages.filter((page) => page.path !== featuredHero.path);

  return (
    <div className="nexus-news-catalog__layout">
      <VisualCatalogCard page={featuredHero} variant="featured" />
      <div className="nexus-news-catalog__tile-grid">
        {tilePages.map((page) => (
          <VisualCatalogCard key={page.path} page={page} variant="tile" />
        ))}
      </div>
    </div>
  );
}

/**
 * Stacked domain section for `/pages` and the public catalog.
 *
 * @param props - Section payload.
 * @returns Stacked section UI.
 */
function StackedCatalogSection({
  section,
  autoplay = false,
}: {
  section: NewsCatalogHubSection;
  autoplay?: boolean;
}) {
  return (
    <section
      className="nexus-news-catalog__stacked-section glass-panel"
      aria-labelledby={`catalog-${section.id}`}
    >
      <header className="nexus-news-catalog__stacked-header">
        <div className="nexus-news-catalog__stacked-heading">
          <h2 id={`catalog-${section.id}`} className="nexus-news-catalog__stacked-title">
            {section.sectionLabel}
          </h2>
          <span className="nexus-news-catalog__stacked-count" aria-label={`${section.pages.length} pages`}>
            {section.pages.length}
          </span>
        </div>
        <p className="nexus-news-catalog__stacked-path">{formatPageDomainLabel(section.domain)}</p>
      </header>
      <PageCatalogSectionView pages={section.pages} autoplay={autoplay} />
    </section>
  );
}

/**
 * News catalog renderer — stacked domain sections + preview cards.
 *
 * @param props - Hub payload and optional settings link.
 * @returns Catalog UI.
 */
export function NexusNewsCatalogRender({
  sections,
  emptyMessage = "Nothing published yet.",
  settingsHref = null,
  stacked = true,
  autoplayCarousel = false,
}: NexusNewsCatalogRenderProps) {
  if (sections.length === 0) {
    return (
      <div className="nexus-news-catalog nexus-news-catalog--empty glass-panel">
        {settingsHref ? (
          <>
            <p className="nexus-news-catalog__empty-message">{emptyMessage}</p>
            <Link
              href={settingsHref}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Open Page Manager
            </Link>
          </>
        ) : (
          <div className="nexus-news-catalog__empty-section-icon" aria-hidden="true" />
        )}
      </div>
    );
  }

  if (!stacked) {
    return (
      <div className="nexus-news-catalog">
        {sections.map((section) => (
          <div key={section.id}>
            <CatalogSectionFeaturedGrid section={section} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="nexus-news-catalog nexus-news-catalog--stacked">
      {settingsHref ? (
        <div className="nexus-news-catalog__settings-row">
          <Link
            href={settingsHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
          >
            Open Page Manager
          </Link>
        </div>
      ) : null}
      <div className="nexus-news-catalog__stacked-list">
        {sections.map((section) => (
          <StackedCatalogSection key={section.id} section={section} autoplay={autoplayCarousel} />
        ))}
      </div>
    </div>
  );
}

export default NexusNewsCatalogRender;
