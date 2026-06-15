/**
 * @fileoverview Shadcn loading spinner — animated lucide icon for inline and page-level states.
 *
 * @module src/components/ui/spinner
 */

import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Accessible spinning loader icon sized via Tailwind `size-*` utilities.
 *
 * @param props - Standard SVG props forwarded to the lucide icon.
 * @returns Spinner SVG element.
 */
function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
