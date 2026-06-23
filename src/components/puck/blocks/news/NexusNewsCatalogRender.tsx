"use client";

/**
 * @fileoverview Render layer for the News Catalog Puck block (Figma news hub layout).
 *
 * Public catalog cards are image-first: titles sit on the preview media so visitors
 * recognize pages from content, not long descriptions.
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
import { buttonVariants } from "@/components/ui/button";

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
 * Image-led preview card — title overlays the media; no description or CTA chrome.
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

  return (
    <Link
      href={page.href}
      className={cn(
        "nexus-news-catalog__card-link",
        variant === "featured"
          ? "nexus-news-catalog__featured-link"
          : "nexus-news-catalog__tile-link",
      )}
      aria-label={page.title}
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
              >
                {page.publishDate}
              </time>
            ) : null}
          </div>
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
      <div className="nexus-news-catalog__empty-section glass-panel" aria-hidden="true">
        <span className="nexus-news-catalog__empty-section-icon" />
      </div>
    );
  }

  if (section.pages.length <= 2 || section.cardLayout === "uniform-grid") {
    return (
      <div className="nexus-news-catalog__uniform-grid">
        {section.pages.map((page) => (
          <VisualCatalogCard key={page.path} page={page} variant="tile" />
        ))}
      </div>
    );
  }

  const [featured, ...rest] = section.pages;
  return (
    <div className="nexus-news-catalog__layout">
      <VisualCatalogCard page={featured} variant="featured" />
      <div className="nexus-news-catalog__tile-grid">
        {rest.map((page) => (
          <VisualCatalogCard key={page.path} page={page} variant="tile" />
        ))}
      </div>
    </div>
  );
}

/**
 * News catalog renderer — category tabs + image-first preview grid.
 *
 * @param props - Hub payload and active tab state.
 * @returns Catalog UI.
 */
export function NexusNewsCatalogRender({
  sections,
  activeSectionId,
  onActiveSectionChange,
  emptyMessage = "Nothing published yet.",
  settingsHref = null,
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
              Configure catalog
            </Link>
          </>
        ) : (
          <div className="nexus-news-catalog__empty-section-icon" aria-hidden="true" />
        )}
      </div>
    );
  }

  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0] ?? null;

  return (
    <div className="nexus-news-catalog">
      <div className="nexus-news-catalog__nav glass-panel">
        <nav aria-label="Page categories">
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
        {settingsHref ? (
          <Link
            href={settingsHref}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}
          >
            Configure catalog
          </Link>
        ) : null}
      </div>

      {activeSection ? <CatalogSectionGrid section={activeSection} /> : null}
    </div>
  );
}

export default NexusNewsCatalogRender;
