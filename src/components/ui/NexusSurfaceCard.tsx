/**
 * @fileoverview Reusable glass-panel surface card — Puck-style layout with Tailwind only.
 *
 * Mirrors the visual language of Puck blocks such as {@link NexusNewsCard} and
 * {@link NexusStatCard}: opaque `glass-panel`, optional media/icon header, title,
 * description, and hover lift. Safe to use on static pages, admin hubs, and future
 * non-Puck surfaces.
 *
 * @module src/components/ui/NexusSurfaceCard
 */

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Visual density preset for {@link NexusSurfaceCard}. */
export type NexusSurfaceCardSize = "default" | "compact";

/** Props for {@link NexusSurfaceCard}. */
export interface NexusSurfaceCardProps {
  /** Primary heading. */
  title: string;
  /** Supporting copy under the title. */
  description: string;
  /** Optional navigation target — renders the card as a Next.js link. */
  href?: string;
  /** Lucide icon rendered in the header band. */
  icon?: LucideIcon;
  /** Optional emoji fallback when no Lucide icon is supplied. */
  iconEmoji?: string;
  /** Small uppercase label above the title (e.g. category or status). */
  eyebrow?: string;
  /** Subtle lift + shadow on hover. Defaults to `true`. */
  hoverLift?: boolean;
  /** Disables navigation and dims the card. */
  disabled?: boolean;
  /** Layout density — `compact` uses a shorter header band. */
  size?: NexusSurfaceCardSize;
  /** Extra classes on the outer card element. */
  className?: string;
}

/**
 * Glass-panel card with optional link wrapper — shared across admin hubs and future UI.
 *
 * @param props - See {@link NexusSurfaceCardProps}.
 * @returns Card surface JSX.
 */
export function NexusSurfaceCard({
  title,
  description,
  href,
  icon: Icon,
  iconEmoji,
  eyebrow,
  hoverLift = true,
  disabled = false,
  size = "default",
  className,
}: NexusSurfaceCardProps) {
  const isInteractive = Boolean(href) && !disabled;
  const headerHeight = size === "compact" ? "h-24" : "h-32";

  const cardElement = (
    <Card
      className={cn(
        "glass-panel group/nexus-surface-card w-full overflow-hidden border-border bg-card py-0 shadow-xs transition-all duration-200",
        hoverLift && isInteractive && "hover:-translate-y-1 hover:shadow-md",
        disabled && "cursor-not-allowed opacity-60",
        isInteractive && "hover:border-primary/30",
        className,
      )}
      style={{ borderRadius: "var(--radius-lg)" }}
    >
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden bg-secondary/70",
          headerHeight,
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-linear-to-br from-primary/15 via-transparent to-transparent"
        />
        {Icon ? (
          <Icon
            className="relative z-1 size-10 text-primary opacity-90 transition-transform duration-200 group-hover/nexus-surface-card:scale-105"
            strokeWidth={1.75}
          />
        ) : iconEmoji ? (
          <span
            className="relative z-1 text-4xl leading-none select-none"
            aria-hidden="true"
          >
            {iconEmoji}
          </span>
        ) : null}
      </div>

      <CardHeader className="gap-2 px-5 pt-4 pb-0 text-left">
        {eyebrow ? (
          <p className="m-0 text-[11px] font-medium tracking-wide text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-[15px] leading-snug text-foreground">{title}</CardTitle>
          {isInteractive ? (
            <ArrowUpRight
              size={16}
              className="mt-0.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover/nexus-surface-card:translate-x-0.5 group-hover/nexus-surface-card:-translate-y-0.5 group-hover/nexus-surface-card:opacity-100"
              aria-hidden="true"
            />
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="px-5 pt-2 pb-5 text-left">
        <CardDescription className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );

  if (isInteractive && href) {
    return (
      <Link
        href={href}
        className="block rounded-lg no-underline outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {cardElement}
      </Link>
    );
  }

  return cardElement;
}

export default NexusSurfaceCard;
