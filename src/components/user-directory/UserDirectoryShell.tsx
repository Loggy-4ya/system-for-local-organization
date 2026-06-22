"use client";

/**
 * @fileoverview Client-side shell for the institutional User Directory.
 *
 * Provides search, filtering, detailed view, and secure administrative mutations
 * (hierarchy assignment, socium roles, affiliations, and permission delegation).
 *
 * @module src/components/user-directory/UserDirectoryShell
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Search,
  Users,
  Check,
  User,
} from "lucide-react";
import {
  PERMISSION_LABELS,
  type AccessControlSettingsConfig,
  type AccessLevelIndex,
  type PermissionKey,
} from "@shared/constants/accessControl";
import type { PublicUser } from "@shared/domains/AuthDomain";
import type { DirectoryUserRow } from "@shared/lib/directoryRedaction";
import { formatAcademicGroupSpecialtyLabel } from "@shared/lib/academicCatalogLogic";
import { DEFAULT_LIST_PAGE_SIZE } from "@shared/constants/listPagination";
import { computePageRowRange } from "@shared/lib/listPaginationLogic";
import { resolveEffectivePermissions } from "@shared/lib/accessControlLogic";
import { AdminEditorActionToolbar } from "@/components/admin/AdminEditorActionToolbar";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NexusListPagination } from "@/components/ui/NexusListPagination";
import { PuckSelectField } from "@/components/puck/fields/PuckSelectField";
import { GlobalLayoutEditorStatusBanner } from "@/components/global-layout/GlobalLayoutEditorStatusBanner";
import {
  UserDirectoryProfileFields,
  profileEditStateFromDirectoryUser,
  type UserDirectoryProfileEditState,
} from "@/components/user-directory/UserDirectoryProfileFields";
import {
  buildDirectoryProfileSavePatch,
  directoryRowRequiresMemberPhone,
  resolveDirectoryEffectiveSociumRoles,
  resolveDirectoryPhoneForSave,
  validateDirectorySaveProfileRequirements,
} from "@shared/lib/userDirectorySaveLogic";
import { PROFILE_PHONE_REQUIRED_ERROR } from "@shared/lib/userProfileCompleteness";
import { autocorrectPhoneFieldValue } from "@/lib/phoneInputProps";
import { UserDirectoryPersonalFields } from "@/components/user-directory/UserDirectoryPersonalFields";
import {
  editSnapshotFromDirectoryUser,
  isDirectoryUserEditDirty,
  UserDirectoryDetailCache,
  type DirectoryUserEditSnapshot,
} from "@/components/user-directory/lib/userDirectoryDetailState";
import { cn } from "@/lib/utils";
import "@/app/global-layout-editor.css";

/** Read the live phone input value when React state lags browser autofill. */
function readDirectoryPhoneDomValue(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const element = document.getElementById("directory-phone");
  if (!(element instanceof HTMLInputElement)) return undefined;
  return element.value;
}

/** Props for {@link UserDirectoryShell}. */
export interface UserDirectoryShellProps {
  initialConfig: AccessControlSettingsConfig;
  currentUser: PublicUser;
  /** Whether the actor may assign levels, roles, affiliations, or delegations. */
  canMutateDirectory: boolean;
  /** Legacy Admin — may open `/admin/logs` user-directory section. */
  canViewSystemLogs?: boolean;
}

/**
 * User Directory admin shell.
 */
