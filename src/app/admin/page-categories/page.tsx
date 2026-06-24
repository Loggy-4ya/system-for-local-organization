/**
 * @fileoverview Legacy redirect — catalog editor lives on `/pages/edit`.
 *
 * @module src/app/admin/page-categories/page
 */

import { redirect } from "next/navigation";

/**
 * Redirect `/admin/page-categories` → `/pages/edit`.
 */
export default function LegacyPageCategoriesAdminRedirect() {
  redirect("/pages/edit");
}
