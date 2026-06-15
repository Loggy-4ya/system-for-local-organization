/**
 * @fileoverview Admin page for managing global layout (header and footer).
 *
 * Server component. Fetches current Global Layout configuration and renders
 * the interactive editor shell. Protected by Admin role check.
 *
 * @module src/app/admin/global-layout/page
 */

import React from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GlobalLayoutDomain } from "@shared/domains/GlobalLayoutDomain";
import { GlobalLayoutEditorShell } from "@/components/global-layout/GlobalLayoutEditorShell";

/**
 * Global Layout Admin Page.
 *
 * @returns Server-rendered editor page.
 */
export default async function GlobalLayoutAdminPage() {
  const session = await auth();

  // Double-check authorization inside the page component
  if (session?.user?.role !== "Admin") {
    redirect("/profile");
  }

  // Fetch current global layout config (or seed defaults)
  const doc = await GlobalLayoutDomain.loadOrSeed();
  const config = GlobalLayoutDomain.toPublicConfig(doc);

  return <GlobalLayoutEditorShell initialConfig={config} />;
}
