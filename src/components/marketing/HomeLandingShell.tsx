/**
 * @fileoverview Code-only Nexus homepage — stacked glass islands on the dynamic grid background.
 *
 * The root route (`/`) is intentionally not Puck-managed. This shell introduces the platform
 * in readable opaque panels and links visitors to the public page catalog at `/pages`.
 *
 * @module src/components/marketing/HomeLandingShell
 */

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckSquare,
  LayoutGrid,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
} from "lucide-react";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { buttonVariants } from "@/components/ui/button";
import { GLOBAL_LAYOUT_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { BRAND } from "@/lib/assets";
import { cn } from "@/lib/utils";

/** Brand gradient accent shared with auth and 404 shells. */
const HERO_GRADIENT = "linear-gradient(135deg, #1d4ed8 0%, #5b21b6 55%, #7c3aed 100%)";

/** Short capability highlights rendered as island cards. */
const CAPABILITY_ISLANDS = [
  {
    icon: LayoutGrid,
    title: "Visual pages",
    description:
      "Publish news, guides, and landing content with the Puck editor — layouts, media, and forms without shipping new code.",
  },
  {
    icon: CheckSquare,
    title: "Tasks & projects",
    description:
      "Dispatch work, track acknowledgement, and coordinate multi-part projects with reminders and institutional calendars.",
  },
  {
    icon: Send,
    title: "Telegram workspaces",
    description:
      "Spin up dedicated project groups, collect reports in chat, and keep council operations close to where members already are.",
  },
] as const;

/** Secondary pillars shown in the overview island. */
const PLATFORM_PILLARS = [
  {
    icon: Shield,
    title: "Role-based access",
    description: "Admins and council leads get the right visibility without exposing sensitive operations.",
  },
  {
    icon: MessageSquare,
    title: "Comments & engagement",
    description: "Readers can react, discuss, and stay involved on published institutional pages.",
  },
  {
    icon: Bell,
    title: "Notification center",
    description: "Personal inbox, broadcasts, and task reminders keep members aligned across the web app.",
  },
] as const;

/**
 * Public homepage body — hero, capability islands, overview, and catalog CTA.
 *
 * @returns Width-aligned landing layout inside {@link StaticPageShell}.
 */
export function HomeLandingShell() {
  return (
    <StaticPageShell
      contentWidth={GLOBAL_LAYOUT_CONTENT_WIDTH}
      className="py-8 md:py-12"
      innerClassName="flex w-full flex-col gap-4 md:gap-6"
    >
      {/* Hero island */}
      <section
        className="glass-panel overflow-hidden rounded-[var(--radius-lg)] shadow-[0_16px_40px_-8px_rgba(15,23,41,0.16)]"
        aria-labelledby="home-hero-heading"
      >
        <div
          className="relative flex flex-col gap-6 overflow-hidden px-6 py-10 sm:px-8 sm:py-12 md:flex-row md:items-center md:justify-between md:gap-10 md:px-10 md:py-14"
          style={{ background: HERO_GRADIENT }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-8 right-4 text-[9rem] leading-none font-bold text-white/10 select-none sm:text-[11rem]"
          >
            N
          </span>

          <div className="relative z-1 flex max-w-2xl flex-col gap-5">
            <div className="flex items-center gap-3">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15 shadow-[0_8px_24px_rgba(15,23,41,0.18)]">
                <Image
                  src={BRAND.logo}
                  alt=""
                  width={28}
                  height={28}
                  className="size-7 brightness-0 invert"
                  priority
                />
              </span>
              <p className="text-xs font-semibold tracking-[0.22em] text-[rgba(241,245,249,0.72)] uppercase">
                Project Nexus
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <h1
                id="home-hero-heading"
                className="text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.05] font-semibold tracking-tight text-[#f8fafc]"
              >
                Institutional management for student councils
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-[rgba(241,245,249,0.82)] sm:text-lg">
                Nexus unifies pages, tasks, profiles, and Telegram automation into one scalable
                platform — built for councils that need clarity, accountability, and a polished
                public presence.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/pages"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "gap-2 border-0 bg-white text-[#1e3a8a] shadow-[0_10px_30px_rgba(15,23,41,0.22)] hover:bg-white/92",
                )}
              >
                <LayoutGrid size={18} strokeWidth={1.75} aria-hidden="true" />
                Browse pages
              </Link>
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "gap-2 border-white/35 bg-white/10 text-[#f8fafc] hover:bg-white/16 hover:text-[#f8fafc]",
                )}
              >
                Sign in
                <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="relative z-1 hidden w-full max-w-xs shrink-0 flex-col gap-3 rounded-[var(--radius-lg)] border border-white/20 bg-[rgba(255,255,255,0.14)] p-5 lg:flex">
            <div className="flex items-center gap-2 text-sm font-medium text-[#f8fafc]">
              <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
              One platform, many workflows
            </div>
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-[rgba(241,245,249,0.78)]">
              <li>Publish institutional content with the visual editor</li>
              <li>Run tasks, groups, and calendar-driven operations</li>
              <li>Connect members through profiles, mentions, and Telegram</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Capability islands */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
        {CAPABILITY_ISLANDS.map(({ icon: Icon, title, description }) => (
          <section
            key={title}
            className="glass-panel flex flex-col gap-4 rounded-[var(--radius-lg)] p-6 shadow-[0_10px_28px_-10px_rgba(15,23,41,0.14)]"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-(--color-text-primary)">
                {title}
              </h2>
              <p className="text-sm leading-relaxed text-(--color-text-secondary)">{description}</p>
            </div>
          </section>
        ))}
      </div>

      {/* Platform overview island */}
      <section className="glass-panel rounded-[var(--radius-lg)] p-6 shadow-[0_10px_28px_-10px_rgba(15,23,41,0.12)] sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex max-w-3xl flex-col gap-3">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Built for councils
            </p>
            <h2 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-(--color-text-primary)">
              Everything your institution needs to operate in the open
            </h2>
            <p className="text-base leading-relaxed text-(--color-text-secondary)">
              Nexus is a containerized management and automation platform: configurable global
              layout, membership applications, access control, media storage, rich text with
              mentions, and admin tooling — all on top of a dynamic site background that stays
              readable thanks to solid glass islands like these.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PLATFORM_PILLARS.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-(--color-border-default) bg-(--color-bg-elevated) p-4"
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-(--color-bg-panel) text-primary">
                  <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-sm font-semibold text-(--color-text-primary)">{title}</h3>
                  <p className="text-sm leading-relaxed text-(--color-text-secondary)">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Catalog CTA island */}
      <section className="glass-panel flex flex-col gap-5 rounded-[var(--radius-lg)] p-6 shadow-[0_10px_28px_-10px_rgba(15,23,41,0.12)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex max-w-2xl flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Explore content
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-(--color-text-primary) sm:text-2xl">
            Browse published pages by category
          </h2>
          <p className="text-sm leading-relaxed text-(--color-text-secondary) sm:text-base">
            News, guides, and council pages live in the public catalog. Open the page manager to
            discover what is already published across institutional domains.
          </p>
        </div>

        <Link
          href="/pages"
          className={cn(buttonVariants({ size: "lg" }), "w-full shrink-0 gap-2 sm:w-auto")}
        >
          <LayoutGrid size={18} strokeWidth={1.75} aria-hidden="true" />
          Go to pages
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </section>
    </StaticPageShell>
  );
}

export default HomeLandingShell;
