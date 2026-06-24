/**
 * @fileoverview Legacy redirect — catalog editor lives on `/pages/edit`.
 *
 * @module src/app/pages/categories/edit/page
 */

import { redirect } from "next/navigation";

/**
 * Redirect `/pages/categories/edit` → `/pages/edit`.
 */
export default function LegacyPageCategoriesEditRedirect() {
  redirect("/pages/edit");
}
