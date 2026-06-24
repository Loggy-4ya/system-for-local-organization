/**
 * @fileoverview Nexus root homepage — code-only marketing landing (not Puck-managed).
 *
 * @module src/app/page
 */

import type { Metadata } from "next";
import { HomeLandingShell } from "@/components/marketing/HomeLandingShell";

/** Document metadata for the public homepage. */
export const metadata: Metadata = {
  title: "Nexus — Institutional Management Platform",
  description:
    "A scalable platform for student councils — visual pages, task tracking, profiles, and Telegram automation in one place.",
};

/**
 * Site entry point — brief platform overview with a link to the public page catalog.
 *
 * @returns Homepage JSX inside global header/footer chrome.
 */
export default function HomePage() {
  return <HomeLandingShell />;
}
