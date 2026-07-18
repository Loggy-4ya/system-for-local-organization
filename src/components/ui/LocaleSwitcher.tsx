"use client";

/**
 * @fileoverview Header language switcher — toggles between supported locales.
 *
 * @module src/components/ui/LocaleSwitcher
 */

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { useOptionalSiteProfile } from "@/components/auth/SiteProfileProvider";
import { cn } from "@/lib/utils";

/** Props for {@link LocaleSwitcher}. */
export interface LocaleSwitcherProps {
  /** Optional extra class names on the trigger button. */
  className?: string;
  /** Compact icon-only presentation for dense header rows. */
  variant?: "default" | "sidebar";
}

/**
 * Cycles through configured locales while preserving the current path.
 *
 * @param props - See {@link LocaleSwitcherProps}.
 * @returns Locale toggle button.
 */
export function LocaleSwitcher({ className, variant = "default" }: LocaleSwitcherProps) {
  const t = useTranslations("common.locale");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const siteProfile = useOptionalSiteProfile();

  const currentIndex = routing.locales.indexOf(locale);
  const nextLocale = routing.locales[(currentIndex + 1) % routing.locales.length] as AppLocale;
  const nextLabel = t(nextLocale);

  const handleSwitch = () => {
    router.replace(pathname, { locale: nextLocale });
    if (siteProfile?.isAuthenticated) {
      void fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredLocale: nextLocale }),
      })
        .then((res) => (res.ok ? siteProfile.refreshProfile() : undefined))
        .catch(() => undefined);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSwitch}
      className={cn(
        variant === "sidebar"
          ? "inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          : "inline-flex size-9 items-center justify-center rounded-[var(--radius-md)] border border-[var(--color-border-default)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
        className,
      )}
      aria-label={t("switchTo", { language: nextLabel })}
      title={t("current", { language: t(locale) })}
    >
      <Languages className="size-4" aria-hidden="true" />
      {variant === "sidebar" ? (
        <span className="uppercase tracking-wide">{locale}</span>
      ) : (
        <span className="sr-only">{locale.toUpperCase()}</span>
      )}
    </button>
  );
}

export default LocaleSwitcher;
