"use client";

/**
 * @fileoverview Personal fields panel for User Directory admin detail — identity grid and social labels.
 *
 * Groups read-only contact/OAuth fields with editable social-life discovery labels under one
 * "Personal fields" section.
 *
 * @module src/components/user-directory/UserDirectoryPersonalFields
 */

import React from "react";
import { Link2, Mail, Phone, Send, User } from "lucide-react";
import type { DirectoryUserRow } from "@shared/lib/directoryRedaction";
import type { IUserOrganizationMembership, IUserSocialGroupActivity, IUserSociumRole } from "@shared/models/userTypes";
import { UserDirectorySocialLabelsEditor } from "@/components/user-directory/UserDirectorySocialLabelsEditor";

/**
 * Whether redactable PII fields are exposed on a directory row.
 *
 * @param row - Directory user row.
 * @returns True when login/email/phone/OAuth link flags are visible.
 */
function directoryPiiVisible(row: DirectoryUserRow): boolean {
  return row.login !== null;
}

/**
 * Format read-only OAuth link status for the admin contact grid.
 *
 * @param linked - Link flag from {@link DirectoryUserRow}; null when redacted.
 * @returns Human-readable linked / redacted label (never exposes provider tokens).
 */
function formatOAuthLinkStatus(linked: boolean | null): string {
  if (linked === null) return "Redacted / Hidden";
  return linked ? "Linked" : "Not linked";
}

/**
 * Format Telegram linkage for the admin contact grid.
 *
 * @param telegramId - Numeric Telegram id when visible.
 * @param piiVisible - Whether the actor can see PII for this target.
 * @returns Telegram id or linkage label without OAuth tokens.
 */
function formatTelegramDirectoryStatus(telegramId: number | null, piiVisible: boolean): string {
  if (!piiVisible) return "Redacted / Unlinked";
  return telegramId ? String(telegramId) : "Not linked";
}

/** Props for {@link UserDirectoryPersonalFields}. */
export interface UserDirectoryPersonalFieldsProps {
  /** Selected directory user row. */
  user: DirectoryUserRow;
  /** Socium role labels (student-life roles). */
  sociumRoles: IUserSociumRole[];
  /** Club / team / activity labels. */
  activities: IUserSocialGroupActivity[];
  /** External organization labels. */
  organizations: IUserOrganizationMembership[];
  /** Called when socium roles change. */
  onSociumRolesChange: (next: IUserSociumRole[]) => void;
  /** Called when activities change. */
  onActivitiesChange: (next: IUserSocialGroupActivity[]) => void;
  /** Called when organizations change. */
  onOrganizationsChange: (next: IUserOrganizationMembership[]) => void;
  /** When false, socium role inputs are hidden. */
  canEditSocium?: boolean;
  /** When false, activity and organization inputs are hidden. */
  canEditAffiliations?: boolean;
  /** When true, social label inputs are disabled. */
  disabled?: boolean;
}

/**
 * Personal fields section — identity/contact grid plus social-life discovery labels.
 *
 * @param props - See {@link UserDirectoryPersonalFieldsProps}.
 * @returns Personal fields panel JSX.
 */
export function UserDirectoryPersonalFields({
  user,
  sociumRoles,
  activities,
  organizations,
  onSociumRolesChange,
  onActivitiesChange,
  onOrganizationsChange,
  canEditSocium = false,
  canEditAffiliations = false,
  disabled = false,
}: UserDirectoryPersonalFieldsProps) {
  const piiVisible = directoryPiiVisible(user);
  const showSocialLabels = canEditSocium || canEditAffiliations;

  return (
    <div className="flex flex-col gap-6 border-b border-border pb-6">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-foreground">Personal fields</h3>
        <p className="text-xs text-muted-foreground">
          Identity, contact, and linked accounts. Social-life labels help discover students with
          shared interests — they do not grant access or change hierarchy.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-panel/20 p-4 sm:grid-cols-2">
        <div className="flex min-w-0 items-center gap-3">
          <User className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Login Handle</p>
            <p className="truncate text-sm font-medium text-foreground">
              {user.login || "Redacted / Hidden"}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Email Address</p>
            <p className="truncate text-sm font-medium text-foreground">
              {user.email || "Redacted / Hidden"}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone Number</p>
            <p className="truncate text-sm font-medium text-foreground">
              {user.phone || "Redacted / Hidden"}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Send className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Telegram</p>
            <p className="truncate text-sm font-medium text-foreground">
              {formatTelegramDirectoryStatus(user.telegramId, piiVisible)}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Google OAuth</p>
            <p className="truncate text-sm font-medium text-foreground">
              {formatOAuthLinkStatus(user.linkedGoogle)}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Link2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Apple OAuth</p>
            <p className="truncate text-sm font-medium text-foreground">
              {formatOAuthLinkStatus(user.linkedApple)}
            </p>
          </div>
        </div>
      </div>

      {showSocialLabels ? (
        <UserDirectorySocialLabelsEditor
          sociumRoles={sociumRoles}
          activities={activities}
          organizations={organizations}
          onSociumRolesChange={onSociumRolesChange}
          onActivitiesChange={onActivitiesChange}
          onOrganizationsChange={onOrganizationsChange}
          canEditSocium={canEditSocium}
          canEditAffiliations={canEditAffiliations}
          disabled={disabled}
          nested
        />
      ) : null}
    </div>
  );
}
