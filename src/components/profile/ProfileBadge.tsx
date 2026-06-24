/**
 * @fileoverview Typed profile badge — consistent colors per identity category.
 *
 * @module src/components/profile/ProfileBadge
 */

import type { ProfileBadgeKind } from "@shared/lib/profileBadgeLogic";
import { profileBadgeClassName } from "@shared/lib/profileBadgeLogic";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileBadge}. */
export interface ProfileBadgeProps {
  /** Badge taxonomy entry controlling accent color. */
  kind: ProfileBadgeKind;
  /** Visible label text. */
  children: React.ReactNode;
  /** Optional extra class names. */
  className?: string;
}

/**
 * Render a profile identity chip with stable type-based coloring.
 *
 * @param props - See {@link ProfileBadgeProps}.
 * @returns Badge span element.
 */
export function ProfileBadge({ kind, children, className }: ProfileBadgeProps) {
  return <span className={cn(profileBadgeClassName(kind), className)}>{children}</span>;
}

export default ProfileBadge;
