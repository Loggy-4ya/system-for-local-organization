/**
 * @fileoverview Legacy redirect — news catalog categories moved to Page Manager.
 *
 * @module src/app/admin/page-categories/page
 */

import { redirect } from "next/navigation";

/**
 * Redirect `/admin/page-categories` → `/pages/categories`.
 */
export default function LegacyPageCategoriesAdminRedirect() {
  redirect("/pages/categories/edit");
}
