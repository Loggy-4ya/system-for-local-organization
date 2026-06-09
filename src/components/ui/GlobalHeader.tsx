"use client";

/**
 * @fileoverview Contained GlobalHeader component for Project Nexus.
 *
 * Renders the full-width 72px header slot with a centred `1200px` glass bar
 * that matches the Figma `Header/Global` (`56:2`) specification:
 *
 *  ┌──────────────────────────────────────────────────────────┐  ← slot (1440px)
 *  │  ┌──── glass bar (1200px, 12px radius, drop shadow) ───┐ │
 *  │  │  LogoMark  News  Council Apply  Propose Activity     │ │
 *  │  │  [Admin?]          ───────     Nexus   ☀☾   Avatar  │ │
 *  │  └────────────────────────────────────────────────────── ┘ │
 *  └──────────────────────────────────────────────────────────┘
 *
 * Behaviour:
 *  - The `Admin` nav link is conditionally rendered based on the `showAdminPanel`
 *    prop, which must be derived from the active RBAC session by the parent.
 *  - The theme toggle cycles between "light" and "dark" using `@teispace/next-themes`.
 *  - The component marks its own active link by comparing `pathname` from
 *    `next/navigation` with each route.
 *
 * @module src/components/ui/GlobalHeader
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/assets";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

// ── Types ────────────────────────────────────────────────────────────────────

/** Descriptor for a single navigation link entry. */
interface NavLink {
  /** Route this link points to. */
  href: string;
  /** Display label. */
  label: string;
  /** When true, the link is only rendered if `showAdminPanel` is true. */
  adminOnly?: boolean;
}

/** Props accepted by `GlobalHeader`. */
export interface GlobalHeaderProps {
  /**
   * When true the `Admin` navigation link is displayed.
   * Should be derived from the active RBAC session — pass `false` for all
   * student-facing routes so the admin link is invisible.
   *
   * @default false
   */
  showAdminPanel?: boolean;
  /**
   * URL to the authenticated user's avatar image.
   * Falls back to a generated initials placeholder when null.
   */
  userAvatar?: string | null;
}

// ── Navigation link definitions ───────────────────────────────────────────────

/**
 * Ordered nav links as defined in the Figma design spec.
 * The `Admin` entry is gated by `showAdminPanel`.
 */
const NAV_LINKS: NavLink[] = [
  { href: "/news",             label: "News" },
  { href: "/council-apply",    label: "Council Apply" },
  { href: "/propose-activity", label: "Propose Activity" },
  { href: "/pages",            label: "Create Page" },
  { href: "/admin",            label: "Admin",  adminOnly: true },
];

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Global site header — rendered inside the root layout above all page content.
 *
 * @param props - See `GlobalHeaderProps`.
 * @returns The full header JSX subtree.
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * <GlobalHeader showAdminPanel={session?.user.role === "Admin"} />
 * ```
 */
export function GlobalHeader({
  showAdminPanel = false,
  userAvatar     = null,
}: GlobalHeaderProps) {
  const pathname = usePathname();

  // Hide the global header completely when in editor mode
  const isEditing = pathname === "/edit" || pathname.endsWith("/edit");
  if (isEditing) return null;

  /** Returns true when the given route matches the current pathname. */
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    /*
     * Outer slot — 72px tall, full width, transparent.
     * The `z-10` ensures the header bar sits above page content but below
     * modals (z-20+).
     */
    <header
      className="relative z-10 flex h-[72px] w-full items-center justify-center px-6"
      role="banner"
    >
      {/* ── Glass bar ──────────────────────────────────────────────────────── */}
      <div
        className="glass-panel flex w-full max-w-[1200px] items-center justify-between px-4 py-[10px]"
        style={{
          boxShadow: "0 8px 24px -4px rgba(0,0,0,0.35)",
        }}
      >

        {/* ── Left zone: Logo mark + Nav links ─────────────────────────────── */}
        <div className="flex items-center gap-5">
          {/* Logo mark */}
          <Link
            href="/"
            aria-label="Nexus home"
            className="flex shrink-0 items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--color-accent-user)" }}
            >
              <Image
                src={BRAND.logo}
                alt=""
                width={16}
                height={16}
                style={{ filter: "brightness(0) invert(1)" }}
                priority
              />
            </span>
          </Link>

          {/* Nav links */}
          <nav aria-label="Primary navigation">
            <ul className="flex items-center gap-5 list-none m-0 p-0">
              {NAV_LINKS.filter(l => !l.adminOnly || showAdminPanel).map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={[
                      "text-[13px] transition-colors",
                      isActive(link.href)
                        ? "font-medium text-[var(--color-text-primary)]"
                        : "font-normal text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
                    ].join(" ")}
                    aria-current={isActive(link.href) ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* ── Right zone: Nexus label (top) + controls (bottom) ────────────── */}
        <div className="flex flex-col items-end gap-[3px]">
          {/* Nexus wordmark — above the theme picker as per design spec */}
          <span
            aria-hidden="true"
            className="text-[12px] font-semibold leading-none text-[var(--color-text-primary)]"
          >
            Nexus
          </span>

          {/* Controls row */}
          <div className="flex items-center gap-2">
            {/* ── New Page CTA ─────────────────────────────────────────────── */}
            <Link
              href="/pages"
              className="flex items-center gap-[5px] rounded-lg bg-[var(--color-accent-user)] px-[10px] py-[5px] text-[12px] font-medium text-white transition-opacity hover:opacity-90"
              style={{ textDecoration: "none" }}
            >
              + New Page
            </Link>

            {/* ── Theme toggle ──────────────────────────────────────────────── */}
            <ThemeToggle />

            {/* ── User avatar ───────────────────────────────────────────────── */}
            <div
              className="h-[28px] w-[28px] shrink-0 overflow-hidden rounded-full"
              style={{
                border: "2px solid var(--color-accent-user)",
                background: "var(--color-bg-elevated)",
              }}
              aria-label="User profile"
            >
              {userAvatar ? (
                <Image
                  src={userAvatar}
                  alt="User avatar"
                  width={28}
                  height={28}
                  className="h-full w-full object-cover"
                />
              ) : (
                // Fallback placeholder — shows the accent ring without crashing
                <div
                  aria-hidden="true"
                  className="h-full w-full"
                  style={{ background: "var(--color-accent-user)", opacity: 0.6 }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default GlobalHeader;
