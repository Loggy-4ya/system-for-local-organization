/**
 * @fileoverview Split auth layout shell matching Figma Auth/StudentSignUp frame `57:17`.
 *
 * Uses the same max-width band as global header/footer ({@link GLOBAL_LAYOUT_CONTENT_WIDTH}).
 *
 * @module src/components/auth/AuthShell
 */

import type { ReactNode } from "react";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";

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
      contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH}
      className="items-center justify-center py-8 md:py-12"
      innerClassName="w-full"
    >
      <div className="auth-shell glass-panel w-full overflow-hidden rounded-[var(--radius-lg)] shadow-[0_16px_40px_-8px_rgba(15,23,41,0.14)]">
        {/* Mobile brand strip */}
        <div
          className="auth-shell__brand-mobile flex flex-col gap-2 px-6 py-8 md:hidden"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)",
          }}
        >
          <span className="text-2xl font-semibold text-[#f1f5f9]">Nexus</span>
          <p className="text-sm leading-relaxed text-[rgba(241,245,249,0.8)]">
            Institutional management for student councils, task tracking, and community
            collaboration.
          </p>
        </div>

        <div className="flex min-h-[min(680px,calc(100dvh-10rem))] w-full flex-col md:flex-row">
          {/* Desktop brand panel — Figma gradient left column */}
          <div
            className="auth-shell__brand-desktop hidden w-[min(420px,38%)] shrink-0 flex-col justify-between px-10 py-14 md:flex"
            style={{
              background: "linear-gradient(180deg, #1d4ed8 0%, #7c3aed 100%)",
            }}
          >
            <div>
              <h2 className="text-[30px] font-semibold text-[#f1f5f9]">Nexus</h2>
              <p className="mt-4 text-sm leading-relaxed text-[rgba(241,245,249,0.75)]">
                Institutional management for student councils, task tracking, and community
                collaboration.
              </p>
            </div>
            <p className="text-xs text-[rgba(241,245,249,0.55)]">
              Secure sign-in for students and council staff.
            </p>
          </div>

          {/* Form panel */}
          <div className="auth-shell__form flex flex-1 flex-col gap-5 p-6 sm:p-8 md:p-12">
            <h1 className="text-[26px] font-semibold tracking-tight text-[var(--color-text-primary)]">
              {title}
            </h1>
            {children}
          </div>
        </div>
      </div>
    </StaticPageShell>
  );
}

export default AuthShell;
