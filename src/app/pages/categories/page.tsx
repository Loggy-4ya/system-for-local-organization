/**
 * @fileoverview Legacy redirect — catalog lives on `/pages`.
 *
 * @module src/app/pages/categories/page
 */

import { redirect } from "next/navigation";

/**
 * Redirect `/pages/categories` → `/pages`.
 */
export default function LegacyPageCategoriesRedirect() {
  redirect("/pages");
}
