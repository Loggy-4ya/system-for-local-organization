/**
 * @fileoverview Locale-aware navigation helpers wrapping Next.js App Router APIs.
 *
 * Client-safe exports only. Server redirects live in {@link ./serverRedirect}.
 *
 * @module src/i18n/navigation
 */

import { createNavigation } from "next-intl/navigation";
import { routing } from "@/i18n/routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
