/**
 * @fileoverview Centered full-area loading placeholder over the layout InfiniteGrid.
 *
 * Does not import InfiniteGrid — the root layout keeps `#nexus-bg` mounted while
 * this replaces route `{children}` during Suspense or dynamic import fallbacks.
 *
 * @module src/components/ui/SiteLoader
 */

import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

/** Props for {@link SiteLoader}. */
export interface SiteLoaderProps {
  /** Optional status text below the spinner. Pass `null` to hide the label. */
  label?: string | null;
  /** Extra class names on the outer flex container. */
  className?: string;
}

/**
 * Centered site loading state — spinner + optional label on the transparent page stack.
 *
 * @param props - See {@link SiteLoaderProps}.
 * @returns Site loader JSX.
 */
export function SiteLoader({ label = "Loading…", className }: SiteLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-6",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <Spinner
        className="size-24 text-muted-foreground"
        strokeWidth={2.25}
      />
      {label ? (
        <p className="text-xl font-semibold tracking-tight text-muted-foreground">
          {label}
        </p>
      ) : null}
    </div>
  );
}

export default SiteLoader;
