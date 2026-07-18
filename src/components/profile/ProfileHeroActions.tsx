/**
 * @fileoverview Profile hero action buttons — edit, message, share public link.
 *
 * @module src/components/profile/ProfileHeroActions
 */

"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Mail, MessageCircle, Pencil } from "lucide-react";
import type { ProfileContactOptions } from "@shared/lib/profileContactLogic";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Props for {@link ProfileHeroActions}. */
export interface ProfileHeroActionsProps {
  /** Whether the viewer is the profile owner. */
  isSelf: boolean;
  /** Absolute public profile path (`/users/{id}`). */
  publicProfilePath: string;
  /** Resolved outbound contact channels for messaging. */
  contact: ProfileContactOptions;
}

/**
 * Hero action cluster — settings for self, message + share for other members.
 *
 * @param props - Viewer context and contact channels.
 * @returns Action button row JSX.
 */
export function ProfileHeroActions({
  isSelf,
  publicProfilePath,
  contact,
}: ProfileHeroActionsProps) {
  const t = useTranslations("profile.actions");
  const [copied, setCopied] = useState(false);

  /** Copy the canonical public profile URL to the clipboard. */
  async function handleCopyProfileLink() {
    const url = `${window.location.origin}${publicProfilePath}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const primaryContact = contact.channels[0] ?? null;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!isSelf && primaryContact && (
        <a
          href={primaryContact.href}
          target={primaryContact.kind === "email" ? undefined : "_blank"}
          rel={primaryContact.kind === "email" ? undefined : "noopener noreferrer"}
          className={cn(buttonVariants({ size: "sm" }), "inline-flex gap-1.5")}
        >
          {primaryContact.kind === "email" ? (
            <Mail className="size-3.5" aria-hidden="true" />
          ) : (
            <MessageCircle className="size-3.5" aria-hidden="true" />
          )}
          {t("message")}
        </a>
      )}

      {!isSelf && !contact.hasAny && (
        <Button size="sm" type="button" variant="outline" disabled title={t("noContactTitle")}>
          {t("messageUnavailable")}
        </Button>
      )}

      <Button
        size="sm"
        type="button"
        variant="outline"
        className="gap-1.5"
        onClick={() => void handleCopyProfileLink()}
      >
        {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
        {copied ? t("copied") : t("copyLink")}
      </Button>

      {isSelf && (
        <Link href="/profile/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <Pencil className="size-3.5" aria-hidden="true" />
          {t("editProfile")}
        </Link>
      )}
    </div>
  );
}

export default ProfileHeroActions;
