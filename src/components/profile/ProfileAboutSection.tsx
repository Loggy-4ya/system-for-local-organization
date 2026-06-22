/**
 * @fileoverview About note and social links on profile dashboard.
 *
 * @module src/components/profile/ProfileAboutSection
 */

import type { IUserSocialLink } from "@shared/models/userTypes";

/** Props for {@link ProfileAboutSection}. */
export interface ProfileAboutSectionProps {
  /** Self-authored bio note. */
  about: string | null;
  /** User social profile links. */
  socialLinks: IUserSocialLink[];
}

/**
 * Display user about note and social media links.
 *
 * @param props - About and social link fields.
 * @returns About section JSX or null when empty.
 */
export function ProfileAboutSection({ about, socialLinks }: ProfileAboutSectionProps) {
  if (!about && socialLinks.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      {about && (
        <div className="glass-panel rounded-[var(--radius-md)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
            {about}
          </p>
        </div>
      )}

      {socialLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Social links</h2>
          <ul className="mt-2 flex list-none flex-col gap-1.5 p-0 text-sm">
            {socialLinks.map((link) => (
              <li key={`${link.platform}-${link.url}`}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent-user)] hover:underline"
                >
                  {link.label ?? link.platform}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default ProfileAboutSection;
