/**
 * @fileoverview Profile stats row — Stars, Tasks, Warnings stat cards.
 *
 * @module src/components/profile/ProfileStatsRow
 */

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
 * Horizontal row of stat cards matching Figma StatsRow.
 *
 * @param props - See {@link ProfileStatsRowProps}.
 * @returns Stats row JSX.
 */
export function ProfileStatsRow({ stats }: ProfileStatsRowProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="glass-panel flex min-w-[70px] flex-col gap-1 rounded-[var(--radius-md)] p-4"
        >
          <span className="text-[11px] text-[var(--color-text-secondary)]">{stat.label}</span>
          <span className="text-[22px] font-bold text-[var(--color-text-primary)]">
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export default ProfileStatsRow;
