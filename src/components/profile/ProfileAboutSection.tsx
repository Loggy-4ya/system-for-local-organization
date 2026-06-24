/**
 * @fileoverview About note and social links on profile dashboard.
 *
 * @deprecated Prefer {@link ProfileIdentityBoard} for the full personal board layout.
 *
 * @module src/components/profile/ProfileAboutSection
 */

import {
  ProfileIdentityBoard,
  type ProfileIdentityBoardProps,
} from "@/components/profile/ProfileIdentityBoard";

/** Props for {@link ProfileAboutSection}. */
export type ProfileAboutSectionProps = Pick<
  ProfileIdentityBoardProps,
  "about" | "socialLinks"
>;

/**
 * Display user about note and social media links.
 *
 * @param props - About and social link fields.
 * @returns About section JSX or null when empty.
 */
export function ProfileAboutSection({ about, socialLinks }: ProfileAboutSectionProps) {
  return <ProfileIdentityBoard about={about} socialLinks={socialLinks} />;
}

export default ProfileAboutSection;
