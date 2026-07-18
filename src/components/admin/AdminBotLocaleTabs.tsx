"use client";

/**
 * @fileoverview Locale switcher for admin editors that edit per-locale bot templates.
 *
 * @module src/components/admin/AdminBotLocaleTabs
 */

import type { BotLocale } from "@shared/constants/botLocales";
import { BOT_LOCALES } from "@shared/constants/botLocales";
import { Button } from "@/components/ui/button";

/** Props for {@link AdminBotLocaleTabs}. */
export interface AdminBotLocaleTabsProps {
  /** Active editing locale. */
  value: BotLocale;
  /** Called when the admin selects another locale tab. */
  onChange: (locale: BotLocale) => void;
  /** Human-readable locale labels keyed by locale code. */
  labels: Record<BotLocale, string>;
}

/**
 * Segmented locale tabs for EN/UK bot template editing.
 *
 * @param props - Active locale and label map.
 * @returns Tab button row.
 */
export function AdminBotLocaleTabs({ value, onChange, labels }: AdminBotLocaleTabsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Template locale">
      {BOT_LOCALES.map((locale) => (
        <Button
          key={locale}
          type="button"
          role="tab"
          aria-selected={value === locale}
          variant={value === locale ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(locale)}
        >
          {labels[locale]}
        </Button>
      ))}
    </div>
  );
}

export default AdminBotLocaleTabs;
