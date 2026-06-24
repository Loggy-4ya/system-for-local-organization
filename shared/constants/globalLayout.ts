/**
 * @fileoverview Seed constants and whitelists for MongoDB-backed global layout.
 *
 * @module shared/constants/globalLayout
 */

/** Singleton document ID for site-wide layout settings. */
export const GLOBAL_LAYOUT_ID = "nexus-site";

/** Lucide glyph size for site chrome (header nav, footer social, layout editor pickers).
 * @see `.ai/docs/icon_sizes.md`
 */
export const SITE_CHROME_ICON_SIZE = 18;

/**
 * Stroke weight paired with {@link SITE_CHROME_ICON_SIZE}.
 * @see `.ai/docs/icon_sizes.md` — Site chrome tier (18px / 2.25 stroke).
 */
export const SITE_CHROME_ICON_STROKE = 2.25;

/** Whitelist of supported Lucide icon names for header/footer items. */
export const ALLOWED_LUCIDE_ICONS = [
  "Plus",
  "LogIn",
  "User",
  "Settings",
  "HelpCircle",
  "MessageSquare",
  "Calendar",
  "Award",
  "Users",
  "BookOpen",
  "FileText",
  "Info",
  "Mail",
  "Globe",
  "Facebook",
  "Twitter",
  "Instagram",
  "Github",
  "Send", // Telegram
  "Youtube",
  "Newspaper", // News
  "Briefcase",
  "Shield",
  "Bell",
  "Home",
  "ExternalLink",
] as const;

/** Type-safe union of allowed Lucide icon names. */
export type AllowedLucideIcon = (typeof ALLOWED_LUCIDE_ICONS)[number];

/** Navigation item rendering variants. */
export type NavItemVariant = "link" | "button";

/** Horizontal spacing between desktop header navigation groups. */
export type HeaderNavGap = "sm" | "md" | "lg" | "xl" | "2xl";

/** Horizontal alignment for desktop header navigation zones. */
export type HeaderNavAlign = "start" | "center" | "end";

/** Header layout configuration. */
export interface HeaderLayout {
  /** Gap between nav groups (8 / 16 / 24 / 36 / 48 px). */
  gap: HeaderNavGap;
  /** Default desktop alignment for categories without their own `align`. */
  align: HeaderNavAlign;
}

/** Individual header navigation item. */
export interface HeaderNavItem {
  id: string;
  href: string;
  label: string;
  icon?: AllowedLucideIcon;
  variant?: NavItemVariant;
  adminOnly?: boolean;
}

/** Group of navigation items under a category. */
export interface HeaderCategory {
  id: string;
  label?: string;
  /** Optional Lucide icon shown beside the category label (desktop dropdown + mobile accordion). */
  icon?: AllowedLucideIcon;
  /** Pill-style category trigger when set to `button`. */
  variant?: NavItemVariant;
  /** Hide the whole category from non-admin viewers. */
  adminOnly?: boolean;
  /** Desktop nav zone override; inherits `HeaderLayout.align` when unset. */
  align?: HeaderNavAlign;
  items: HeaderNavItem[];
}

/** Header configuration object. */
export interface HeaderConfig {
  layout: HeaderLayout;
  categories: HeaderCategory[];
  /** Signed-in avatar dropdown links (configured in Global Layout → User Menu). */
  userMenu: HeaderNavItem[];
}

/** Individual footer link. */
export interface FooterLink {
  id: string;
  href: string;
  label: string;
  external?: boolean;
}

/** Individual footer social media link. */
export interface FooterSocialLink {
  id: string;
  href: string;
  label: string;
  icon: AllowedLucideIcon;
}

/** Section of links in the footer. */
export interface FooterSection {
  id: string;
  title?: string;
  links: FooterLink[];
}

/** Number of link columns on desktop footer (brand block is separate). */
export type FooterLinkColumnCount = 2 | 3 | 4;

/** Footer grid layout settings. */
export interface FooterLayout {
  /** Link columns per row on desktop and tablet footer. */
  columns: FooterLinkColumnCount;
}

/** Footer configuration object. */
export interface FooterConfig {
  layout?: FooterLayout;
  sections: FooterSection[];
  socialLinks: FooterSocialLink[];
  mention?: string;
  copyright?: string;
}

/** Full global layout configuration. */
export interface GlobalLayoutConfig {
  header: HeaderConfig;
  footer: FooterConfig;
}

/** Default header layout configuration. */
export const DEFAULT_HEADER_LAYOUT: HeaderLayout = {
  gap: "md",
  align: "start",
};

