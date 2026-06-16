"use client";

/**
 * @fileoverview Floating action button that opens Puck edit mode for a CMS page.
 *
 * Portaled into `.nexus-page-stack` (not `document.body`) so its z-index competes
 * inside the same stacking context as the fixed header and mobile sidebar drawer.
 *
 * Tests: `tests/lib/pageEditAccess.test.ts` — `npm run test:page-edit-access`
 *
 * @module src/components/puck/PageEditFab
 */

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Pencil } from "lucide-react";
import { shouldShowPageEditFab } from "@/lib/pageEditAccess";

/** Root page stack — FAB must portal here to share z-index context with site chrome. */
const PAGE_STACK_PORTAL_SELECTOR = ".nexus-page-stack";

/** Props for {@link PageEditFab}. */
export interface PageEditFabProps {
  /** Absolute page path (e.g. `/news`). */
  pagePath: string;
  /** Server-rendered visibility hint from {@link shouldShowPageEditFab}. */
  serverVisible?: boolean;
}

/**
 * Fixed bottom-right control that navigates to `/<slug>/edit`.
 *
 * @param props - See {@link PageEditFabProps}.
 * @returns Portaled floating edit link, or null when hidden.
 */
export function PageEditFab({ pagePath, serverVisible = false }: PageEditFabProps) {
  const [mounted, setMounted] = useState(false);
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    setPortalHost(document.querySelector(PAGE_STACK_PORTAL_SELECTOR));
    setMounted(true);
  }, []);

  const clientVisible = shouldShowPageEditFab(session, pagePath, false);
  const visible =
    serverVisible ||
    (status !== "unauthenticated" && clientVisible);

  if (!pagePath || pagePath === "/" || !visible || !mounted || !portalHost) {
    return null;
  }

  const editHref = `${pagePath}/edit`;

  return createPortal(
    <Link
      href={editHref}
      className="nexus-page-edit-fab"
      aria-label="Edit this page"
      title="Edit this page"
    >
      <span className="nexus-page-edit-fab__icon" aria-hidden="true">
        <Pencil size={18} strokeWidth={2.25} />
      </span>
      <span className="nexus-page-edit-fab__label">Edit</span>
    </Link>,
    portalHost,
  );
}

export default PageEditFab;
