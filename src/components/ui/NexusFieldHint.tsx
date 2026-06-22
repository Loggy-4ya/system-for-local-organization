"use client";

/**
 * @fileoverview Cross-surface field hint — info icon with hover tooltip (desktop) or tap popover (touch).
 *
 * Renders screen-reader-only hint text in the DOM for `aria-describedby` wiring. Visual copy appears
 * on hover/focus (fine pointer) or tap (coarse pointer / touch).
 *
 * @module src/components/ui/NexusFieldHint
 */

import { CircleHelp } from "lucide-react";
import { useId, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/** Props for {@link NexusFieldHint}. */
export interface NexusFieldHintProps {
  /** Hint body shown in tooltip/popover and exposed to assistive tech. */
  text: string;
  /** Accessible name for the info trigger (defaults to "Field help"). */
  label?: string;
  /** Optional stable id for the sr-only hint node (auto-generated when omitted). */
  hintId?: string;
  /** Visual density — `sm` for Puck sidebar rows, `md` for glass-panel forms. */
  size?: "sm" | "md";
  /** Extra classes on the trigger button. */
  className?: string;
}

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

/**
 * Subscribe to fine-pointer media query for tooltip vs popover mode.
 *
 * @param onStoreChange - Listener invoked when the query result changes.
 * @returns Unsubscribe function.
 */
function subscribeFinePointer(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const media = window.matchMedia(FINE_POINTER_QUERY);
  media.addEventListener("change", onStoreChange);
  return () => media.removeEventListener("change", onStoreChange);
}

/**
 * Read whether hover tooltips should be used instead of tap popovers.
 *
 * @returns True on desktop-like fine-pointer devices.
 */
function getFinePointerSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia(FINE_POINTER_QUERY).matches;
}

/** Client mount snapshot for tooltip/popover hydration. */
function getClientSnapshot(): boolean {
  return true;
}

/** Server snapshot — defer interactive hint chrome until client mount. */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Info icon that surfaces field helper copy without cluttering the settings panel.
 *
 * @param props - See {@link NexusFieldHintProps}.
 * @returns Hint trigger and sr-only description node.
 */
export function NexusFieldHint({
  text,
  label = "Field help",
  hintId: hintIdProp,
  size = "md",
  className,
}: NexusFieldHintProps) {
  const generatedId = useId();
  const hintId = hintIdProp ?? generatedId;
  const mounted = useSyncExternalStore(
    () => () => undefined,
    getClientSnapshot,
    getServerSnapshot,
  );
  const useTooltip = useSyncExternalStore(
    subscribeFinePointer,
    getFinePointerSnapshot,
    () => true,
  );

  const iconSize = size === "sm" ? 14 : 16;
  const triggerClassName = cn(
    "nexus-field-hint-trigger inline-flex shrink-0 items-center justify-center rounded-sm text-(--color-text-secondary) transition-colors hover:text-(--color-text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent-primary)/40",
    size === "sm" ? "size-5" : "size-6",
    className,
  );

  return (
    <>
      <span id={hintId} className="sr-only">
        {text}
      </span>
      {!mounted ? (
        <span className={triggerClassName} aria-hidden="true">
          <CircleHelp size={iconSize} strokeWidth={1.75} />
        </span>
      ) : useTooltip ? (
        <TooltipProvider delay={200} closeDelay={100}>
          <Tooltip>
            <TooltipTrigger
              type="button"
              className={triggerClassName}
              aria-label={label}
              delay={200}
            >
              <CircleHelp size={iconSize} strokeWidth={1.75} aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="top">{text}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <Popover modal="trap-focus">
          <PopoverTrigger type="button" className={triggerClassName} aria-label={label}>
            <CircleHelp size={iconSize} strokeWidth={1.75} aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent side="top">{text}</PopoverContent>
        </Popover>
      )}
    </>
  );
}

export default NexusFieldHint;
