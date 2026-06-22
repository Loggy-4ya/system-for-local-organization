"use client";

/**
 * @fileoverview Render layer for the News Catalog Puck block (Figma news hub layout).
 *
 * @module src/components/puck/blocks/news/NexusNewsCatalogRender
 */

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeMediaUrl } from "@shared/lib/safeMediaUrl";
import type {
  NewsCatalogHubSection,
  NewsCatalogPageCard,
} from "@shared/constants/pageCategoriesHub";
import { Button } from "@/components/ui/button";

/** Props for {@link NexusNewsCatalogRender}. */
export interface NexusNewsCatalogRenderProps {
  sections: NewsCatalogHubSection[];
  activeSectionId: string | null;
  onActiveSectionChange?: (sectionId: string) => void;
  emptyMessage?: string;
  /** When set, show a link to the Page Manager categories editor. */
  settingsHref?: string | null;
}

/**
 * Multi-image area for a catalog card.
 *
 * @param props - Image URLs and layout variant.
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
      <div className={cn("nexus-news-catalog__media", `nexus-news-catalog__media--${variant}`)}>
        <span className="nexus-news-catalog__media-placeholder">No image</span>
      </div>
    );
  }

  if (safeImages.length === 1) {
    return (
      <div className={cn("nexus-news-catalog__media", `nexus-news-catalog__media--${variant}`)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={safeImages[0]!} alt={title} className="nexus-news-catalog__media-img" />
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
          <img src={src} alt={`${title} image ${index + 1}`} className="nexus-news-catalog__media-img" />
        </div>
      ))}
    </div>
  );
}

/**
 * Large featured preview card (left column in hub layout).
 *
 * @param props - Card data.
 * @returns Featured card UI.
 */
function FeaturedCatalogCard({ page }: { page: NewsCatalogPageCard }) {
  return (
    <Link href={page.href} className="nexus-news-catalog__featured-link">
      <article className="nexus-news-catalog__featured glass-panel">
        <CatalogCardImages images={page.images} title={page.title} variant="featured" />
        <div className="nexus-news-catalog__featured-body">
          {page.authorDisplayName ? (
            <p className="nexus-news-catalog__eyebrow">{page.authorDisplayName}</p>
          ) : null}
          <h2 className="nexus-news-catalog__featured-title">{page.title}</h2>
          {page.description ? (
            <p className="nexus-news-catalog__featured-description">{page.description}</p>
          ) : null}
          <div className="nexus-news-catalog__featured-actions">
            <Button type="button" size="sm" className="nexus-news-catalog__cta pointer-events-none">
              View More
            </Button>
            {page.publishDate ? (
              <time className="nexus-news-catalog__featured-date">{page.publishDate}</time>
            ) : null}
          </div>
        </div>
      </article>
    </Link>
  );
}

/**
 * Compact tile card (right grid in hub layout).
 *
 * @param props - Card data.
 * @returns Tile card UI.
 */
function TileCatalogCard({ page }: { page: NewsCatalogPageCard }) {
  return (
    <Link href={page.href} className="nexus-news-catalog__tile-link">
      <article className="nexus-news-catalog__tile glass-panel">
        <CatalogCardImages images={page.images} title={page.title} variant="tile" />
        <div className="nexus-news-catalog__tile-body">
          <h3 className="nexus-news-catalog__tile-title">{page.title}</h3>
          {page.description ? (
            <p className="nexus-news-catalog__tile-description">{page.description}</p>
          ) : null}
          {page.publishDate ? (
            <time className="nexus-news-catalog__tile-date">{page.publishDate}</time>
          ) : null}
        </div>
      </article>
    </Link>
  );
}

/**
 * Render one hub section using its configured card layout.
 *
 * @param props - Section payload.
 * @returns Section grid UI.
 */
function CatalogSectionGrid({ section }: { section: NewsCatalogHubSection }) {
  if (section.pages.length === 0) {
    return (
      <p className="nexus-news-catalog__empty-section">No published pages in this category yet.</p>
    );
  }

  if (section.cardLayout === "featured-grid") {
    const [featured, ...rest] = section.pages;
    return (
      <div className="nexus-news-catalog__layout">
        <FeaturedCatalogCard page={featured} />
        {rest.length > 0 ? (
          <div className="nexus-news-catalog__tile-grid">
            {rest.map((page) => (
              <TileCatalogCard key={page.path} page={page} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="nexus-news-catalog__uniform-grid">
      {section.pages.map((page) => (
        <TileCatalogCard key={page.path} page={page} />
      ))}
    </div>
  );
}

/**
 * News catalog renderer — header-style category tabs + featured/tile grid.
 *
 * @param props - Hub payload and active tab state.
 * @returns Catalog UI.
 */
export function NexusNewsCatalogRender({
  sections,
  activeSectionId,
  onActiveSectionChange,
  emptyMessage = "No published pages are available in the catalog yet.",
  settingsHref = null,
}: NexusNewsCatalogRenderProps) {
  if (sections.length === 0) {
    return (
      <div className="nexus-news-catalog nexus-news-catalog--empty glass-panel">
        <p className="nexus-news-catalog__empty-message">{emptyMessage}</p>
        {settingsHref ? (
          <Link href={settingsHref} className="nexus-news-catalog__settings-link">
            Configure categories
          </Link>
        ) : null}
      </div>
    );
  }

  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;

  return (
    <div className="nexus-news-catalog">
      <nav className="nexus-news-catalog__nav glass-panel" aria-label="News categories">
        <ul className="nexus-news-catalog__nav-list">
          {sections.map((section) => {
            const isActive = section.id === activeSection?.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  className={cn(
                    "nexus-news-catalog__nav-item",
                    isActive && "nexus-news-catalog__nav-item--active",
                  )}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => onActiveSectionChange?.(section.id)}
                >
                  <span className="nexus-news-catalog__nav-label">{section.sectionLabel}</span>
                  {!isActive ? (
                    <ChevronDown
                      size={14}
                      strokeWidth={2.25}
                      className="nexus-news-catalog__nav-chevron"
                      aria-hidden="true"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {activeSection ? <CatalogSectionGrid section={activeSection} /> : null}
    </div>
  );
}

export default NexusNewsCatalogRender;
