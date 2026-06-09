/**
 * @fileoverview Theme provider re-export for Project Nexus.
 *
 * The root layout uses `@teispace/next-themes` directly with a server-rendered
 * anti-FOUC script in `<head>` (React 19 / Next.js 16 compatible). This module
 * re-exports the provider for any nested or route-group layouts that need it.
 *
 * @module src/components/ui/ThemeProvider
 */

export { ThemeProvider } from "@teispace/next-themes";
export type { ThemeProviderProps } from "@teispace/next-themes";
