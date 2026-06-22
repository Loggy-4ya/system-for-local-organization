/**
 * @fileoverview Puck catch-all Server Component page for Project Nexus.
 *
 * @module src/app/[...puckPath]/page
 */

import { notFound, redirect } from "next/navigation";
import connectDB from "@shared/lib/db";
import Page from "@shared/models/Page";
import type { Data } from "@puckeditor/core";
import { auth } from "@/auth";
import {
  canUserEditPageDoc,
  shouldShowPageEditFab,
} from "@/lib/pageEditAccess";
import { PuckClient } from "./client";
import { isBuiltinAppRoutePath } from "@/components/puck/lib/pageSlugValidation";
import { AccessControlDomain } from "@shared/domains/AccessControlDomain";
import { AuthDomain } from "@shared/domains/AuthDomain";
import { PageDomain } from "@shared/domains/PageDomain";
import { canManagePageAccess } from "@shared/lib/pageAccessLogic";
import { resolveUserDisplayLabel } from "@shared/lib/userSociumHelpers";

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive the canonical page path and editing flag from the catch-all segment.
 *
 * @param segments - Array of URL path segments from the catch-all param.
 * @returns Object containing the normalised path string and `isEditing` flag.
 */
function resolvePath(segments: string[]): { path: string; isEditing: boolean } {
  if (segments.at(-1) === "edit") {
    return {
      path: "/" + segments.slice(0, -1).join("/"),
      isEditing: true,
    };
  }

  return { path: "/" + segments.join("/"), isEditing: false };
}

/** Next.js App Router page params shape. */
interface PageParams {
  puckPath: string[];
}

/**
 * Puck catch-all page — loads page data from MongoDB and delegates rendering
 * to the `PuckClient` Client Component.
 *
 * @param props - Next.js route params.
 * @returns The rendered Puck editor or viewer.
 */
export default async function PuckPage({ params }: { params: Promise<PageParams> }) {
  const { puckPath } = await params;

  if (puckPath.length === 1 && puckPath[0] === "edit") {
    redirect("/pages?error=homepage-code-only");
  }

  const { path, isEditing } = resolvePath(puckPath);

  if (!isEditing && isBuiltinAppRoutePath(path)) {
    notFound();
  }

  if (isEditing && path === "/edit") {
    redirect("/pages?error=reserved-slug");
  }

  if (isEditing && path === "/") {
    redirect("/pages?error=homepage-code-only");
  }

  let data: Data | null = null;
  let pageTitle = "Untitled Page";
  let pageCategories: string[] = [];
  let pageMetadata = PageDomain.toMetadataDto({
    path,
    title: pageTitle,
    published: false,
    categories: [],
    description: "",
    coverImage: "",
    authorUserId: undefined,
    publishAt: null,
    commentsEnabled: true,
    viewCount: 0,
    likeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    delegatedEditorUserIds: [],
  });

  let doc: Awaited<ReturnType<typeof Page.findOne>> = null;

  try {
    await connectDB();
    doc = await Page.findOne({ path }).lean();
    if (doc) {
      data = doc.puckData as Data;
      pageTitle = doc.title || "Untitled Page";
      pageCategories = doc.categories ?? [];
      const authorDisplayName = await PageDomain.resolveAuthorDisplayName(
        doc.authorUserId ? String(doc.authorUserId) : null,
      );
      pageMetadata = PageDomain.toMetadataDto(doc, authorDisplayName, {
        delegatedEditors: await PageDomain.resolveDelegatedEditorEntries(
          (doc.delegatedEditorUserIds ?? []).map(String),
        ),
        isPersisted: true,
      });
    }
  } catch (err) {
    console.error("[PuckPage] DB error:", err);
  }

  const session = await auth();
  let permissions: Awaited<ReturnType<typeof AccessControlDomain.resolvePermissionsForUser>> = [];
  let actor: ReturnType<typeof PageDomain.buildEditActor> | null = null;
  if (session?.user?.id) {
    const user = await AuthDomain.getUserById(session.user.id);
    if (user) {
      permissions = await AccessControlDomain.resolvePermissionsForUser(user);
      actor = PageDomain.buildEditActor(user, permissions);
      if (isEditing && !pageMetadata.authorUserId) {
        const publicUser = AuthDomain.toPublicUser(user);
        const authorDisplayName = resolveUserDisplayLabel({
          name: publicUser.name,
          surname: publicUser.surname,
          login: publicUser.login,
        });
        if (authorDisplayName) {
          pageMetadata = {
            ...pageMetadata,
            authorUserId: session.user.id,
            authorDisplayName,
          };
        }
      }
    }
  }

  const ownership = doc ? PageDomain.toOwnershipSlice(doc) : null;
  pageMetadata = {
    ...pageMetadata,
    path,
    isPersisted: Boolean(doc),
    canManagePageAccess: Boolean(actor && isEditing && canManagePageAccess(actor, ownership)),
  };
  const canEdit = canUserEditPageDoc(session, permissions, ownership);

  if (isEditing && !canEdit) {
    notFound();
  }

  const isPublic = doc ? PageDomain.isPubliclyVisible(doc) : false;

  if (!isEditing && !data) {
    notFound();
  }

  if (!isEditing && doc && !isPublic && !canEdit) {
    notFound();
  }

  const showPageEditFab = shouldShowPageEditFab(canEdit, path, isEditing);

  let initialLiked = false;
  if (session?.user?.id && doc) {
    initialLiked = await PageDomain.hasUserLiked(path, session.user.id);
  }

  return (
    <PuckClient
      key={path}
      path={path}
      data={data}
      pageTitle={pageTitle}
      pageCategories={pageCategories}
      pageMetadata={pageMetadata}
      isEditing={isEditing}
      showPageEditFab={showPageEditFab}
      initialLiked={initialLiked}
      canLike={Boolean(session?.user?.id)}
      isPublicView={isPublic}
    />
  );
}
