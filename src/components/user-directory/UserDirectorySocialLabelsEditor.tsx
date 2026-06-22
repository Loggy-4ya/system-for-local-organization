"use client";

/**
 * @fileoverview Admin editor for social-life discovery labels on a directory user.
 *
 * Socium roles, group activities, and external organizations are **searchable labels**
 * for finding students with shared interests — not hierarchy or permission controls.
 *
 * @module src/components/user-directory/UserDirectorySocialLabelsEditor
 */

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { slugifyAcademicCatalogLabel } from "@shared/lib/academicCatalogLogic";
import type { IUserOrganizationMembership, IUserSocialGroupActivity, IUserSociumRole } from "@shared/models/userTypes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

/** Props for {@link UserDirectorySocialLabelsEditor}. */
export interface UserDirectorySocialLabelsEditorProps {
  /** Socium role labels (student-life roles). */
  sociumRoles: IUserSociumRole[];
  /** Club / team / activity labels. */
  activities: IUserSocialGroupActivity[];
  /** External organization labels. */
  organizations: IUserOrganizationMembership[];
  /** Called when any label list changes. */
  onSociumRolesChange: (next: IUserSociumRole[]) => void;
  onActivitiesChange: (next: IUserSocialGroupActivity[]) => void;
  onOrganizationsChange: (next: IUserOrganizationMembership[]) => void;
  /** When false, socium role inputs are hidden. */
  canEditSocium?: boolean;
  /** When false, activity and organization inputs are hidden. */
  canEditAffiliations?: boolean;
  disabled?: boolean;
  /** When true, omit outer section heading (parent provides "Personal fields" wrapper). */
  nested?: boolean;
}

/**
 * Build a stable catalog key from a human-readable label.
 *
 * @param label - Display label typed by an admin.
 * @returns Slug key or null when empty.
 */
function labelToKey(label: string): string | null {
  const slug = slugifyAcademicCatalogLabel(label);
  return slug || null;
}

/**
 * Single label row — badge list plus one-line add field.
 *
 * @param props - Section config.
 * @returns Label editor subsection.
 */
function LabelTagSection({
  title,
  emptyText,
  placeholder,
  labels,
  onAdd,
  onRemove,
  disabled,
}: {
  title: string;
  emptyText: string;
  placeholder: string;
  labels: string[];
  onAdd: (label: string) => void;
  onRemove: (index: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="flex flex-wrap gap-2">
        {labels.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          labels.map((label, index) => (
            <Badge key={`${title}-${label}-${index}`} variant="outline" className="gap-1.5 py-1 px-2.5">
              <span>{label}</span>
              {!disabled ? (
                <button
                  type="button"
                  onClick={() => onRemove(index)}
                  className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                  aria-label={`Remove ${label}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </Badge>
          ))
        )}
      </div>
      {!disabled ? (
        <div className="flex flex-col gap-3 bg-panel/10 p-4 rounded-lg border border-border sm:flex-row sm:items-end">
          <FormField label="Label" htmlFor={`social-label-${title}`} className="flex-1">
            <Input
              id={`social-label-${title}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={placeholder}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleAdd();
                }
              }}
            />
          </FormField>
          <Button type="button" onClick={handleAdd} size="icon" className="h-9 w-9 shrink-0">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Social-life discovery label editor for the User Directory detail pane.
 *
 * @param props - See {@link UserDirectorySocialLabelsEditorProps}.
 * @returns Grouped label editors or null when the actor cannot edit any category.
 */
export function UserDirectorySocialLabelsEditor({
  sociumRoles,
  activities,
  organizations,
  onSociumRolesChange,
  onActivitiesChange,
  onOrganizationsChange,
  canEditSocium = false,
  canEditAffiliations = false,
  disabled = false,
  nested = false,
}: UserDirectorySocialLabelsEditorProps) {
  if (!canEditSocium && !canEditAffiliations) {
    return null;
  }

  const addSociumLabel = (label: string) => {
    const key = labelToKey(label);
    if (!key) return;
    if (sociumRoles.some((role) => role.roleKey === key)) return;

    onSociumRolesChange([
      ...sociumRoles,
      {
        roleKey: key,
        roleLabel: label.trim(),
        kind: "custom",
        source: "admin",
        assignedAt: new Date(),
      },
    ]);
  };

  const addActivityLabel = (label: string) => {
    const key = labelToKey(label);
    if (!key) return;
    if (activities.some((activity) => activity.activityKey === key)) return;

    onActivitiesChange([
      ...activities,
      {
        activityKey: key,
        activityLabel: label.trim(),
        assignedAt: new Date(),
      },
    ]);
  };

  const addOrganizationLabel = (label: string) => {
    const key = labelToKey(label);
    if (!key) return;
    if (organizations.some((org) => org.organizationKey === key)) return;

    onOrganizationsChange([
      ...organizations,
      {
        organizationKey: key,
        organizationLabel: label.trim(),
        assignedAt: new Date(),
      },
    ]);
  };

  return (
    <div className={nested ? "flex flex-col gap-6" : "flex flex-col gap-6 border-t border-border pt-6"}>
      {!nested ? (
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-foreground">Social life labels</h3>
          <p className="text-xs text-muted-foreground">
            Searchable tags for clubs, teams, and groups — used to find people with similar student-life
            interests. These labels do not grant access or change hierarchy.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h4 className="text-sm font-medium text-foreground">Social life labels</h4>
          <p className="text-xs text-muted-foreground">
            Searchable tags for clubs, teams, and groups.
          </p>
        </div>
      )}

      {canEditSocium ? (
        <LabelTagSection
          title="Socium & student-life"
          emptyText="No socium labels yet."
          placeholder="e.g. Sector Head, Debate club"
          labels={sociumRoles.map((role) => role.roleLabel)}
          onAdd={addSociumLabel}
          onRemove={(index) => onSociumRolesChange(sociumRoles.filter((_, i) => i !== index))}
          disabled={disabled}
        />
      ) : null}

      {canEditAffiliations ? (
        <>
          <LabelTagSection
            title="Group activities"
            emptyText="No activity labels yet."
            placeholder="e.g. Football club"
            labels={activities.map((activity) => activity.activityLabel)}
            onAdd={addActivityLabel}
            onRemove={(index) => onActivitiesChange(activities.filter((_, i) => i !== index))}
            disabled={disabled}
          />

          <LabelTagSection
            title="External organizations"
            emptyText="No organization labels yet."
            placeholder="e.g. Red Cross volunteer"
            labels={organizations.map((org) => org.organizationLabel)}
            onAdd={addOrganizationLabel}
            onRemove={(index) => onOrganizationsChange(organizations.filter((_, i) => i !== index))}
            disabled={disabled}
          />
        </>
      ) : null}
    </div>
  );
}
