/**
 * @fileoverview Task activity and performance sidebar for profile dashboards.
 *
 * @module src/components/profile/ProfileActivityColumn
 */

import Link from "next/link";
import type { ProfileTaskSnapshot } from "@shared/domains/TaskDomain";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";
import {
  formatProfileTaskRelativeTime,
  profileTaskStatusBadgeClass,
} from "@shared/lib/profileTaskDisplayLogic";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileActivityColumn}. */
export interface ProfileActivityColumnProps {
  /** Profile owner display name for headings. */
  displayName: string;
  /** Server-side task snapshot for the profile owner. */
  snapshot: ProfileTaskSnapshot;
  /** When true, use second-person copy (own dashboard). */
  isSelf?: boolean;
}

/**
 * Right sidebar with live task activity and 30-day performance summary.
 *
 * @param props - Profile owner label and task snapshot.
 * @returns Activity column JSX.
 */
export function ProfileActivityColumn({
  displayName,
  snapshot,
  isSelf = false,
}: ProfileActivityColumnProps) {
  const subject = isSelf ? "You" : displayName.split(" ")[0] ?? displayName;
  const completionRate =
    snapshot.openCount + snapshot.completedLast30Days === 0
      ? 0
      : Math.round(
          (snapshot.completedLast30Days /
            (snapshot.openCount + snapshot.completedLast30Days)) *
            100,
        );

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 md:w-[340px]">
      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Recent task activity</h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          {isSelf ? "Your latest open assignments" : `What ${subject} is working on`}
        </p>
      </div>

      <div className="glass-panel rounded-[var(--radius-md)] p-4">
        {snapshot.recentOpenTasks.length === 0 ? (
          <p className="text-xs text-[var(--color-text-secondary)]">No open tasks right now.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {snapshot.recentOpenTasks.map((task) => (
              <li key={task.id} className="border-b border-[var(--color-border-default)] pb-3 last:border-0 last:pb-0">
                <Link
                  href={`/tasks/${task.id}`}
                  className="text-xs font-medium text-[var(--color-text-primary)] hover:underline"
                >
                  {task.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={cn("badge", profileTaskStatusBadgeClass(task.status))}>
                    {TASK_STATUS_LABELS[task.status]}
                  </span>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {formatProfileTaskRelativeTime(task.updatedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Performance (30 days)</h2>
        <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
          Completion momentum and active projects
        </p>
      </div>

      <div className="glass-panel rounded-[var(--radius-md)] p-4">
        <dl className="m-0 grid grid-cols-1 gap-3 p-0 text-xs">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--color-text-secondary)]">Completed tasks</dt>
            <dd className="font-semibold text-[var(--color-text-primary)]">{snapshot.completedLast30Days}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--color-text-secondary)]">Open tasks</dt>
            <dd className="font-semibold text-[var(--color-text-primary)]">{snapshot.openCount}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--color-text-secondary)]">Completion rate</dt>
            <dd className="font-semibold text-[var(--color-text-primary)]">{completionRate}%</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[var(--color-text-secondary)]">Active projects</dt>
            <dd className="font-semibold text-[var(--color-text-primary)]">{snapshot.activeGroupCount}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default ProfileActivityColumn;
