/**
 * @fileoverview Profile hero action buttons — edit, message, share public link.
 *
 * @module src/components/profile/ProfileHeroActions
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Copy, Mail, MessageCircle, Pencil } from "lucide-react";
import type { ProfileContactOptions } from "@shared/lib/profileContactLogic";
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
          Message
        </a>
      )}

      {!isSelf && !contact.hasAny && (
        <Button size="sm" type="button" variant="outline" disabled title="No contact method on this profile">
          Message unavailable
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
        {copied ? "Copied" : "Copy link"}
      </Button>

      {isSelf && (
        <Link href="/profile/settings" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
          <Pencil className="size-3.5" aria-hidden="true" />
          Edit profile
        </Link>
      )}
    </div>
  );
}

export default ProfileHeroActions;
