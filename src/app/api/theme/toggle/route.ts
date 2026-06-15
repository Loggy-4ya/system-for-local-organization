/**
 * @fileoverview Server-side theme toggle for touch browsers that skip button clicks.
 *
 * Sets the `theme` cookie and redirects back to the referring page.
 *
 * @module src/app/api/theme/toggle/route
 */

import { getTheme, writeThemeCookie } from "@teispace/next-themes/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const THEME_OPTIONS = ["light", "dark", "system"] as const;

/**
 * Flip between light and dark theme, then redirect to the same-origin referer.
 *
 * @returns Never — always redirects.
 */
export async function GET() {
  const headerStore = await headers();
  const current =
    (await getTheme({ themes: [...THEME_OPTIONS], headers: headerStore })) ?? "dark";
  const next = current === "light" ? "dark" : "light";

  await writeThemeCookie(next);

  const referer = headerStore.get("referer");
  const host = headerStore.get("host");

  let redirectUrl: string | null = null;

  if (referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) {
        redirectUrl = `${refererUrl.pathname}${refererUrl.search}`;
      }
    } catch {
      /* ignore parsing error */
    }
  }

  if (redirectUrl) {
    redirect(redirectUrl);
  }

  redirect("/");
}
