import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@teispace/next-themes";
import { getTheme, getThemeScript } from "@teispace/next-themes/server";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { LayoutInfiniteGrid } from "@/components/background/LayoutInfiniteGrid";
import { HeaderSessionBridge } from "@/components/ui/HeaderSessionBridge";
import { FooterSessionBridge } from "@/components/ui/FooterSessionBridge";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { SiteProfileProvider } from "@/components/auth/SiteProfileProvider";
import { BootstrapInlineScriptsHost } from "@/components/navigation/BootstrapInlineScriptsHost";
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
import { routing } from "@/i18n/routing";
import { auth } from "@/auth";
import { seedAdminUser } from "@shared/lib/seedAdminUser";
import "../globals.css";
import "../page-catalog.css";

/** Shared theme configuration — kept in sync between layout script and provider. */
const THEME_CONFIG = {
  attribute: "data-theme" as const,
  defaultTheme: "dark",
  enableSystem: true,
  themes: ["light", "dark", "system"],
};

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif-face",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-face",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const fontVariables = `${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`;

/** Document metadata defaults — per-page routes override title/description. */
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
 * Pre-render static params for each supported locale.
 *
 * @returns Locale segment values for static generation.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * @fileoverview Locale-aware root layout for Project Nexus.
 *
 * Wraps the app with next-intl, theme, session, and global chrome (header/footer).
 */
export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  seedAdminUser().catch((err) => console.error("[LocaleLayout] Seeding error:", err));

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

  const messages = await getMessages();

  /** Brave / wallet extensions may assign to `window.ethereum` before injection completes. */
  const walletProviderShim = `(function(){try{if(typeof window!=="undefined"&&!window.ethereum){window.ethereum={selectedAddress:void 0}}}catch(e){}})();`;

  return (
    <html lang={locale} className={fontVariables} data-theme={ssrDataTheme} suppressHydrationWarning>
      <head suppressHydrationWarning>
        {cspNonce ? <meta name="csp-nonce" content={cspNonce} /> : null}
      </head>
      <body className="flex min-h-dvh flex-col touch-manipulation" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            {...THEME_CONFIG}
            initialTheme={initialTheme ?? undefined}
            noScript
            disableTransitionOnChange={false}
          >
            <SessionProvider session={session}>
              <SiteProfileProvider initialProfile={initialSiteProfile}>
                {/*
                  Stream early bootstrap scripts via useServerInsertedHTML — not as layout
                  children. React 19 warns on raw <script> / next/script in the render tree.
                */}
                <BootstrapInlineScriptsHost
                  cspNonce={cspNonce}
                  domEventGuardScript={NEXUS_DOM_EVENT_REJECTION_GUARD_INLINE_SCRIPT}
                  walletProviderShim={walletProviderShim}
                  themeScript={themeScript}
                />
                <DomEventRejectionGuardHost />
                <RouteNavigationRecoveryHost />
                <ProfileOnboardingRedirect />
                <TelegramWebAppViewportHost />
                <LayoutInfiniteGrid />
                <div className="nexus-page-stack relative z-1 flex min-h-dvh flex-1 flex-col">
                  <HeaderSessionBridge />
                  <ProfileMemberTelegramBanner />
                  <main className="flex min-h-0 flex-1 flex-col">{children}</main>
                  <FooterSessionBridge />
                  <SiteNotificationToastStack />
                  <WebNotificationPermissionPromptHost />
                  <NexusImageCropHost />
                </div>
              </SiteProfileProvider>
            </SessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
