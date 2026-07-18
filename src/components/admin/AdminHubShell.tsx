/**
 * @fileoverview Administration hub shell — `/admin` landing with navigable area cards.
 *
 * @module src/components/admin/AdminHubShell
 */

"use client";

import { useTranslations } from "next-intl";
import { Columns, GraduationCap, Layout, Megaphone, MessageCircle, Server, Shield, ShieldAlert, Users, BookOpen, CalendarDays, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { NexusSurfaceCard } from "@/components/ui/NexusSurfaceCard";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import type { AdminHubArea, AdminHubIconKey } from "@/lib/adminHubAreas";

/** Maps serializable icon keys to Lucide components. */
const ADMIN_HUB_ICON_MAP: Record<AdminHubIconKey, LucideIcon> = {
  layout: Layout,
  shield: Shield,
  "shield-alert": ShieldAlert,
  megaphone: Megaphone,
  "message-circle": MessageCircle,
  "graduation-cap": GraduationCap,
  users: Users,
  "book-open": BookOpen,
  calendar: CalendarDays,
  server: Server,
  "user-check": UserCheck,
};

/** Props for {@link AdminHubShell}. */
export interface AdminHubShellProps {
  /** Areas the current user is allowed to see (pre-filtered on the server). */
  areas: AdminHubArea[];
}

/**
 * Administration hub — choose an area to manage.
 *
 * @param props - See {@link AdminHubShellProps}.
 * @returns Hub page JSX.
 */
export function AdminHubShell({ areas }: AdminHubShellProps) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="py-8 md:py-12"
      innerClassName="flex flex-col gap-8"
    >
      <div
        className="glass-panel w-full rounded-lg border border-zinc-700/20 p-6 shadow-md dark:border-zinc-300/10"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Columns size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide uppercase">{t("hubEyebrow")}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
            {t("hubTitle")}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-(--color-text-secondary)">
            {t("hubDescription")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-2">
        {areas.map((area) => {
          const Icon = ADMIN_HUB_ICON_MAP[area.icon];
          const isComingSoon = area.status === "coming_soon";

          return (
            <NexusSurfaceCard
              key={area.id}
              title={(t as (key: string) => string)(`hub.${area.id}.title`)}
              description={(t as (key: string) => string)(`hub.${area.id}.description`)}
              href={isComingSoon ? undefined : area.href}
              icon={Icon}
              eyebrow={isComingSoon ? tc("comingSoon") : tc("openWorkspace")}
              disabled={isComingSoon}
            />
          );
        })}
      </div>
    </StaticPageShell>
  );
}

export default AdminHubShell;
