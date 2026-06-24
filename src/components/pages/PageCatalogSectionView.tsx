"use client";

/**
 * @fileoverview Section body for Page Manager catalogs — grid, pagination, or auto-carousel.
 *
 * @module src/components/pages/PageCatalogSectionView
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NewsCatalogPageCard } from "@shared/constants/pageCategoriesHub";
import {
  PAGE_CATALOG_CAROUSEL_AUTOPLAY_MS,
  PAGE_CATALOG_CAROUSEL_BREAKPOINTS,
  PAGE_CATALOG_GRID_PAGE_SIZE,
} from "@shared/constants/pageCatalogDisplay";
import {
  clampPageCatalogCarouselPage,
  paginateCatalogPages,
  resolvePageCatalogCarouselPageCount,
  resolvePageCatalogGridPageCount,
  resolvePageCatalogVisibleCardCount,
  shouldUsePageCatalogCarousel,
} from "@shared/lib/pageCatalogDisplayLogic";
import { PageCatalogCard } from "@/components/pages/PageCatalogCard";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link PageCatalogSectionView}. */
export interface PageCatalogSectionViewProps {
  /** Ordered cards for the section. */
  pages: NewsCatalogPageCard[];
  /** Publisher surface — static grid only (drag reorder stays intact). */
  editable?: boolean;
  /** Public browse — enables autoplay when carousel mode is active. */
  autoplay?: boolean;
  /** Extra class on the outer layout wrapper. */
  className?: string;
}

/**
 * Track viewport width for responsive carousel pagination math.
 *
 * @returns Current inner width (falls back to desktop tier during SSR).
 */
function useCatalogViewportWidth(): number {
  const [width, setWidth] = useState(
    typeof window === "undefined"
      ? PAGE_CATALOG_CAROUSEL_BREAKPOINTS.desktop
      : window.innerWidth,
  );

  useEffect(() => {
    const sync = () => setWidth(window.innerWidth);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  return width;
}

/**
 * Auto-advancing carousel for public catalog sections with enough pages.
 *
 * @param props - Section cards and autoplay flag.
 * @returns Carousel markup or null.
 */
function PageCatalogCarousel({
  pages,
  autoplay = false,
}: {
  pages: NewsCatalogPageCard[];
  autoplay?: boolean;
}) {
  const viewportWidth = useCatalogViewportWidth();
  const visibleCount = resolvePageCatalogVisibleCardCount(viewportWidth);
  const pageCount = resolvePageCatalogCarouselPageCount(pages.length, visibleCount);
  const [activePage, setActivePage] = useState(0);
  const [paused, setPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: pageCount > 1,
    slidesToScroll: visibleCount,
    containScroll: "trimSnaps",
  });

  const syncActivePage = useCallback(() => {
    if (!emblaApi) return;
    const snap = emblaApi.selectedScrollSnap();
    const derived = Math.floor(snap / Math.max(1, visibleCount));
    setActivePage(clampPageCatalogCarouselPage(derived, pageCount));
  }, [emblaApi, pageCount, visibleCount]);

  useEffect(() => {
    if (!emblaApi) return;
    syncActivePage();
    emblaApi.on("select", syncActivePage);
    emblaApi.on("reInit", syncActivePage);
    return () => {
      emblaApi.off("select", syncActivePage);
      emblaApi.off("reInit", syncActivePage);
    };
  }, [emblaApi, syncActivePage]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, pages.length, visibleCount]);

  useEffect(() => {
    if (!autoplay || paused || pageCount <= 1 || !emblaApi) return;

    const timer = window.setInterval(() => {
      if (emblaApi.canScrollNext()) {
        emblaApi.scrollNext();
        return;
      }
      emblaApi.scrollTo(0);
    }, PAGE_CATALOG_CAROUSEL_AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [autoplay, emblaApi, pageCount, paused]);

  const scrollToPage = useCallback(
    (pageIndex: number) => {
      if (!emblaApi) return;
      const target = clampPageCatalogCarouselPage(pageIndex, pageCount) * visibleCount;
      emblaApi.scrollTo(target);
    },
    [emblaApi, pageCount, visibleCount],
  );

  return (
    <div
      className="page-catalog-section__carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="page-catalog-section__carousel-viewport" ref={emblaRef}>
        <div className="page-catalog-section__carousel-track">
          {pages.map((page) => (
            <div key={page.path} className="page-catalog-section__carousel-slide">
              <PageCatalogCard page={page} />
            </div>
          ))}
        </div>
      </div>

      {pageCount > 1 ? (
        <div className="page-catalog-section__carousel-controls">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="page-catalog-section__carousel-arrow"
            aria-label="Previous pages"
            onClick={() => emblaApi?.scrollPrev()}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </Button>

          <div className="page-catalog-section__carousel-dots" role="tablist" aria-label="Catalog pages">
            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index}
                type="button"
                role="tab"
                aria-selected={activePage === index}
                aria-label={`Show catalog page ${index + 1}`}
                className={cn(
                  "page-catalog-section__carousel-dot",
                  activePage === index && "page-catalog-section__carousel-dot--active",
                )}
                onClick={() => scrollToPage(index)}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="page-catalog-section__carousel-arrow"
            aria-label="Next pages"
            onClick={() => emblaApi?.scrollNext()}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders catalog cards in grid, paginated grid, or auto-carousel layout.
 *
 * @param props - Section cards and surface flags.
 * @returns Section body UI.
 */
export function PageCatalogSectionView({
  pages,
  editable = false,
  autoplay = false,
  className,
}: PageCatalogSectionViewProps) {
  const [gridPage, setGridPage] = useState(1);
  const useCarousel = !editable && shouldUsePageCatalogCarousel(pages.length);
  const gridPageCount = resolvePageCatalogGridPageCount(pages.length, PAGE_CATALOG_GRID_PAGE_SIZE);
  const needsGridPagination = !useCarousel && pages.length > PAGE_CATALOG_GRID_PAGE_SIZE;

  const visiblePages = useMemo(() => {
    if (useCarousel) return pages;
    if (!needsGridPagination) return pages;
    return paginateCatalogPages(pages, gridPage, PAGE_CATALOG_GRID_PAGE_SIZE);
  }, [gridPage, needsGridPagination, pages, useCarousel]);

  useEffect(() => {
    if (gridPage > gridPageCount) {
      setGridPage(gridPageCount);
    }
  }, [gridPage, gridPageCount]);

  if (pages.length === 0) {
    return (
      <div className={cn("page-catalog-section__empty", className)} aria-hidden="true">
        <span className="page-catalog-section__empty-icon" />
      </div>
    );
  }

  if (useCarousel) {
    return (
      <div className={cn("page-catalog-section__body", className)}>
        <PageCatalogCarousel pages={pages} autoplay={autoplay} />
      </div>
    );
  }

  return (
    <div className={cn("page-catalog-section__body", className)}>
      <div className="page-manager-catalog__grid">
        {visiblePages.map((page) => (
          <PageCatalogCard key={page.path} page={page} editable={editable} />
        ))}
      </div>

      {needsGridPagination ? (
        <NexusListPagination
          className="page-catalog-section__pagination"
          page={gridPage}
          totalPages={gridPageCount}
          onPageChange={setGridPage}
          summary={`Showing ${visiblePages.length} of ${pages.length} pages`}
        />
      ) : null}
    </div>
  );
}

export default PageCatalogSectionView;
