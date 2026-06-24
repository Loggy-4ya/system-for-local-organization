"use client";

/**
 * @fileoverview Inline mention badge rendered inside the TipTap editor.
 *
 * @module src/components/editor/NexusMentionBadge
 */

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  normalizeMentionLabel,
  type NexusMentionType,
} from "@shared/lib/nexusMentionTypes";

/**
 * Read mention attrs from a TipTap node view.
 *
 * @param props - TipTap node view props.
 * @returns Normalised mention fields.
 */
function readMentionAttrs(props: NodeViewProps): {
  mentionType: NexusMentionType;
  id: string;
  label: string;
  href: string;
} {
  const mentionType = (props.node.attrs.mentionType as NexusMentionType) || "user";
  return {
    mentionType,
    id: String(props.node.attrs.id ?? ""),
    label: String(props.node.attrs.label ?? ""),
    href: String(props.node.attrs.href ?? ""),
  };
}

/**
 * TipTap node view — renders user/page mentions as Shadcn badges.
 *
 * @param props - TipTap React node view props.
 * @returns Badge link chip inside the editor surface.
 */
export function NexusMentionBadge(props: NodeViewProps) {
  const { mentionType, label, href } = readMentionAttrs(props);
  const displayLabel = normalizeMentionLabel(label);

  return (
    <NodeViewWrapper as="span" className="nexus-mention-node" contentEditable={false}>
      <Badge
        variant={mentionType === "page" ? "secondary" : "outline"}
        className={cn(
          "nexus-mention",
          `nexus-mention--${mentionType}`,
          "mx-0.5 align-baseline",
        )}
        render={
          <Link
            href={href || "#"}
            tabIndex={-1}
            data-nexus-mention=""
            data-mention-type={mentionType}
            data-id={props.node.attrs.id}
            data-label={displayLabel}
            {...(mentionType === "page" ? { "data-page-path": href } : {})}
            onClick={(event) => event.preventDefault()}
          />
        }
      >
        {mentionType === "page" ? (
          <FileText data-icon="inline-start" aria-hidden />
        ) : null}
        @{displayLabel}
      </Badge>
    </NodeViewWrapper>
  );
}
