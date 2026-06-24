import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@teispace/next-themes";
import { getTheme, getThemeScript } from "@teispace/next-themes/server";
import { LayoutInfiniteGrid } from "@/components/background/LayoutInfiniteGrid";
import { HeaderSessionBridge } from "@/components/ui/HeaderSessionBridge";
import { FooterSessionBridge } from "@/components/ui/FooterSessionBridge";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { SiteProfileProvider } from "@/components/auth/SiteProfileProvider";
import { DomEventRejectionGuardHost } from "@/components/navigation/DomEventRejectionGuardHost";
import { RouteNavigationRecoveryHost } from "@/components/navigation/RouteNavigationRecoveryHost";
import { toBasicSiteProfile } from "@shared/lib/siteProfileBasic";
import { SiteNotificationToastStack } from "@/components/notifications/SiteNotificationToastStack";
import { WebNotificationPermissionPromptHost } from "@/components/notifications/WebNotificationPermissionPromptHost";
import { NexusImageCropHost } from "@/components/media/NexusImageCropHost";
import { ProfileOnboardingRedirect } from "@/components/profile/ProfileOnboardingRedirect";
import { ProfileMemberTelegramBanner } from "@/components/profile/ProfileMemberTelegramBanner";
import { TelegramWebAppViewportHost } from "@/components/telegram/TelegramWebAppViewportHost";
import { NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT } from "@/lib/domEventRejectionGuardScript";
import { SITE_ICONS } from "@/lib/assets";
import { CSP_NONCE_HEADER } from "@/lib/contentSecurityPolicy";
import { NEXUS_THEME_OPTIONS, resolveStoredThemeIsDark } from "@/lib/resolveStoredThemeIsDark";
import { auth } from "@/auth";
import { seedAdminUser } from "@shared/lib/seedAdminUser";
import "./globals.css";
import "./page-catalog.css";

/** Shared theme configuration — kept in sync between layout script and provider. */
const THEME_CONFIG = {
  attribute: "data-theme" as const,
  defaultTheme: "dark",
  enableSystem: true,
  themes: ["light", "dark", "system"],
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif-face",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  display: "swap",
});

const fontVariables = `${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`;

export const metadata: Metadata = {
  title: "Nexus — Institutional Management Platform",
  description:
    "A scalable, containerized institutional management and automation platform " +
    "for student councils, task tracking, and community collaboration.",
  icons: SITE_ICONS,
};

/** Mobile viewport — required for correct tap targets on real devices. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * @fileoverview Root Next.js layout for Project Nexus.
 *
 * Responsibilities:
 *  - Applies Inter (sans), Source Serif 4 (serif), and JetBrains Mono (mono) via CSS variables.
 *  - Seeds the theme via a `next/script` beforeInteractive block (zero-flicker SSR)
 *    and wraps the tree with `@teispace/next-themes` so descendants can toggle
 *    Light / Dark mode via `useTheme`.
 *  - Renders the `InfiniteGrid` background canvas (added in Phase 1).
 *  - Renders a persistent `GlobalHeader` above all page content.
 */
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Seed the Admin user on layout load (first page access)
  // Run asynchronously on the background to prevent blocking layout SSR
  seedAdminUser().catch((err) => console.error("[RootLayout] Seeding error:", err));

  const headerStore = await headers();
  const cspNonce = headerStore.get(CSP_NONCE_HEADER) ?? undefined;
  const initialTheme =
    (await getTheme({
      themes: [...NEXUS_THEME_OPTIONS],
      headers: headerStore,
    })) ?? undefined;
  const themeScript = getThemeScript({
    ...THEME_CONFIG,
    initialTheme: initialTheme ?? undefined,
  });
  const ssrDataTheme = (await resolveStoredThemeIsDark("dark")) ? "dark" : "light";

  const session = await auth();
  const initialSiteProfile =
    session?.user?.id != null ? toBasicSiteProfile(session.user) : null;

  /** Brave / wallet extensions may assign to `window.ethereum` before injection completes. */
  const walletProviderShim = `(function(){try{if(typeof window!=="undefined"&&!window.ethereum){window.ethereum={selectedAddress:void 0}}}catch(e){}})();`;

  return (
    <html lang="en" className={fontVariables} data-theme={ssrDataTheme} suppressHydrationWarning>
      <head>
        {cspNonce ? <meta name="csp-nonce" content={cspNonce} /> : null}
      </head>
      <body className="flex min-h-dvh flex-col touch-manipulation" suppressHydrationWarning>
        <Script
          id="nexus-dom-event-rejection-guard"
          strategy="beforeInteractive"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{
            __html: NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT,
          }}
        />
        <Script
          id="nexus-wallet-shim"
          strategy="beforeInteractive"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{ __html: walletProviderShim }}
        />
        {/*
          beforeInteractive: Next.js injects this before hydration (React 19 rejects
          raw <script> children in component trees — use dangerouslySetInnerHTML).
          Pair with ThemeProvider noScript below.
        */}
        <Script
          id="nexus-theme-init"
          strategy="beforeInteractive"
          nonce={cspNonce}
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        <ThemeProvider
          {...THEME_CONFIG}
          initialTheme={initialTheme ?? undefined}
          noScript
          disableTransitionOnChange={false}
        >
          <SessionProvider session={session}>
            <SiteProfileProvider initialProfile={initialSiteProfile}>
              <DomEventRejectionGuardHost />
              <RouteNavigationRecoveryHost />
              <ProfileOnboardingRedirect />
              <TelegramWebAppViewportHost />
              {/* Fixed full-viewport background — persists across route changes */}
              <LayoutInfiniteGrid />
              {/* Content above grid — z-index avoids iOS WebKit painting fixed canvas behind body bg */}
              <div className="nexus-page-stack relative z-1 flex min-h-dvh flex-1 flex-col">
                <HeaderSessionBridge />
                <ProfileMemberTelegramBanner />
                <main className="flex min-h-0 flex-1 flex-col">
                  {children}
                </main>
                <FooterSessionBridge />
                <SiteNotificationToastStack />
                <WebNotificationPermissionPromptHost />
                <NexusImageCropHost />
              </div>
            </SiteProfileProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
