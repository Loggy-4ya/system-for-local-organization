"use client";

/**
 * @fileoverview Site-wide TipTap rich text editor with `@` mentions and internal page links.
 *
 * Drop this component anywhere authenticated users compose rich text (comments,
 * news drafts, task reports). Stored value is sanitized HTML containing
 * `data-nexus-mention` badge anchors and block markup from `/` slash commands.
 *
 * Content policy: scans plain text via {@link containsBlockedWord}; blocks parent
 * `onChange` while disallowed language is present and reverts on blur.
 *
 * @module src/components/editor/NexusRichTextEditor
 */

import { EditorContent, useEditor } from "@tiptap/react";
import { Link2, Unlink } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type ComponentType,
  type RefAttributes,
} from "react";
import type { SuggestionListHandle } from "./lib/createSuggestionPortalRenderer";
import type { SuggestionListBaseProps } from "./lib/createSuggestionPortalRenderer";
import { cn } from "@/lib/utils";
import {
  isSafeHref,
  sanitizeNexusEditorHtml,
} from "@/lib/nexusEditor/nexusEditorContent";
import { CONTENT_POLICY_BLOCKED_WORD_MESSAGE } from "@shared/constants/contentPolicy";
import { containsBlockedWord } from "@shared/lib/contentPolicy";
import {
  defaultSearchMentions,
  type NexusMentionSearchFn,
} from "@/lib/nexusEditor/mentionQueryClient";
import type { NexusSlashCommandDefinition } from "@/lib/nexusEditor/slashCommandCatalog";
import { MentionSuggestionList } from "./MentionSuggestionList";
import { SlashCommandList } from "./SlashCommandList";
import { createSuggestionPortalRenderer } from "./lib/createSuggestionPortalRenderer";
import { isNexusSuggestionActive } from "./lib/nexusSuggestionState";
import { removeStaleSuggestionPortals } from "./lib/suggestionPortalLogic";
import {
  createNexusEditorExtensions,
  type NexusEditorVariant,
} from "./extensions/createNexusEditorExtensions";
import { dedupeNexusMentionItems, type NexusMentionItem } from "@shared/lib/nexusMentionTypes";

/** Stable empty slash-command list — avoids new-array identity on every render. */
const EMPTY_SLASH_COMMANDS: NexusSlashCommandDefinition[] = [];

/** Debounce interval for editor HTML commits (ms). */
const HTML_COMMIT_DEBOUNCE_MS = 400;

/** Props for {@link NexusRichTextEditor}. */
export interface NexusRichTextEditorProps {
  /** Controlled HTML value (sanitized on change). */
  value: string;
  /** Called when the document changes (debounced + on blur). */
  onChange: (html: string) => void;
  /** Optional placeholder shown via CSS when empty. */
  placeholder?: string;
  /** Additional wrapper class names. */
  className?: string;
  /** Toolbar density — `minimal` hides formatting controls. */
  variant?: NexusEditorVariant;
  /** Disable editing. */
  disabled?: boolean;
  /** Minimum editor body height in pixels. */
  minHeight?: number;
  /**
   * Custom mention search — defaults to `GET /api/mentions/search`.
   * Return flat {@link NexusMentionItem} rows.
   */
  searchMentions?: NexusMentionSearchFn;
  /** Extra `/` commands merged into the default catalog for this surface. */
  slashCommands?: NexusSlashCommandDefinition[];
  /** Called when blocked-language state changes (for parent form disable). */
  onContentPolicyViolation?: (message: string | null) => void;
}

/** Toolbar button definition. */
interface ToolbarButton {
  label: ReactNode;
  title: string;
  isActive: () => boolean;
  action: () => void;
  showWhen: NexusEditorVariant[];
}

/**
 * Prompt for a hyperlink URL and apply or remove the link mark.
 *
 * @param editor - Active TipTap editor instance.
 */
function handleLinkAction(editor: NonNullable<ReturnType<typeof useEditor>>): void {
  const previous = (editor.getAttributes("link").href as string) || "";
  const url = window.prompt("Enter link URL (leave empty to remove)", previous);

  if (url === null) return;

  if (!url.trim()) {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    return;
  }

  const trimmed = url.trim();
  if (!isSafeHref(trimmed)) {
    window.alert("Only http(s), mailto, tel, relative, and hash links are allowed.");
    return;
  }

  editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
}

/**
 * Build the floating `@` suggestion renderer for TipTap.
 */
const mentionSuggestionRenderer = createSuggestionPortalRenderer({
  portalClassName: "nexus-mention-suggestion-portal",
  ListComponent: MentionSuggestionList as ComponentType<
    SuggestionListBaseProps<unknown> & RefAttributes<SuggestionListHandle>
  >,
  mapProps: (props) => props,
});

