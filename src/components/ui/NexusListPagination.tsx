"use client";

/**
 * @fileoverview Reusable offset-pagination bar for admin and dashboard lists.
 *
 * Built on Shadcn {@link Pagination} primitives and {@link buildPaginationItems}.
 * Use with server APIs that return `page`, `limit`, `totalCount`, and `totalPages`.
 *
 * @module src/components/ui/NexusListPagination
 */

import React from "react";
import { buildPaginationItems } from "@shared/lib/listPaginationLogic";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

/** Props for {@link NexusListPagination}. */
export interface NexusListPaginationProps {
  /** Current 1-based page. */
  page: number;
  /** Total page count from the API. */
  totalPages: number;
  /** Called when the user selects another page. */
  onPageChange: (page: number) => void;
  /** Disables all controls while a list fetch is in flight. */
  disabled?: boolean;
  /** Optional summary line, e.g. "Showing 11–20 of 45". */
  summary?: string;
  className?: string;
}

/**
 * Offset-pagination control — previous/next plus compact page numbers.
 *
 * @param props - See {@link NexusListPaginationProps}.
 * @returns Pagination bar or null when only one page exists.
 */
export function NexusListPagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  summary,
  className,
}: NexusListPaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const items = buildPaginationItems(page, safeTotalPages);
  const canGoPrev = page > 1;
  const canGoNext = page < safeTotalPages;

  if (safeTotalPages <= 1 && !summary) {
    return null;
  }

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      {summary ? (
        <p className="text-xs text-muted-foreground">{summary}</p>
      ) : null}

      {safeTotalPages > 1 ? (
        <Pagination className="justify-center sm:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={disabled || !canGoPrev}
                onClick={() => canGoPrev && onPageChange(page - 1)}
              />
            </PaginationItem>

            {items.map((item, index) => {
              if (item === "ellipsis-start" || item === "ellipsis-end") {
                return (
                  <PaginationItem key={`${item}-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={item}>
                  <PaginationLink
                    isActive={item === page}
                    disabled={disabled}
                    onClick={() => onPageChange(item)}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                disabled={disabled || !canGoNext}
                onClick={() => canGoNext && onPageChange(page + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}
    </div>
  );
}
