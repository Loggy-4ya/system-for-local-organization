/**
 * @fileoverview Compact open-task status chips for profile dashboards.
 *
 * @module src/components/profile/ProfileTaskStatusStrip
 */

import type { TaskStatus } from "@shared/constants/taskSettings";
import { TASK_STATUS_LABELS } from "@shared/constants/taskSettings";
import {
  profileTaskStatusBadgeClass,
  type ProfileTaskStatusBadgeClass,
} from "@shared/lib/profileTaskDisplayLogic";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileTaskStatusStrip}. */
export interface ProfileTaskStatusStripProps {
  /** Open task counts keyed by lifecycle status. */
  openByStatus: Partial<Record<TaskStatus, number>>;
}

/** Status display order for the profile summary strip. */
const PROFILE_STATUS_STRIP_ORDER: TaskStatus[] = [
  "overdue",
  "dispatched",
  "in_progress",
  "acknowledged",
  "submitted",
  "draft",
];

/**
 * Horizontal strip of open-task status counts above the assigned tasks list.
 *
 * @param props - Open task counts from {@link ProfileTaskSnapshot}.
 * @returns Status strip JSX or null when no open tasks.
 */
export function ProfileTaskStatusStrip({ openByStatus }: ProfileTaskStatusStripProps) {
  const entries = PROFILE_STATUS_STRIP_ORDER.flatMap((status) => {
    const count = openByStatus[status];
    if (!count) return [];
    return [{ status, count }];
  });

  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {entries.map(({ status, count }) => (
        <span
          key={status}
          className={cn("badge", profileTaskStatusBadgeClass(status) as ProfileTaskStatusBadgeClass)}
        >
          {count} {TASK_STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}

export default ProfileTaskStatusStrip;
