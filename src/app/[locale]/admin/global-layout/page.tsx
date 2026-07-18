/**
 * @fileoverview Admin page for managing global layout (header and footer).
 *
 * Server component. Fetches current Global Layout configuration and renders
 * the interactive editor shell. Protected by Admin role check.
 *
 * @module src/app/admin/global-layout/page
 */

import React from "react";
import { setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/serverRedirect";
import { auth } from "@/auth";
import { GlobalLayoutDomain } from "@shared/domains/GlobalLayoutDomain";
import { GlobalLayoutEditorShell } from "@/components/global-layout/GlobalLayoutEditorShell";

/**
 * Global Layout Admin Page.
 *
 * @param props - Locale route params.
 * @returns Server-rendered editor page.
 */
export default async function GlobalLayoutAdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();

  if (session?.user?.role !== "Admin") {
    return await redirect("/profile");
  }

  const doc = await GlobalLayoutDomain.loadOrSeed();
  const config = GlobalLayoutDomain.toPublicConfig(doc);

  return <GlobalLayoutEditorShell initialConfig={config} />;
}