/**
 * Build the floating `/` slash command renderer for TipTap.
 */
const slashSuggestionRenderer = createSuggestionPortalRenderer({
  portalClassName: "nexus-slash-suggestion-portal",
  ListComponent: SlashCommandList as ComponentType<
    SuggestionListBaseProps<unknown> & RefAttributes<SuggestionListHandle>
  >,
  mapProps: (props) => props,
});

/**
 * Reusable Nexus rich text editor with `@` mentions and `/` slash commands.
 *
 * @param props - Controlled editor props.
 * @returns TipTap editor shell.
 */
export function NexusRichTextEditor({
  value,
  onChange,
  placeholder = "Write something… Type @ to mention, / for commands.",
  className,
  variant = "default",
  disabled = false,
  minHeight = 140,
  searchMentions = defaultSearchMentions,
  slashCommands = EMPTY_SLASH_COMMANDS,
  onContentPolicyViolation,
}: NexusRichTextEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onPolicyViolationRef = useRef(onContentPolicyViolation);
  onPolicyViolationRef.current = onContentPolicyViolation;
  const lastGoodHtmlRef = useRef(value || "");
  const pendingCommitHtmlRef = useRef<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);

  const reportPolicyViolation = useCallback((message: string | null) => {
    setPolicyError(message);
    onPolicyViolationRef.current?.(message);
  }, []);

  const assessEditorContent = useCallback(
    (
      editorInstance: NonNullable<ReturnType<typeof useEditor>>,
      html: string,
    ): boolean => {
      const plainText = editorInstance.getText();
      if (containsBlockedWord(plainText)) {
        reportPolicyViolation(CONTENT_POLICY_BLOCKED_WORD_MESSAGE);
        return false;
      }
      reportPolicyViolation(null);
      lastGoodHtmlRef.current = html;
      return true;
    },
    [reportPolicyViolation],
  );

  const commitHtml = useCallback((html: string) => {
    onChangeRef.current(html);
  }, []);

  const searchMentionsFlat = useCallback(
    async (query: string): Promise<NexusMentionItem[]> => {
      const rows = await searchMentions(query);
      return dedupeNexusMentionItems(
        rows.map((row) => ({
          mentionType: row.mentionType,
          id: row.id,
          label: row.label,
          href: row.href,
          subtitle: row.subtitle,
          avatar: row.avatar,
        })),
      );
    },
    [searchMentions],
  );

  const scheduleCommit = useCallback(
    (editorInstance: NonNullable<ReturnType<typeof useEditor>>, html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (assessEditorContent(editorInstance, html)) {
          commitHtml(html);
        }
      }, HTML_COMMIT_DEBOUNCE_MS);
    },
    [assessEditorContent, commitHtml],
  );

  const flushCommit = useCallback(
    (editorInstance: NonNullable<ReturnType<typeof useEditor>>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const html = sanitizeNexusEditorHtml(editorInstance.getHTML());
      if (assessEditorContent(editorInstance, html)) {
        commitHtml(html);
        return;
      }
      editorInstance.commands.setContent(lastGoodHtmlRef.current || "<p></p>", {
        emitUpdate: false,
      });
    },
    [assessEditorContent, commitHtml],
  );

  const extensions = useMemo(
    () =>
      createNexusEditorExtensions({
        variant,
        mention: {
          searchMentions: searchMentionsFlat,
          renderSuggestion: mentionSuggestionRenderer,
        },
        slash: {
          renderSuggestion: slashSuggestionRenderer,
          extraCommands: slashCommands,
        },
      }),
    [searchMentionsFlat, slashCommands, variant],
  );

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions,
    content: sanitizeNexusEditorHtml(value || ""),
    editorProps: {
      attributes: {
        class: "nexus-rich-text-editor__content",
        "aria-label": "Rich text editor",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      const html = sanitizeNexusEditorHtml(nextEditor.getHTML());
      if (isNexusSuggestionActive(nextEditor)) {
        pendingCommitHtmlRef.current = html;
        return;
      }
      pendingCommitHtmlRef.current = null;
      scheduleCommit(nextEditor, html);
    },
    onBlur: ({ editor: nextEditor }) => {
      flushCommit(nextEditor);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      removeStaleSuggestionPortals("nexus-mention-suggestion-portal");
      removeStaleSuggestionPortals("nexus-slash-suggestion-portal");
    };
  }, []);

  useEffect(() => {
    if (!editor) return;

    const flushPendingCommit = () => {
      if (isNexusSuggestionActive(editor)) return;
      const pending = pendingCommitHtmlRef.current;
      if (pending === null) return;
      pendingCommitHtmlRef.current = null;
      scheduleCommit(editor, pending);
    };

    editor.on("transaction", flushPendingCommit);
    return () => {
      editor.off("transaction", flushPendingCommit);
    };
  }, [editor, scheduleCommit]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused || isNexusSuggestionActive(editor)) return;
    const incoming = sanitizeNexusEditorHtml(value || "");
    const current = sanitizeNexusEditorHtml(editor.getHTML());
    if (incoming === current) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || editor.isDestroyed) return;
      if (editor.isFocused || isNexusSuggestionActive(editor)) return;
      const nextIncoming = sanitizeNexusEditorHtml(value || "");
      const nextCurrent = sanitizeNexusEditorHtml(editor.getHTML());
      if (nextIncoming === nextCurrent) return;
      editor.commands.setContent(nextIncoming || "<p></p>", { emitUpdate: false });
      lastGoodHtmlRef.current = nextIncoming;
      reportPolicyViolation(
        containsBlockedWord(editor.getText()) ? CONTENT_POLICY_BLOCKED_WORD_MESSAGE : null,
      );
    });

    return () => {
      cancelled = true;
    };
  }, [editor, value, reportPolicyViolation]);

  if (!editor) {
    return (
      <div className={cn("nexus-rich-text-editor nexus-rich-text-editor--loading", className)}>
        Loading editor…
      </div>
    );
  }

  const showToolbar = variant !== "minimal";

  const buttons: ToolbarButton[] = [
    {
      label: "B",
      title: "Bold",
      isActive: () => editor.isActive("bold"),
      action: () => editor.chain().focus().toggleBold().run(),
      showWhen: ["default", "full"],
    },
    {
      label: "I",
      title: "Italic",
      isActive: () => editor.isActive("italic"),
      action: () => editor.chain().focus().toggleItalic().run(),
      showWhen: ["default", "full"],
    },
    {
      label: "S",
      title: "Strikethrough",
      isActive: () => editor.isActive("strike"),
      action: () => editor.chain().focus().toggleStrike().run(),
      showWhen: ["full"],
    },
    {
      label: "</>",
      title: "Inline code",
      isActive: () => editor.isActive("code"),
      action: () => editor.chain().focus().toggleCode().run(),
      showWhen: ["full"],
    },
    {
      label: <Link2 size={13} strokeWidth={2} aria-hidden />,
      title: "Add or edit link",
      isActive: () => editor.isActive("link"),
      action: () => handleLinkAction(editor),
      showWhen: ["default", "full"],
    },
    {
      label: <Unlink size={13} strokeWidth={2} aria-hidden />,
      title: "Remove link",
      isActive: () => false,
      action: () => editor.chain().focus().unsetLink().run(),
      showWhen: ["default", "full"],
    },
    {
      label: "H2",
      title: "Heading 2",
      isActive: () => editor.isActive("heading", { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      showWhen: ["full"],
    },
    {
      label: "•",
      title: "Bullet list",
      isActive: () => editor.isActive("bulletList"),
      action: () => editor.chain().focus().toggleBulletList().run(),
      showWhen: ["full"],
    },
    {
      label: "1.",
      title: "Numbered list",
      isActive: () => editor.isActive("orderedList"),
      action: () => editor.chain().focus().toggleOrderedList().run(),
      showWhen: ["full"],
    },
  ];

  const visibleButtons = buttons.filter((btn) => btn.showWhen.includes(variant));

  return (
    <div
      className={cn(
        "nexus-rich-text-editor glass-panel",
        disabled && "nexus-rich-text-editor--disabled",
        policyError && "nexus-rich-text-editor--policy-error",
        className,
      )}
    >
      {showToolbar ? (
        <div className="nexus-rich-text-editor__toolbar" role="toolbar" aria-label="Text formatting">
          {visibleButtons.map((btn) => (
            <button
              key={btn.title}
              type="button"
              className={cn(
                "nexus-rich-text-editor__btn",
                btn.isActive() && "nexus-rich-text-editor__btn--active",
              )}
              title={btn.title}
              aria-pressed={btn.isActive()}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={btn.action}
            >
              {btn.label}
            </button>
          ))}
          <span className="nexus-rich-text-editor__hint">@ / commands</span>
        </div>
      ) : null}
      <EditorContent
        editor={editor}
        className="nexus-rich-text-editor__surface"
        style={{ minHeight }}
      />
      {policyError ? (
        <p className="nexus-rich-text-editor__policy-error" role="alert">
          {policyError}
        </p>
      ) : null}
    </div>
  );
}
