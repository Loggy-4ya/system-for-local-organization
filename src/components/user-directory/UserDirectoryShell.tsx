"use client";

/**
 * @fileoverview Client-side shell for the institutional User Directory.
 *
 * Provides search, filtering, detailed view, and secure administrative mutations
 * (hierarchy assignment, socium roles, affiliations, and permission delegation).
 *
 * @module src/components/user-directory/UserDirectoryShell
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Save,
  Search,
  Users,
  Check,
  Plus,
  Trash2,
  User,
  Mail,
  Phone,
  Send,
  ShieldAlert,
} from "lucide-react";
import type { AccessControlSettingsConfig, AccessLevelIndex, PermissionKey } from "@shared/constants/accessControl";
import type { PublicUser } from "@shared/domains/AuthDomain";
import type { DirectoryUserRow } from "@shared/lib/directoryRedaction";
import { StaticPageShell } from "@/components/ui/StaticPageShell";
import { STATIC_ROUTE_CONTENT_WIDTH } from "@/components/puck/lib/contentWidthTokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PuckSelectField } from "@/components/puck/fields/PuckSelectField";
import { GlobalLayoutEditorStatusBanner } from "@/components/global-layout/GlobalLayoutEditorStatusBanner";
import "@/app/global-layout-editor.css";

/** Props for {@link UserDirectoryShell}. */
export interface UserDirectoryShellProps {
  initialConfig: AccessControlSettingsConfig;
  currentUser: PublicUser;
  /** Whether the actor may assign levels, roles, affiliations, or delegations. */
  canMutateDirectory: boolean;
}

/**
 * User Directory admin shell.
 */