export function UserDirectoryShell({
  initialConfig,
  currentUser,
  canMutateDirectory,
  canViewSystemLogs = false,
}: UserDirectoryShellProps) {
  // Directory list state
  const [users, setUsers] = useState<DirectoryUserRow[]>([]);
  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Selected user detail state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<DirectoryUserRow | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Edit form state
  const [editLevel, setEditLevel] = useState<number>(6);
  const [editDelegated, setEditDelegated] = useState<PermissionKey[]>([]);
  const [editSociumRoles, setEditSociumRoles] = useState<any[]>([]);
  const [editActivities, setEditActivities] = useState<any[]>([]);
  const [editOrgs, setEditOrganizations] = useState<any[]>([]);
  const [editProfile, setEditProfile] = useState<UserDirectoryProfileEditState | null>(null);
  const [profileEditBaseline, setProfileEditBaseline] = useState<UserDirectoryProfileEditState | null>(null);
  const [profileFieldErrors, setProfileFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status banners
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  /** Session-scoped detail cache — avoids repeated GET when revisiting users in the roster. */
  const detailCacheRef = useRef(new UserDirectoryDetailCache());

  /**
   * Apply a directory detail row to all controlled edit fields.
   *
   * @param data - Loaded or cached directory user row.
   */
  const applyDetailToEditState = useCallback((data: DirectoryUserRow) => {
    const snapshot = editSnapshotFromDirectoryUser(data);
    setEditLevel(snapshot.level);
    setEditDelegated(snapshot.delegated);
    setEditSociumRoles(snapshot.sociumRoles);
    setEditActivities(snapshot.activities);
    setEditOrganizations(snapshot.organizations);
    setEditProfile(snapshot.profile);
    setProfileEditBaseline(snapshot.profile);
    setProfileFieldErrors({});
  }, []);

  /**
   * Current edit snapshot for dirty checks before switching users.
   */
  const currentEditSnapshot = useMemo((): DirectoryUserEditSnapshot | null => {
    if (!editProfile) return null;
    return {
      level: editLevel,
      delegated: editDelegated,
      sociumRoles: editSociumRoles,
      activities: editActivities,
      organizations: editOrgs,
      profile: editProfile,
    };
  }, [editLevel, editDelegated, editSociumRoles, editActivities, editOrgs, editProfile]);

  // Clear status banner after timeout
  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  // Fetch users list (one page at a time — never accumulate the full collection client-side)
  const fetchUsers = useCallback(
    async (searchQuery: string, levelVal: string, pageNum: number) => {
      setIsLoading(true);

      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.append("q", searchQuery.trim());
        if (levelVal !== "all") params.append("level", levelVal);
        params.append("page", String(pageNum));
        params.append("limit", String(DEFAULT_LIST_PAGE_SIZE));

        const res = await fetch(`/api/admin/users?${params.toString()}`);
        if (res.status === 401 || res.status === 403) {
          setUsers([]);
          setTotalPages(1);
          setTotalCount(0);
          setStatus({
            type: "error",
            message: "You do not have permission to view the user directory.",
          });
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch users.");

        const data = await res.json();
        setUsers(data.users);
        setPage(data.page ?? pageNum);
        setTotalPages(data.totalPages ?? 1);
        setTotalCount(data.totalCount ?? data.users.length);
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Failed to load user directory." });
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Reset to page 1 when search or level filter changes
  useEffect(() => {
    setPage(1);
  }, [q, levelFilter]);

  // Initial load & search/filter/page triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(q, levelFilter, page);
    }, 300);

    return () => clearTimeout(timer);
  }, [q, levelFilter, page, fetchUsers]);

  // Fetch detailed user info (cached unless force refresh e.g. Reset)
  const fetchUserDetail = useCallback(
    async (userId: string, options?: { force?: boolean }) => {
      const force = options?.force === true;

      if (
        selectedUserId &&
        selectedUserId !== userId &&
        selectedUser &&
        currentEditSnapshot &&
        isDirectoryUserEditDirty(selectedUser, currentEditSnapshot)
      ) {
        const discard = window.confirm(
          "You have unsaved changes for the current user. Discard them and switch?",
        );
        if (!discard) return;
      }

      setSelectedUserId(userId);

      const cached = !force ? detailCacheRef.current.get(userId) : undefined;
      if (cached) {
        setSelectedUser(cached);
        applyDetailToEditState(cached);
        setIsLoadingDetail(false);
        return;
      }

      setIsLoadingDetail(true);
      setSelectedUser(null);

      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        if (res.status === 401 || res.status === 403) {
          setStatus({
            type: "error",
            message: "You do not have permission to view this user.",
          });
          setSelectedUserId(null);
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch user details.");

        const data: DirectoryUserRow = await res.json();
        detailCacheRef.current.set(data);
        setSelectedUser(data);
        applyDetailToEditState(data);
      } catch (err) {
        console.error(err);
        setStatus({ type: "error", message: "Failed to load user details." });
        setSelectedUserId(null);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [selectedUserId, selectedUser, currentEditSnapshot, applyDetailToEditState],
  );

  /** Return to roster list on mobile without clearing search state. */
  const handleBackToRoster = () => {
    setSelectedUserId(null);
    setSelectedUser(null);
    setEditProfile(null);
    setProfileEditBaseline(null);
  };

  // Save updates
  const handleSave = async () => {
    if (!selectedUserId || !selectedUser) return;
    const canEditAccess = canMutateDirectory && selectedUser.canManage;
    const canEditProfileFields = selectedUser.canEditProfile && editProfile;
    const canChangeLevel = selectedUser.canAssignLevel;
    const canChangeSocialLabels =
      selectedUser.canAssignSocium || selectedUser.canAssignAffiliations;
    if (!canEditAccess && !canEditProfileFields && !canChangeLevel && !canChangeSocialLabels) {
      return;
    }

    setIsSaving(true);
    setStatus(null);
    setProfileFieldErrors({});

    try {
      const effectiveSociumRoles = resolveDirectoryEffectiveSociumRoles({
        canAssignSocium: selectedUser.canAssignSocium,
        editSociumRoles,
        storedSociumRoles: selectedUser.sociumRoles,
      });

      const requiresMemberPhone = directoryRowRequiresMemberPhone({
        sociumRoles: effectiveSociumRoles,
        sociumRoleLabels: selectedUser.sociumRoleLabels,
      });

      let profileForSave = editProfile;
      const domPhone = readDirectoryPhoneDomValue();
      if (canEditProfileFields && editProfile) {
        const resolvedPhone = resolveDirectoryPhoneForSave({
          storedPhone: selectedUser.phone,
          editPhone: editProfile.phone,
          domPhone,
          canEditProfile: true,
        });
        const correctedPhone = resolvedPhone ?? autocorrectPhoneFieldValue(domPhone || editProfile.phone);
        if (correctedPhone !== editProfile.phone) {
          profileForSave = { ...editProfile, phone: correctedPhone };
          setEditProfile(profileForSave);
        }
      }

      const profileValidationErrors = validateDirectorySaveProfileRequirements({
        name: selectedUser.name,
        surname: selectedUser.surname,
        specialty: selectedUser.specialty,
        group: selectedUser.group,
        avatar: selectedUser.avatar,
        storedPhone: selectedUser.phone,
        editPhone: profileForSave?.phone,
        domPhone,
        sociumRoles: effectiveSociumRoles,
        sociumRoleLabels: selectedUser.sociumRoleLabels,
        canEditProfile: Boolean(canEditProfileFields),
      });

      if (Object.keys(profileValidationErrors).length > 0) {
        setProfileFieldErrors(profileValidationErrors);
        const primaryMessage =
          profileValidationErrors.phone ?? Object.values(profileValidationErrors)[0];
        setStatus({
          type: "error",
          message: primaryMessage ?? PROFILE_PHONE_REQUIRED_ERROR,
        });
        return;
      }

      const patch: Record<string, unknown> = {};

      if (canEditProfileFields && profileForSave) {
        const resolvedPhone = resolveDirectoryPhoneForSave({
          storedPhone: selectedUser.phone,
          editPhone: profileForSave.phone,
          domPhone: readDirectoryPhoneDomValue(),
          canEditProfile: true,
        });

        Object.assign(
          patch,
          buildDirectoryProfileSavePatch({
            profile: profileForSave,
            profileBaseline:
              profileEditBaseline ?? profileEditStateFromDirectoryUser(selectedUser),
            storedPhone: selectedUser.phone,
            resolvedPhone,
            requiresPhone: requiresMemberPhone,
          }),
        );
      }

      if (canChangeLevel) {
        patch.accessLevelIndex = editLevel;
      }

      if (selectedUser.canAssignSocium) {
        patch.sociumRoles = editSociumRoles;
      }
      if (selectedUser.canAssignAffiliations) {
        patch.socialGroupActivities = editActivities;
        patch.organizations = editOrgs;
      }

      if (canEditAccess) {
        if (selectedUser.canDelegate) {
          patch.delegatedPermissions = editDelegated;
        }
      }

      const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fieldErrors?: Record<string, string>;
        user?: DirectoryUserRow;
      };

      if (!res.ok) {
        if (data.fieldErrors && typeof data.fieldErrors === "object") {
          setProfileFieldErrors(data.fieldErrors);
        }
        setStatus({
          type: "error",
          message: data.error || "Failed to save updates.",
        });
        return;
      }

      setStatus({ type: "success", message: "User access configuration saved successfully." });
      setProfileFieldErrors({});

      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserId ? { ...u, ...data.user } : u)),
      );
      if (data.user) {
        detailCacheRef.current.set(data.user);
        setSelectedUser(data.user);
        applyDetailToEditState(data.user);
      }
    } catch (err) {
      console.error(err);
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save updates.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedUserId || !selectedUser?.canDelete) return;

    const confirmed = window.confirm(
      `Permanently delete ${selectedUser.fullName}'s account? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete user account.");
      }

      setUsers((prev) => prev.filter((user) => user.id !== selectedUserId));
      detailCacheRef.current.delete(selectedUserId);
      setSelectedUserId(null);
      setSelectedUser(null);
      setEditProfile(null);
      setProfileEditBaseline(null);
      setStatus({ type: "success", message: "User account deleted." });
    } catch (err: unknown) {
      console.error(err);
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete user account.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatUserSocialLabelLine = (row: DirectoryUserRow) => {
    const labels = [
      ...row.sociumRoleLabels,
      ...row.socialGroupActivityLabels,
      ...row.organizationLabels,
    ].filter(Boolean);
    return labels.length > 0 ? labels.join(", ") : null;
  };

  // Filter options for the header dropdown
  const formatUserAcademicLine = (row: Pick<DirectoryUserRow, "specialty" | "group">) =>
    formatAcademicGroupSpecialtyLabel(row.specialty, row.group) ?? "No specialty / group";

  const filterOptions = useMemo(() => {
    const opts = [{ label: "All Levels", value: "all" }];
    initialConfig.levels.forEach((l) => {
      opts.push({ label: l.label, value: String(l.index) });
    });
    return opts;
  }, [initialConfig]);

  // Level edit options (grant-rule levels strictly below the actor's tier)
  const assignableLevelOptions = useMemo(() => {
    if (!selectedUser) return [];
    const actorIndex = currentUser.role === "Admin" ? 0 : currentUser.accessLevelIndex;
    const rule = initialConfig.grantRules[actorIndex as AccessLevelIndex];
    if (!rule) return [];

    const options = initialConfig.levels
      .filter((l) => rule.assignableLevelIndices.includes(l.index) && l.index > actorIndex)
      .map((l) => ({ label: l.label, value: String(l.index) }));

    const currentLevel = String(selectedUser.accessLevelIndex);
    if (!options.some((opt) => opt.value === currentLevel)) {
      const currentDef = initialConfig.levels.find((l) => l.index === selectedUser.accessLevelIndex);
      if (currentDef) {
        return [{ label: currentDef.label, value: currentLevel }, ...options];
      }
    }

    return options;
  }, [selectedUser, currentUser, initialConfig]);

  // Delegatable permissions checkboxes — only keys the actor may delegate downward
  const delegatablePermissions = useMemo(() => {
    const actorIndex = (
      currentUser.role === "Admin" ? 0 : currentUser.accessLevelIndex
    ) as AccessLevelIndex;
    const rule = initialConfig.grantRules[actorIndex];
    const fromRules = rule?.delegatablePermissions ?? [];
    const actorSlice = {
      role: currentUser.role,
      accessLevelIndex: actorIndex,
      delegatedPermissions: currentUser.delegatedPermissions ?? [],
      sociumRoles: currentUser.sociumRoles ?? [],
      studentTitle: currentUser.studentTitle ?? null,
    };
    const held = new Set(resolveEffectivePermissions(actorSlice, initialConfig));
    return fromRules.filter((perm) => held.has(perm));
  }, [currentUser, initialConfig]);

  // Toggle delegated permission
  const handleTogglePermission = (perm: PermissionKey) => {
    setEditDelegated((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const canShowActionToolbar = selectedUser
    ? (canMutateDirectory && selectedUser.canManage) ||
      selectedUser.canEditProfile ||
      selectedUser.canAssignLevel ||
      selectedUser.canAssignSocium ||
      selectedUser.canAssignAffiliations
    : false;

  const showDetailPane = Boolean(selectedUserId);
  const showEmptyDetail = !selectedUserId && !isLoadingDetail;

  const effectiveSociumRolesForProfile = useMemo(() => {
    if (!selectedUser) return [];
    return resolveDirectoryEffectiveSociumRoles({
      canAssignSocium: selectedUser.canAssignSocium,
      editSociumRoles,
      storedSociumRoles: selectedUser.sociumRoles,
    });
  }, [selectedUser, editSociumRoles]);

  const listPageSummary = useMemo(() => {
    if (totalCount <= 0) return undefined;
    const { from, to } = computePageRowRange(page, DEFAULT_LIST_PAGE_SIZE, totalCount);
    return `Showing ${from}–${to} of ${totalCount}`;
  }, [page, totalCount]);

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="global-layout-editor py-8 md:py-12"
      innerClassName="global-layout-editor__stack"
    >
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 dark:border-zinc-300/10">
        <div className="flex flex-col gap-1.5">
          <Link
            href="/admin"
            className="global-layout-editor__btn-text inline-flex w-fit items-center gap-1.5 border border-zinc-700/10 text-xs text-(--color-text-secondary) no-underline transition-colors hover:bg-zinc-700/10 hover:text-(--color-text-primary) dark:border-zinc-300/5 dark:hover:bg-zinc-300/5"
          >
            <ArrowLeft size={12} />
            <span>Back to Administration</span>
          </Link>
          <div className="flex items-center gap-2 text-primary">
            <Users size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide uppercase">User Directory</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-(--color-text-primary)">
            Institutional User Roster
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-(--color-text-secondary)">
            Browse, filter, and manage hierarchy levels, profile fields, and social-life discovery
            labels. Sensitive contact fields are redacted unless you outrank the user.
          </p>
        </div>
      </div>

      <GlobalLayoutEditorStatusBanner status={status} />

      {/* Dual Column Layout */}
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-4 shadow-md md:p-6 lg:p-8 dark:border-zinc-300/10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: List */}
        <div
          className={cn(
            "flex flex-col gap-4 lg:col-span-5",
            showDetailPane ? "hidden lg:flex" : "flex",
          )}
        >
          <div className="glass-panel flex flex-col gap-4 p-4">
            {/* Filters */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or login..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="w-full sm:w-48">
                <PuckSelectField
                  value={levelFilter}
                  onChange={setLevelFilter}
                  options={filterOptions}
                  placeholder="Filter by level"
                />
              </div>
            </div>

            {/* List Body */}
            <div className="flex max-h-none flex-col gap-2 overflow-y-auto pr-1 lg:max-h-[600px]">
              {isLoading && users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No users found matching filters.</p>
                </div>
              ) : (
                users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => fetchUserDetail(u.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                      selectedUserId === u.id
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-(--color-bg-panel)/40 hover:bg-(--color-bg-panel)/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatUserAcademicLine(u)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={u.accessLevelIndex === 0 ? "destructive" : "secondary"}>
                        {u.accessLevelLabel}
                      </Badge>
                      {formatUserSocialLabelLine(u) ? (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
                          {formatUserSocialLabelLine(u)}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))
              )}

              <NexusListPagination
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                disabled={isLoading}
                summary={listPageSummary}
                className="border-t border-border pt-3"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Detail / Edit */}
        <div
          className={cn(
            "lg:col-span-7",
            showEmptyDetail ? "hidden lg:block" : "block",
          )}
        >
          {isLoadingDetail ? (
            <div className="glass-panel flex flex-col items-center justify-center py-24 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Loading user details...</p>
            </div>
          ) : !selectedUser ? (
            <div className="glass-panel flex flex-col items-center justify-center py-24 text-muted-foreground text-center p-6">
              <Users className="h-12 w-12 mb-3 opacity-30 text-primary" />
              <h3 className="text-lg font-medium text-(--color-text-primary) mb-1">No User Selected</h3>
              <p className="text-sm max-w-xs">
                Select a user from the directory list on the left to view details and manage access permissions.
              </p>
            </div>
          ) : (
            <div className="glass-panel flex flex-col gap-6 p-4 md:p-6">
              <button
                type="button"
                onClick={handleBackToRoster}
                className="lg:hidden inline-flex w-fit items-center gap-1.5 text-xs font-medium text-(--color-text-secondary) transition-colors hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to roster
              </button>

              {/* Profile Header */}
              <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                    {selectedUser.avatar ? (
                      <img src={selectedUser.avatar} alt={selectedUser.fullName} className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{selectedUser.fullName}</h2>
                    <p className="text-sm text-muted-foreground">
                      {formatUserAcademicLine(selectedUser)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedUser.accessLevelLabel}
                    </p>
                    {canViewSystemLogs ? (
                      <Link
                        href={`/admin/logs?section=user-directory&targetUserId=${encodeURIComponent(selectedUser.id)}`}
                        className="mt-2 inline-flex text-xs text-primary no-underline hover:underline"
                      >
                        View audit log
                      </Link>
                    ) : null}
                  </div>
                </div>

                {canShowActionToolbar ? (
                  <div className="hidden lg:block">
                    <AdminEditorActionToolbar
                      onReset={() => fetchUserDetail(selectedUser.id, { force: true })}
                      onSave={handleSave}
                      onDelete={selectedUser.canDelete ? handleDeleteAccount : undefined}
                      isSaving={isSaving}
                      isDeleting={isDeleting}
                    />
                  </div>
                ) : (
                  <p className="text-xs text-(--color-text-secondary)">
                    {canMutateDirectory && !selectedUser.canManage
                      ? "You cannot manage users at this hierarchy level."
                      : "Read-only access — you may browse the directory but cannot edit users."}
                  </p>
                )}
              </div>

              {selectedUser.canEditProfile && editProfile ? (
                <UserDirectoryProfileFields
                  value={editProfile}
                  onChange={(next) => {
                    setEditProfile(next);
                    if (profileFieldErrors.phone) {
                      setProfileFieldErrors((prev) => {
                        const { phone: _phone, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  email={selectedUser.login !== null ? selectedUser.email : undefined}
                  sociumRoles={effectiveSociumRolesForProfile}
                  fieldErrors={profileFieldErrors}
                  disabled={isSaving}
                />
              ) : null}

              <UserDirectoryPersonalFields
                user={selectedUser}
                pendingPhone={selectedUser.canEditProfile ? editProfile?.phone : undefined}
                sociumRoles={editSociumRoles}
                activities={editActivities}
                organizations={editOrgs}
                onSociumRolesChange={setEditSociumRoles}
                onActivitiesChange={setEditActivities}
                onOrganizationsChange={setEditOrganizations}
                canEditSocium={selectedUser.canAssignSocium}
                canEditAffiliations={selectedUser.canAssignAffiliations}
                disabled={isSaving || isDeleting}
              />

              {/* Access Level Assignment */}
              {selectedUser.canAssignLevel ? (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-semibold text-foreground">Hierarchy Access Level</h3>
                  <p className="text-xs text-muted-foreground">
                    Assign a hierarchy tier (1–6). Lower index means higher institutional authority.
                  </p>
                  <div className="w-full sm:w-72">
                    <PuckSelectField
                      value={String(editLevel)}
                      onChange={(val) => setEditLevel(Number(val))}
                      options={assignableLevelOptions}
                    />
                  </div>
                </div>
              ) : null}

              {canMutateDirectory ? (
                <>
              {/* Permission Delegation */}
              {selectedUser.canDelegate && delegatablePermissions.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground">Explicitly Delegated Permissions</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    Grant additional permission keys directly to this user. You can only delegate keys you hold.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {delegatablePermissions.map((perm) => {
                      const isChecked = editDelegated.includes(perm);
                      return (
                        <button
                          key={perm}
                          onClick={() => handleTogglePermission(perm)}
                          className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                            isChecked
                              ? "border-primary/40 bg-primary/10 text-(--color-text-primary)"
                              : "border-border bg-(--color-bg-panel)/20 text-(--color-text-secondary) hover:bg-(--color-bg-panel)/40"
                          }`}
                        >
                          <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isChecked ? "bg-primary border-primary text-primary-foreground" : "border-input"
                          }`}>
                            {isChecked && <Check className="h-3 w-3" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{PERMISSION_LABELS[perm]}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{perm}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

                </>
              ) : null}

              {/* Spacer for sticky mobile toolbar */}
              {canShowActionToolbar ? <div className="h-16 lg:hidden" aria-hidden="true" /> : null}
            </div>
          )}
        </div>
      </div>
      </div>

      {canShowActionToolbar && selectedUser ? (
        <div className="admin-mobile-toolbar lg:hidden">
          <AdminEditorActionToolbar
            onReset={() => fetchUserDetail(selectedUser.id, { force: true })}
            onSave={handleSave}
            onDelete={selectedUser.canDelete ? handleDeleteAccount : undefined}
            isSaving={isSaving}
            isDeleting={isDeleting}
            className="w-full justify-end"
          />
        </div>
      ) : null}
    </StaticPageShell>
  );
}
