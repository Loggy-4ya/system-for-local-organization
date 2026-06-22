/**
 * @fileoverview Publisher invite redemption landing page.
 *
 * Visiting `/pages/join/[token]` adds the signed-in user as a delegated editor
 * and redirects into the Puck editor for that page.
 *
 * @module src/app/pages/join/[token]/page
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { PageDomain, PageDomainError } from "@shared/domains/PageDomain";
import { auth } from "@/auth";
import { StaticPageShell } from "@/components/ui/StaticPageShell";

/**
 * Redeem a publisher invite token or show a readable error panel.
 *
 * @param props - Route params.
 * @returns Redirect or static error UI.
 */
export default async function PagePublisherJoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: rawToken } = await params;
  const token = decodeURIComponent(rawToken ?? "").trim();
  const joinPath = `/pages/join/${encodeURIComponent(token)}`;

  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(joinPath)}`);
  }

  try {
    const { pagePath, alreadyMember } = await PageDomain.redeemPublisherInvite(
      token,
      session.user.id,
    );
    redirect(`${pagePath}/edit${alreadyMember ? "?joined=already" : "?joined=1"}`);
  } catch (err) {
    if (err instanceof PageDomainError) {
      return (
        <StaticPageShell contentWidth="md" innerClassName="py-10">
          <div className="glass-panel mx-auto max-w-lg p-6">
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
              Publisher invite
            </h1>
            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">{err.message}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pages"
                className="inline-flex items-center rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                Open Page Manager
              </Link>
              <Link
                href="/profile"
                className="inline-flex items-center rounded-md border border-[var(--color-border-subtle)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
              >
                Go to profile
              </Link>
            </div>
          </div>
        </StaticPageShell>
      );
    }

    throw err;
  }
}