export function UserDirectoryShell({
  initialConfig,
  currentUser,
  canMutateDirectory,
}: UserDirectoryShellProps) {
  // Directory list state
  const [users, setUsers] = useState<DirectoryUserRow[]>([]);
  const [q, setQ] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
  const [isSaving, setIsSaving] = useState(false);

  // New role/affiliation form states
  const [newRoleKey, setNewRoleKey] = useState("");
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [newRoleKind, setNewRoleKind] = useState<string>("custom");

  const [newActivityKey, setNewActivityKey] = useState("");
  const [newActivityLabel, setNewActivityLabel] = useState("");

  const [newOrgKey, setNewOrgKey] = useState("");
  const [newOrgLabel, setNewOrgLabel] = useState("");

  // Status banners
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Clear status banner after timeout
  useEffect(() => {
    if (status?.type !== "success") return undefined;
    const timer = window.setTimeout(() => setStatus(null), 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  // Fetch users list
  const fetchUsers = useCallback(async (searchQuery: string, levelVal: string, loadMoreCursor: string | null = null) => {
    const isMore = !!loadMoreCursor;
    if (isMore) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (levelVal !== "all") params.append("level", levelVal);
      if (loadMoreCursor) params.append("cursor", loadMoreCursor);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.status === 401 || res.status === 403) {
        setUsers([]);
        setNextCursor(null);
        setStatus({
          type: "error",
          message: "You do not have permission to view the user directory.",
        });
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch users.");

      const data = await res.json();
      if (isMore) {
        setUsers((prev) => [...prev, ...data.users]);
      } else {
        setUsers(data.users);
      }
      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Failed to load user directory." });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  // Initial load & search/filter triggers
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(q, levelFilter);
    }, 300); // debounce search input

    return () => clearTimeout(timer);
  }, [q, levelFilter, fetchUsers]);

  // Fetch detailed user info
  const fetchUserDetail = async (userId: string) => {
    setIsLoadingDetail(true);
    setSelectedUserId(userId);
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
      setSelectedUser(data);

      // Initialize edit states
      setEditLevel(data.accessLevelIndex);
      setEditDelegated(data.delegatedPermissions ?? []);
      setEditSociumRoles(data.sociumRoles ?? []);
      setEditActivities(data.socialGroupActivities ?? []);
      setEditOrganizations(data.organizations ?? []);
    } catch (err) {
      console.error(err);
      setStatus({ type: "error", message: "Failed to load user details." });
      setSelectedUserId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Save updates
  const handleSave = async () => {
    if (!selectedUserId || !selectedUser || !canMutateDirectory) return;
    setIsSaving(true);
    setStatus(null);

    const patch: any = {};
    if (selectedUser.canAssignLevel) {
      patch.accessLevelIndex = editLevel;
    }
    if (selectedUser.canDelegate) {
      patch.delegatedPermissions = editDelegated;
    }
    if (selectedUser.canAssignSocium) {
      patch.sociumRoles = editSociumRoles;
    }
    if (selectedUser.canAssignAffiliations) {
      patch.socialGroupActivities = editActivities;
      patch.organizations = editOrgs;
    }

    try {
      const res = await fetch(`/api/admin/users/${selectedUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save updates.");
      }

      setStatus({ type: "success", message: "User access configuration saved successfully." });
      
      // Update local list row
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUserId ? { ...u, ...data.user } : u))
      );
      setSelectedUser(data.user);
    } catch (err: any) {
      console.error(err);
      setStatus({ type: "error", message: err.message || "Failed to save updates." });
    } finally {
      setIsSaving(false);
    }
  };

  // Filter options for the header dropdown
  const filterOptions = useMemo(() => {
    const opts = [{ label: "All Levels", value: "all" }];
    initialConfig.levels.forEach((l) => {
      opts.push({ label: l.label, value: String(l.index) });
    });
    return opts;
  }, [initialConfig]);

  // Level edit options (only those allowed by grant rules and strictly lower than actor)
  const assignableLevelOptions = useMemo(() => {
    if (!selectedUser) return [];
    const actorIndex = currentUser.accessLevelIndex;
    const rule = initialConfig.grantRules[actorIndex as AccessLevelIndex];
    if (!rule) return [];

    return initialConfig.levels
      .filter((l) => rule.assignableLevelIndices.includes(l.index) && l.index > actorIndex)
      .map((l) => ({ label: l.label, value: String(l.index) }));
  }, [selectedUser, currentUser, initialConfig]);

  // Delegatable permissions checkboxes
  const delegatablePermissions = useMemo(() => {
    const actorIndex = currentUser.accessLevelIndex;
    const rule = initialConfig.grantRules[actorIndex as AccessLevelIndex];
    return rule?.delegatablePermissions ?? [];
  }, [currentUser, initialConfig]);

  // Toggle delegated permission
  const handleTogglePermission = (perm: PermissionKey) => {
    setEditDelegated((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  // Add new socium role
  const handleAddSociumRole = () => {
    if (!newRoleKey.trim() || !newRoleLabel.trim()) return;
    const newRole = {
      roleKey: newRoleKey.trim(),
      roleLabel: newRoleLabel.trim(),
      kind: newRoleKind,
      source: "admin",
      assignedAt: new Date().toISOString(),
    };
    setEditSociumRoles((prev) => [...prev, newRole]);
    setNewRoleKey("");
    setNewRoleLabel("");
  };

  // Remove socium role
  const handleRemoveSociumRole = (index: number) => {
    setEditSociumRoles((prev) => prev.filter((_, i) => i !== index));
  };

  // Add activity
  const handleAddActivity = () => {
    if (!newActivityKey.trim() || !newActivityLabel.trim()) return;
    const newAct = {
      activityKey: newActivityKey.trim(),
      activityLabel: newActivityLabel.trim(),
      assignedAt: new Date().toISOString(),
    };
    setEditActivities((prev) => [...prev, newAct]);
    setNewActivityKey("");
    setNewActivityLabel("");
  };

  // Remove activity
  const handleRemoveActivity = (index: number) => {
    setEditActivities((prev) => prev.filter((_, i) => i !== index));
  };

  // Add organization
  const handleAddOrg = () => {
    if (!newOrgKey.trim() || !newOrgLabel.trim()) return;
    const newOrg = {
      organizationKey: newOrgKey.trim(),
      organizationLabel: newOrgLabel.trim(),
      assignedAt: new Date().toISOString(),
    };
    setEditOrganizations((prev) => [...prev, newOrg]);
    setNewOrgKey("");
    setNewOrgLabel("");
  };

  // Remove organization
  const handleRemoveOrg = (index: number) => {
    setEditOrganizations((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <StaticPageShell
      contentWidth={STATIC_ROUTE_CONTENT_WIDTH.admin}
      className="global-layout-editor py-12"
      innerClassName="global-layout-editor__stack"
    >
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-6 shadow-md dark:border-zinc-300/10">
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
            Browse, filter, and manage institutional access levels, socium roles, affiliations, and
            delegated permissions. Sensitive contact fields are redacted unless you outrank the user.
          </p>
        </div>
      </div>

      <GlobalLayoutEditorStatusBanner status={status} />

      {/* Dual Column Layout */}
      <div className="glass-panel w-full rounded-lg border border-zinc-700/20 p-6 shadow-md md:p-8 dark:border-zinc-300/10">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: List */}
        <div className="lg:col-span-5 flex flex-col gap-4">
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
            <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
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
                          {u.group || "No Group"} • {u.specialty || "No Specialty"}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={u.accessLevelIndex === 0 ? "destructive" : "secondary"}>
                        {u.accessLevelLabel}
                      </Badge>
                      {u.sociumRoleLabels.length > 0 && (
                        <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                          {u.sociumRoleLabels.join(", ")}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}

              {nextCursor && (
                <Button
                  variant="ghost"
                  onClick={() => fetchUsers(q, levelFilter, nextCursor)}
                  disabled={isLoadingMore}
                  className="w-full mt-2"
                >
                  {isLoadingMore ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    "Load More"
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detail / Edit */}
        <div className="lg:col-span-7">
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
            <div className="glass-panel flex flex-col gap-6 p-6">
              {/* Profile Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-6">
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
                      {selectedUser.group || "No Group"} • {selectedUser.specialty || "No Specialty"}
                    </p>
                  </div>
                </div>

                {canMutateDirectory && selectedUser.canManage ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fetchUserDetail(selectedUser.id)}
                      disabled={isSaving}
                    >
                      Reset
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-(--color-text-secondary)">
                    {canMutateDirectory
                      ? "You cannot manage users at this hierarchy level."
                      : "Read-only access — you may browse the directory but cannot edit users."}
                  </p>
                )}
              </div>

              {/* Redacted Contact Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-panel/20 p-4 rounded-lg border border-border">
                <div className="flex items-center gap-3 min-w-0">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Login Handle</p>
                    <p className="text-sm font-medium text-foreground truncate">{selectedUser.login || "Redacted / Hidden"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Email Address</p>
                    <p className="text-sm font-medium text-foreground truncate">{selectedUser.email || "Redacted / Hidden"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Phone Number</p>
                    <p className="text-sm font-medium text-foreground truncate">{selectedUser.phone || "Redacted / Hidden"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <Send className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Telegram ID</p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedUser.telegramId ? String(selectedUser.telegramId) : "Redacted / Unlinked"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Access Level Assignment */}
              {canMutateDirectory && (
                <>
              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-foreground">Hierarchy Access Level</h3>
                {selectedUser.canAssignLevel ? (
                  <div className="w-full sm:w-72">
                    <PuckSelectField
                      value={String(editLevel)}
                      onChange={(val) => setEditLevel(Number(val))}
                      options={assignableLevelOptions}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-panel/30 p-3 rounded-md border border-border">
                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    <span>You do not have permission or sufficient rank to reassign this user's hierarchy level.</span>
                  </div>
                )}
              </div>

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
                            <p className="text-xs font-medium truncate">{perm}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Socium Roles Assignment */}
              {selectedUser.canAssignSocium && (
                <div className="flex flex-col gap-3 border-t border-border pt-6">
                  <h3 className="text-sm font-semibold text-foreground">Socium & Student-Life Roles</h3>
                  
                  {/* Current Roles List */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {editSociumRoles.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No socium roles assigned.</p>
                    ) : (
                      editSociumRoles.map((role, idx) => (
                        <Badge key={idx} variant="outline" className="gap-1.5 py-1 px-2.5">
                          <span>{role.roleLabel} ({role.kind})</span>
                          <button
                            onClick={() => handleRemoveSociumRole(idx)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </Badge>
                      ))
                    )}
                  </div>

                  {/* Add Role Form */}
                  <div className="flex flex-col gap-3 bg-panel/10 p-4 rounded-lg border border-border sm:flex-row sm:items-end">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role Key</label>
                      <Input
                        placeholder="e.g. sector_head"
                        value={newRoleKey}
                        onChange={(e) => setNewRoleKey(e.target.value)}
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role Label</label>
                      <Input
                        placeholder="e.g. Sector Head"
                        value={newRoleLabel}
                        onChange={(e) => setNewRoleLabel(e.target.value)}
                      />
                    </div>
                    <div className="w-full sm:w-40 flex flex-col gap-1.5">
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role Kind</label>
                      <PuckSelectField
                        value={newRoleKind}
                        onChange={setNewRoleKind}
                        options={[
                          { label: "Custom", value: "custom" },
                          { label: "Self Gov Member", value: "self_government_member" },
                          { label: "Self Gov Head", value: "self_government_head" },
                          { label: "Self Gov Deputy", value: "self_government_deputy" },
                          { label: "Starosta", value: "starosta" },
                          { label: "Teacher", value: "teacher" },
                        ]}
                      />
                    </div>
                    <Button onClick={handleAddSociumRole} size="icon" className="h-9 w-9 shrink-0">
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Affiliations & Organizations */}
              {selectedUser.canAssignAffiliations && (
                <div className="flex flex-col gap-6 border-t border-border pt-6">
                  {/* Activities */}
                  <div className="flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-foreground">Social Group Activities</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editActivities.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No activities assigned.</p>
                      ) : (
                        editActivities.map((act, idx) => (
                          <Badge key={idx} variant="outline" className="gap-1.5 py-1 px-2.5">
                            <span>{act.activityLabel}</span>
                            <button
                              onClick={() => handleRemoveActivity(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex flex-col gap-3 bg-panel/10 p-4 rounded-lg border border-border sm:flex-row sm:items-end">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Activity Key</label>
                        <Input
                          placeholder="e.g. football"
                          value={newActivityKey}
                          onChange={(e) => setNewActivityKey(e.target.value)}
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Activity Label</label>
                        <Input
                          placeholder="e.g. Football Club"
                          value={newActivityLabel}
                          onChange={(e) => setNewActivityLabel(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddActivity} size="icon" className="h-9 w-9 shrink-0">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Organizations */}
                  <div className="flex flex-col gap-3 border-t border-border pt-6">
                    <h3 className="text-sm font-semibold text-foreground">External Organizations</h3>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {editOrgs.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No organizations assigned.</p>
                      ) : (
                        editOrgs.map((org, idx) => (
                          <Badge key={idx} variant="outline" className="gap-1.5 py-1 px-2.5">
                            <span>{org.organizationLabel}</span>
                            <button
                              onClick={() => handleRemoveOrg(idx)}
                              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </Badge>
                        ))
                      )}
                    </div>
                    <div className="flex flex-col gap-3 bg-panel/10 p-4 rounded-lg border border-border sm:flex-row sm:items-end">
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Organization Key</label>
                        <Input
                          placeholder="e.g. red_cross"
                          value={newOrgKey}
                          onChange={(e) => setNewOrgKey(e.target.value)}
                        />
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Organization Label</label>
                        <Input
                          placeholder="e.g. Red Cross Volunteer"
                          value={newOrgLabel}
                          onChange={(e) => setNewOrgLabel(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleAddOrg} size="icon" className="h-9 w-9 shrink-0">
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
    </StaticPageShell>
  );
}
