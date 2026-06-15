/**
 * @fileoverview Safe Lucide icon resolver for global layout.
 *
 * Resolves whitelisted icon names to Lucide components. For brand icons
 * (Facebook, Twitter, Instagram, Github, Youtube) which are not present
 * in Lucide v1.x, custom SVG components matching the Lucide style are rendered.
 *
 * @module src/components/global-layout/resolveLucideIcon
 */

import React from "react";
import {
  Plus,
  LogIn,
  User,
  Settings,
  HelpCircle,
  MessageSquare,
  Calendar,
  Award,
  Users,
  BookOpen,
  FileText,
  Info,
  Mail,
  Globe,
  Send,
  Newspaper,
  Briefcase,
  Shield,
  Bell,
  Home,
  ExternalLink,
  type LucideProps,
} from "lucide-react";
import { type AllowedLucideIcon, SITE_CHROME_ICON_SIZE, SITE_CHROME_ICON_STROKE } from "@shared/constants/globalLayout";
import { cn } from "@/lib/utils";

// Custom SVG components for brand icons that are missing in Lucide v1.x
const GithubIcon = ({ size = 24, className, strokeWidth = 2, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M15 22v-4a4.8 4 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

const FacebookIcon = ({ size = 24, className, strokeWidth = 2, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const TwitterIcon = ({ size = 24, className, strokeWidth = 2, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const InstagramIcon = ({ size = 24, className, strokeWidth = 2, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const YoutubeIcon = ({ size = 24, className, strokeWidth = 2, ...props }: LucideProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

/** Map of allowed icon names to Lucide icon components. */
const ICON_MAP: Record<AllowedLucideIcon, React.ComponentType<LucideProps>> = {
  Plus,
  LogIn,
  User,
  Settings,
  HelpCircle,
  MessageSquare,
  Calendar,
  Award,
  Users,
  BookOpen,
  FileText,
  Info,
  Mail,
  Globe,
  Facebook: FacebookIcon,
  Twitter: TwitterIcon,
  Instagram: InstagramIcon,
  Github: GithubIcon,
  Send,
  Youtube: YoutubeIcon,
  Newspaper,
  Briefcase,
  Shield,
  Bell,
  Home,
  ExternalLink,
};

/**
 * Default Lucide props for whitelisted site chrome icons (header, footer, layout editor).
 *
 * @see `.ai/docs/icon_sizes.md` — Site chrome tier (18px / 2.25 stroke).
 * @param props - Optional overrides (className merges with `site-chrome-icon`).
 * @returns Lucide props with unified size and stroke.
 */
export function siteChromeLucideProps(props: LucideProps = {}): LucideProps {
  const { className, size, strokeWidth, ...rest } = props;
  return {
    size: size ?? SITE_CHROME_ICON_SIZE,
    strokeWidth: strokeWidth ?? SITE_CHROME_ICON_STROKE,
    className: cn("site-chrome-icon shrink-0", className),
    ...rest,
  };
}

/**
 * Resolve a validated icon name string to a Lucide React component.
 *
 * @param iconName - Name of the icon to resolve.
 * @param props - Optional props passed to the icon component.
 * @returns React element or null if not found.
 */
export function resolveLucideIcon(
  iconName?: string | null,
  props: LucideProps = {}
): React.ReactNode {
  if (!iconName) return null;

  const IconComponent = ICON_MAP[iconName as AllowedLucideIcon];
  if (!IconComponent) return null;

  return <IconComponent {...props} />;
}
