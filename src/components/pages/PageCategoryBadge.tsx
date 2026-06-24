/**
 * @fileoverview Page category badge — deterministic accent color per label.
 *
 * @module src/components/pages/PageCategoryBadge
 */

import { pageCategoryBadgeClassName } from "@shared/lib/pageCategoryLogic";
import { cn } from "@/lib/utils";

/** Props for {@link PageCategoryBadge}. */
export interface PageCategoryBadgeProps {
  /** Category label (color derived from normalised hash). */
  label: string;
  /** Optional extra class names. */
  className?: string;
  /** Visible badge content; defaults to {@link label}. */
  children?: React.ReactNode;
}

/**
 * Render a page category chip with stable label-based accent coloring.
 *
 * @param props - See {@link PageCategoryBadgeProps}.
 * @returns Badge span element.
 */
export function PageCategoryBadge({ label, className, children }: PageCategoryBadgeProps) {
  return (
    <span className={cn(pageCategoryBadgeClassName(label), className)}>
      {children ?? label}
    </span>
  );
}

export default PageCategoryBadge;
