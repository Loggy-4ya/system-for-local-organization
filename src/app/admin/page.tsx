/**
 * @fileoverview Admin root redirect page.
 *
 * Redirects authenticated Admins from `/admin` to `/admin/global-layout`.
 *
 * @module src/app/admin/page
 */

import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Admin root page — redirects to Global Layout editor.
 */
export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== "Admin") {
    redirect("/profile");
  }

  redirect("/admin/global-layout");
}
