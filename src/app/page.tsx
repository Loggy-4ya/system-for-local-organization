/**
 * @fileoverview Nexus root homepage — redirects to the public pages catalog.
 *
 * @module src/app/page
 */

import { redirect } from "next/navigation";

/**
 * Site entry point — public pages-by-category catalog.
 *
 * @returns Never renders; redirects to {@link /pages/categories}.
 */
export default function HomePage() {
  redirect("/pages/categories");
}