/** Default signed-in user menu links (avatar dropdown + mobile account section). */
export const DEFAULT_HEADER_USER_MENU: HeaderNavItem[] = [
  { id: "profile", href: "/profile", label: "Profile", icon: "User" },
  { id: "profile-settings", href: "/profile/settings", label: "Settings", icon: "Settings" },
];

/**
 * Default header categories — grouped for desktop dropdowns and mobile accordions.
 *
 * Three premade categories cover the main institutional routes. Admins may override
 * everything in `/admin/global-layout`.
 */
export const DEFAULT_HEADER_CATEGORIES: HeaderCategory[] = [
  {
    id: "explore",
    label: "Explore",
    icon: "Globe",
    items: [
      { id: "home", href: "/", label: "Home", icon: "Home" },
      { id: "pages-catalog", href: "/pages", label: "Browse Pages", icon: "FileText" },
      { id: "news", href: "/news", label: "News", icon: "Newspaper" },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    icon: "Briefcase",
    items: [
      { id: "tasks", href: "/tasks", label: "Tasks", icon: "Briefcase" },
      { id: "task-groups", href: "/task-groups", label: "Task Groups", icon: "Users" },
      {
        id: "membership",
        href: "/profile/membership",
        label: "Membership",
        icon: "Award",
      },
      {
        id: "notifications",
        href: "/profile/notifications",
        label: "Notifications",
        icon: "Bell",
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    icon: "Shield",
    align: "end",
    adminOnly: true,
    items: [
      { id: "admin-hub", href: "/admin", label: "Admin Hub", icon: "Shield", adminOnly: true },
      { id: "page-manager", href: "/pages/edit", label: "Page Manager", icon: "Plus" },
      {
        id: "user-directory",
        href: "/admin/users",
        label: "User Directory",
        icon: "Users",
        adminOnly: true,
      },
      {
        id: "global-layout",
        href: "/admin/global-layout",
        label: "Global Layout",
        icon: "Settings",
        adminOnly: true,
      },
      {
        id: "user-access",
        href: "/admin/user-access",
        label: "User Access",
        icon: "Shield",
        adminOnly: true,
      },
      {
        id: "general-rules",
        href: "/admin/general-rules",
        label: "General Rules",
        icon: "BookOpen",
        adminOnly: true,
      },
      {
        id: "telegram-bot",
        href: "/admin/telegram-bot",
        label: "Telegram Bot",
        icon: "Send",
        adminOnly: true,
      },
      {
        id: "institutional-calendar",
        href: "/admin/institutional-calendar",
        label: "Institutional Calendar",
        icon: "Calendar",
        adminOnly: true,
      },
      {
        id: "system-logs",
        href: "/admin/logs",
        label: "System Logs",
        icon: "Shield",
        adminOnly: true,
      },
      {
        id: "telegram-workspaces",
        href: "/admin/telegram-workspaces",
        label: "Telegram Workspaces",
        icon: "Globe",
        adminOnly: true,
      },
      {
        id: "hosting",
        href: "/admin/hosting",
        label: "Hosting",
        icon: "ExternalLink",
        adminOnly: true,
      },
      {
        id: "membership-applications",
        href: "/admin/membership-applications",
        label: "Membership Applications",
        icon: "Award",
        adminOnly: true,
      },
    ],
  },
];

/** Default footer grid layout. */
export const DEFAULT_FOOTER_LAYOUT: FooterLayout = {
  columns: 2,
};

/** Default footer configuration. */
export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  layout: DEFAULT_FOOTER_LAYOUT,
  sections: [
    {
      id: "resources",
      title: "Resources",
      links: [
        { id: "pages-catalog", href: "/pages", label: "Browse Pages" },
        { id: "pages-list", href: "/pages", label: "Page Manager" },
        { id: "news-feed", href: "/news", label: "News Feed" },
      ],
    },
    {
      id: "legal",
      title: "Legal",
      links: [
        { id: "privacy", href: "/privacy", label: "Privacy Policy" },
        { id: "terms", href: "/terms", label: "Terms of Service" },
      ],
    },
  ],
  socialLinks: [
    { id: "telegram", href: "https://t.me/nexus_bot", label: "Telegram", icon: "Send" },
    { id: "github", href: "https://github.com/nexus", label: "GitHub", icon: "Github" },
  ],
  mention: "Built by Student Council 2026",
  copyright: "© 2026 Project Nexus. All rights reserved.",
};

/** Full default global layout configuration. */
export const DEFAULT_GLOBAL_LAYOUT: GlobalLayoutConfig = {
  header: {
    layout: DEFAULT_HEADER_LAYOUT,
    categories: DEFAULT_HEADER_CATEGORIES,
    userMenu: DEFAULT_HEADER_USER_MENU,
  },
  footer: DEFAULT_FOOTER_CONFIG,
};
