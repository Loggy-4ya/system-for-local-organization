/**
 * @fileoverview About note and social links on profile dashboard.
 *
 * @module src/components/profile/ProfileAboutSection
 */

import type { PublicUser } from "@shared/domains/AuthDomain";

/** Props for {@link ProfileAboutSection}. */
export interface ProfileAboutSectionProps {
  user: PublicUser;
}

/**
 * Display user about note and social media links.
 *
 * @param props - Public user record.
 * @returns About section JSX or null when empty.
 */
export function ProfileAboutSection({ user }: ProfileAboutSectionProps) {
  if (!user.about && user.socialLinks.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      {user.about && (
        <div className="glass-panel rounded-[var(--radius-md)] p-4">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-text-secondary)]">
            {user.about}
          </p>
        </div>
      )}

      {user.socialLinks.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Social links</h2>
          <ul className="mt-2 flex list-none flex-col gap-1.5 p-0 text-sm">
            {user.socialLinks.map((link) => (
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
