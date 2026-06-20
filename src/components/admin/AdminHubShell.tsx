/**
 * @fileoverview Administration hub shell — `/admin` landing with navigable area cards.
 *
 * @module src/components/admin/AdminHubShell
 */

import { Columns, GraduationCap, Layout, Megaphone, Shield, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { NexusSurfaceCard } from "@/components/ui/NexusSurfaceCard";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import type { AdminHubArea, AdminHubIconKey } from "@/lib/adminHubAreas";

/** Maps serializable icon keys to Lucide components. */
const ADMIN_HUB_ICON_MAP: Record<AdminHubIconKey, LucideIcon> = {
  layout: Layout,
  shield: Shield,
  megaphone: Megaphone,
  "graduation-cap": GraduationCap,
  users: Users,
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
  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="py-12"
      innerClassName="flex flex-col gap-8"
    >
      <div
        className="glass-panel w-full rounded-lg border border-zinc-700/20 p-6 shadow-md dark:border-zinc-300/10"
        style={{ borderRadius: "var(--radius-lg)" }}
      >
        <div className="flex flex-col gap-1.5">
          <div className="mb-1 flex items-center gap-2 text-primary">
            <Columns size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide uppercase">Administration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
            Choose an area
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-(--color-text-secondary)">
            Select a workspace below to configure site-wide settings, access control, or
            institution messaging. Only areas you are permitted to manage are listed.
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
              title={area.title}
              description={area.description}
              href={isComingSoon ? undefined : area.href}
              icon={Icon}
              eyebrow={isComingSoon ? "Coming soon" : "Open workspace"}
              disabled={isComingSoon}
              hoverLift={!isComingSoon}
            />
          );
        })}
      </div>
    </StaticPageShell>
  );
}

export default AdminHubShell;
