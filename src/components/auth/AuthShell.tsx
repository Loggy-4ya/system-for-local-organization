/**
 * @fileoverview Split auth layout shell matching Figma Auth/StudentSignUp frame `57:17`.
 *
 * @module src/components/auth/AuthShell
 */

import type { ReactNode } from "react";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

/** Props for {@link AuthShell}. */
export interface AuthShellProps {
  /** Form panel title, e.g. "Create account" or "Sign in". */
  title: string;
  /** Form content rendered in the right panel. */
  children: ReactNode;
}

/**
 * Centered auth card with gradient brand panel and form area.
 *
 * @param props - See {@link AuthShellProps}.
 * @returns Auth shell JSX.
 */
export function AuthShell({ title, children }: AuthShellProps) {
  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH["/login"]}
      className="items-center justify-center p-6"
      innerClassName="items-center"
    >
      <div
        className="glass-panel flex w-full overflow-hidden rounded-[var(--radius-lg)] shadow-[0_16px_40px_-8px_rgba(15,23,41,0.14)]"
        style={{ minHeight: 680 }}
      >
        {/* Brand panel — Figma gradient left column */}
        <div
          className="hidden w-[420px] shrink-0 flex-col px-10 pt-14 md:flex"
          style={{
            background: "linear-gradient(180deg, #1d4ed8 0%, #7c3aed 100%)",
          }}
        >
          <h2
            className="text-[30px] font-semibold text-[var(--color-text-primary)]"
            style={{ color: "#f1f5f9" }}
          >
            Nexus
          </h2>
          <p className="mt-4 text-sm leading-relaxed" style={{ color: "rgba(241,245,249,0.75)" }}>
            Institutional management for student councils, task tracking, and community
            collaboration.
          </p>
        </div>

        {/* Form panel */}
        <div className="flex flex-1 flex-col gap-4 p-8 md:p-12">
          <h1 className="text-[26px] font-semibold text-[var(--color-text-primary)]">
            {title}
          </h1>
          {children}
        </div>
      </div>
    </StaticPageShell>
  );
}

export default AuthShell;
