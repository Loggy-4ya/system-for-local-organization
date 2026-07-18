/**
 * @fileoverview Root layout passthrough — html/body live under `[locale]/layout.tsx`.
 *
 * @module src/app/layout
 */

/**
 * Minimal root layout required by Next.js App Router.
 *
 * @param props - Root layout props.
 * @returns Locale subtree unchanged.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
