/**
 * @fileoverview Custom 404 page — replaces Next.js default full-viewport fallback.
 *
 * The built-in 404 uses `height: 100vh` inside `<main>`, which sits below the
 * global header. That pushes the site footer below the fold. This page uses
 * {@link StaticPageShell} with a capped min-height (same model as {@link AuthShell})
 * so header, content, and footer share one viewport.
 *
 * @module src/app/not-found
 */

import Link from "next/link";
import { ArrowLeft, Compass, Home, LayoutGrid, User } from "lucide-react";
import type { Metadata } from "next";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { buttonVariants } from "@/components/ui/button";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { cn } from "@/lib/utils";

/** Document title for missing routes. */
export const metadata: Metadata = {
  title: "Page not found — Nexus",
  robots: { index: false, follow: false },
};

/** Brand gradient shared with the auth shell left column. */
const NOT_FOUND_GRADIENT =
  "linear-gradient(180deg, #1d4ed8 0%, #5b21b6 55%, #7c3aed 100%)";

/**
 * Site-wide 404 surface — rendered when `notFound()` is thrown or no route matches.
 *
 * @returns Full-width 404 hero that preserves global header and footer visibility.
 */
export default function NotFoundPage() {
  return (
    <StaticPageShell
      contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH}
      className="items-center justify-center py-8 md:py-10"
      innerClassName="w-full"
    >
      <div className="glass-panel w-full overflow-hidden rounded-[var(--radius-lg)] shadow-[0_16px_40px_-8px_rgba(15,23,41,0.18)]">
        {/* Mobile brand strip */}
        <div
          className="relative flex flex-col gap-3 overflow-hidden px-6 py-10 md:hidden"
          style={{ background: NOT_FOUND_GRADIENT }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-4 -right-2 text-[7rem] leading-none font-bold text-white/10 select-none"
          >
            404
          </span>
          <div className="relative z-1 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-white/15 text-[#f1f5f9]">
              <Compass size={22} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-[rgba(241,245,249,0.7)] uppercase">
                Error 404
              </p>
              <p className="text-lg font-semibold text-[#f1f5f9]">Page not found</p>
            </div>
          </div>
        </div>

        <div className="flex min-h-[min(560px,calc(100dvh-12rem))] w-full flex-col md:flex-row">
          {/* Desktop illustration panel */}
          <div
            className="relative hidden w-[min(420px,40%)] shrink-0 flex-col justify-between overflow-hidden px-10 py-12 md:flex"
            style={{ background: NOT_FOUND_GRADIENT }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -top-6 -right-4 text-[11rem] leading-none font-bold text-white/10 select-none"
            >
              404
            </span>
            <div className="relative z-1">
              <span className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-white/15 text-[#f1f5f9] shadow-[0_8px_24px_rgba(15,23,41,0.2)]">
                <Compass size={32} strokeWidth={1.5} aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold tracking-[0.22em] text-[rgba(241,245,249,0.65)] uppercase">
                Off the map
              </p>
              <p className="mt-3 max-w-[16rem] text-sm leading-relaxed text-[rgba(241,245,249,0.78)]">
                The route you requested is missing, unpublished, or restricted for your account.
              </p>
            </div>
            <p className="relative z-1 text-xs text-[rgba(241,245,249,0.5)]">Nexus · Institutional platform</p>
          </div>

          {/* Message panel */}
          <div className="flex flex-1 flex-col justify-center gap-8 p-8 sm:p-10 md:p-12 lg:p-14">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                404 — Not found
              </p>
              <h1 className="text-[clamp(2rem,4vw,2.75rem)] leading-tight font-semibold tracking-tight text-(--color-text-primary)">
                We could not find that page
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-(--color-text-secondary)">
                The address may be wrong, the page may have been removed, or you might not have
                permission to open it. Try one of the destinations below or return to a safe route.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className={cn(buttonVariants({ variant: "default", size: "lg" }), "gap-2")}
              >
                <Home size={18} strokeWidth={1.75} aria-hidden="true" />
                Go home
              </Link>
              <Link
                href="/profile"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }), "gap-2")}
              >
                <User size={18} strokeWidth={1.75} aria-hidden="true" />
                Your profile
              </Link>
            </div>

            <div className="flex flex-col gap-3 border-t border-(--color-border-default) pt-6">
              <p className="text-xs font-medium tracking-wide text-(--color-text-secondary) uppercase">
                Quick links
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <Link
                  href="/pages"
                  className="inline-flex items-center gap-1.5 text-primary no-underline transition-opacity hover:opacity-80"
                >
                  <LayoutGrid size={15} strokeWidth={1.75} aria-hidden="true" />
                  Browse pages
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-primary no-underline transition-opacity hover:opacity-80"
                >
                  <ArrowLeft size={15} strokeWidth={1.75} aria-hidden="true" />
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StaticPageShell>
  );
}
