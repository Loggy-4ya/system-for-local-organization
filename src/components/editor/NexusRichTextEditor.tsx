"use client";

/**
 * @fileoverview Site-wide TipTap rich text editor with `@` mentions and internal page links.
 *
 * Drop this component anywhere authenticated users compose rich text (comments,
 * news drafts, task reports). Stored value is sanitized HTML containing
 * `data-nexus-mention` badge anchors and block markup from `/` slash commands.
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
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import {
  isSafeHref,
  sanitizeNexusEditorHtml,
} from "@/lib/nexusEditor/nexusEditorContent";
import {
  defaultSearchMentions,
  type NexusMentionSearchFn,
} from "@/lib/nexusEditor/mentionQueryClient";
import type { NexusSlashCommandDefinition } from "@/lib/nexusEditor/slashCommandCatalog";
import { MentionSuggestionList } from "./MentionSuggestionList";
import { SlashCommandList } from "./SlashCommandList";
import { createSuggestionPortalRenderer } from "./lib/createSuggestionPortalRenderer";
import {
  createNexusEditorExtensions,
  type NexusEditorVariant,
} from "./extensions/createNexusEditorExtensions";
import type { NexusMentionItem } from "@shared/lib/nexusMentionTypes";

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
  ListComponent: MentionSuggestionList,
  mapProps: (props) => props,
});

/**
 * Build the floating `/` slash command renderer for TipTap.
 */
const slashSuggestionRenderer = createSuggestionPortalRenderer({
  portalClassName: "nexus-slash-suggestion-portal",
  ListComponent: SlashCommandList,
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
  slashCommands = [],
}: NexusRichTextEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const searchMentionsFlat = useCallback(
    async (query: string): Promise<NexusMentionItem[]> => {
      const rows = await searchMentions(query);
      return rows.map((row) => ({
        mentionType: row.mentionType,
        id: row.id,
        label: row.label,
        href: row.href,
        subtitle: row.subtitle,
        avatar: row.avatar,
      }));
    },
    [searchMentions],
  );

  const commitHtml = useCallback((html: string) => {
    onChangeRef.current(html);
  }, []);

  const scheduleCommit = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        commitHtml(html);
      }, HTML_COMMIT_DEBOUNCE_MS);
    },
    [commitHtml],
  );

  const flushCommit = useCallback(
    (editorInstance: NonNullable<ReturnType<typeof useEditor>>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      commitHtml(sanitizeNexusEditorHtml(editorInstance.getHTML()));
    },
    [commitHtml],
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
    content: value || "",
    editorProps: {
      attributes: {
        class: "nexus-rich-text-editor__content",
        "aria-label": "Rich text editor",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      scheduleCommit(sanitizeNexusEditorHtml(nextEditor.getHTML()));
    },
    onBlur: ({ editor: nextEditor }) => {
      flushCommit(nextEditor);
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    const current = sanitizeNexusEditorHtml(editor.getHTML());
    const incoming = sanitizeNexusEditorHtml(value || "");
    if (incoming !== current) {
      editor.commands.setContent(incoming || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

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
    </div>
  );
}
