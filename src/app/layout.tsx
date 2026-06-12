import type { Metadata } from "next";
import Script from "next/script";
import { Inter, JetBrains_Mono, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "@teispace/next-themes";
import { getTheme, getThemeScript } from "@teispace/next-themes/server";
import { InfiniteGrid } from "@/components/background/InfiniteGrid";
import { GlobalHeader } from "@/components/ui/GlobalHeader";
import { SITE_ICONS } from "@/lib/assets";
import "./globals.css";

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
  const initialTheme = await getTheme({ themes: THEME_CONFIG.themes });
  const themeScript = getThemeScript({
    ...THEME_CONFIG,
    initialTheme: initialTheme ?? undefined,
  });

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/*
          beforeInteractive: Next.js injects this before hydration (React 19 rejects
          raw <script> in component trees). Pair with ThemeProvider noScript below.
        */}
        <Script id="nexus-theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider
          {...THEME_CONFIG}
          initialTheme={initialTheme ?? undefined}
          noScript
          disableTransitionOnChange={false}
        >
          {/* Fixed full-viewport background — persists across route changes */}
          <InfiniteGrid />
          {/* Global header — persists across all routes */}
          <GlobalHeader />
          <main className="flex flex-1 flex-col">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
