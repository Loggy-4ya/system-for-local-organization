/**
 * @fileoverview Profile stats row — Stars, Tasks, Warnings stat cards.
 *
 * @module src/components/profile/ProfileStatsRow
 */

import { AlertTriangle, CheckSquare, Sparkles, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Single stat card descriptor. */
export interface StatItem {
  label: string;
  value: string | number;
}

/** Props for {@link ProfileStatsRow}. */
export interface ProfileStatsRowProps {
  stats: StatItem[];
}

/**
 * Resolve icon and accent styling for a profile stat label.
 *
 * @param label - Stat card label.
 * @returns Icon component and accent class token.
 */
function resolveStatPresentation(label: string): { icon: LucideIcon; accentClass: string } {
  const normalized = label.toLowerCase();
  if (normalized.includes("star")) {
    return { icon: Sparkles, accentClass: "text-[var(--color-accent-user)]" };
  }
  if (normalized.includes("task")) {
    return { icon: CheckSquare, accentClass: "text-[var(--color-accent-user)]" };
  }
  if (normalized.includes("warn")) {
    return { icon: AlertTriangle, accentClass: "text-[var(--color-warning)]" };
  }
  return { icon: TrendingUp, accentClass: "text-[var(--color-success)]" };
}

/**
 * Horizontal row of stat cards with icons and accent colors.
 *
 * @param props - See {@link ProfileStatsRowProps}.
 * @returns Stats row JSX.
 */
export function ProfileStatsRow({ stats }: ProfileStatsRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const { icon: Icon, accentClass } = resolveStatPresentation(stat.label);
        return (
          <div
            key={stat.label}
            className="glass-panel flex min-w-[88px] flex-col gap-2 rounded-[var(--radius-md)] p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                {stat.label}
              </span>
              <Icon className={cnIcon(accentClass)} aria-hidden="true" />
            </div>
            <span className="text-[24px] font-bold leading-none text-[var(--color-text-primary)]">
              {stat.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Compose icon utility classes for stat cards.
 *
 * @param accentClass - Accent color token.
 * @returns Combined class string.
 */
function cnIcon(accentClass: string): string {
  return `size-4 shrink-0 ${accentClass}`;
}

export default ProfileStatsRow;
