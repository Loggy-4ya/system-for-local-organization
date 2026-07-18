/**
 * @fileoverview Published news and social interactivity feed on user profile.
 *
 * @module src/components/profile/ProfilePublishedSection
 */

import { getTranslations } from "next-intl/server";
import type { PublicPublishedContentItem } from "@shared/domains/AuthDomain";
import { Link } from "@/i18n/navigation";

/** Props for {@link ProfilePublishedSection}. */
export interface ProfilePublishedSectionProps {
  items: PublicPublishedContentItem[];
}

/**
 * List recent published community content for eligible authors.
 *
 * @param props - Published content rows.
 * @returns Published section JSX or null when empty.
 */
export async function ProfilePublishedSection({ items }: ProfilePublishedSectionProps) {
  if (items.length === 0) return null;

  const t = await getTranslations("profile.published");

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{t("title")}</h2>
      <div className="glass-panel rounded-[var(--radius-md)] p-4">
        <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5">
              <Link
                href={item.href}
                className="font-medium text-[var(--color-text-primary)] hover:underline"
              >
                {item.title}
              </Link>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {item.contentType === "news" ? t("news") : t("social")} ·{" "}
                {new Date(item.publishedAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default ProfilePublishedSection;
