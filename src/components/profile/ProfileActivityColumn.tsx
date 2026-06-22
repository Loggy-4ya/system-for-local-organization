/**
 * @fileoverview Council activity sidebar column for profile dashboard.
 *
 * @module src/components/profile/ProfileActivityColumn
 */

const ACTIVITY_ITEMS = [
  "Voted: Spring budget — Approved",
  "Proposed: Robotics open day — Pending",
  "Applied: Student government — Review",
  "Acknowledged: Safety briefing — Today",
];

/**
 * Right sidebar with council activity and performance placeholders.
 *
 * @returns Activity column JSX.
 */
export function ProfileActivityColumn() {
  return (
    <div className="flex w-full shrink-0 flex-col gap-2 md:w-[340px]">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
        Council activity
      </h2>
      <div className="glass-panel rounded-[var(--radius-md)] p-4 text-xs text-[var(--color-text-secondary)]">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {ACTIVITY_ITEMS.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>

      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
        Performance (30 days)
      </h2>
      <div className="glass-panel rounded-[var(--radius-md)] p-4 text-xs text-[var(--color-text-secondary)]">
        Completion 86% · Avg ack 4h · 3 active workspaces
      </div>
    </div>
  );
}

export default ProfileActivityColumn;
