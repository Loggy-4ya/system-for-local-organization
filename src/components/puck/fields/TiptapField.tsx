"use client";

/**
 * @fileoverview Tiptap rich text editor custom field for Puck sidebars.
 *
 * @module src/components/puck/fields/TiptapField
 */

import { FieldLabel, usePuck } from "@measured/puck";
import Link from "@tiptap/extension-link";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Link2, Unlink } from "lucide-react";
import { useCallback, useEffect, useRef, type ReactNode } from "react";
import {
  resolveBlockTypography,
  type FontFamilyToken,
  type FontWeightToken,
} from "../lib/nexusTypography";
import { isSafeHref, sanitizeRichTextHtml } from "../lib/richTextContent";

/** Debounce interval for sidebar rich-text commits (ms). */
const TEXT_COMMIT_DEBOUNCE_MS = 400;

/** Props passed by Puck to the Tiptap field renderer. */
interface TiptapFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/** Toolbar button definition. */
interface ToolbarButton {
  label: ReactNode;
  title: string;
  isActive: () => boolean;
  action: () => void;
}

/**
 * Prompt for a hyperlink URL and apply or remove the link mark.
 *
 * @param editor - Active Tiptap editor instance.
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
 * Rich text editor with StarterKit formatting toolbar.
 *
 * @param props - Puck custom field props.
 * @returns Tiptap editor UI.
 */
export function TiptapField({ field, value, onChange }: TiptapFieldProps) {
  const { selectedItem } = usePuck();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const blockProps = selectedItem?.props as {
    fontFamily?: FontFamilyToken;
    fontWeight?: FontWeightToken;
  } | undefined;
  const typography = resolveBlockTypography(
    "NexusText",
    blockProps?.fontFamily,
    blockProps?.fontWeight,
  );

  const commitHtml = useCallback((html: string) => {
    onChangeRef.current(html);
  }, []);

  const scheduleCommit = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        commitHtml(html);
      }, TEXT_COMMIT_DEBOUNCE_MS);
    },
    [commitHtml],
  );

  const flushCommit = useCallback(
    (editorInstance: NonNullable<ReturnType<typeof useEditor>>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const html = sanitizeRichTextHtml(editorInstance.getHTML());
      commitHtml(html);
    },
    [commitHtml],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          class: "nexus-rich-text__link",
        },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "nexus-tiptap-editor__content",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      const html = sanitizeRichTextHtml(nextEditor.getHTML());
      scheduleCommit(html);
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
    if (editor.isFocused) return;
    const current = sanitizeRichTextHtml(editor.getHTML());
    const incoming = sanitizeRichTextHtml(value || "");
    if (incoming !== current) {
      editor.commands.setContent(incoming || "<p></p>", { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return (
      <FieldLabel label={field.label || "Text Content"}>
        <div className="nexus-tiptap-editor nexus-tiptap-editor--loading">Loading editor…</div>
      </FieldLabel>
    );
  }

  const buttons: ToolbarButton[] = [
    {
      label: "B",
      title: "Bold",
      isActive: () => editor.isActive("bold"),
      action: () => editor.chain().focus().toggleBold().run(),
    },
    {
      label: "I",
      title: "Italic",
      isActive: () => editor.isActive("italic"),
      action: () => editor.chain().focus().toggleItalic().run(),
    },
    {
      label: "S",
      title: "Strikethrough",
      isActive: () => editor.isActive("strike"),
      action: () => editor.chain().focus().toggleStrike().run(),
    },
    {
      label: "</>",
      title: "Inline code",
      isActive: () => editor.isActive("code"),
      action: () => editor.chain().focus().toggleCode().run(),
    },
    {
      label: <Link2 size={13} strokeWidth={2} aria-hidden />,
      title: "Add or edit link",
      isActive: () => editor.isActive("link"),
      action: () => handleLinkAction(editor),
    },
    {
      label: <Unlink size={13} strokeWidth={2} aria-hidden />,
      title: "Remove link",
      isActive: () => false,
      action: () => editor.chain().focus().unsetLink().run(),
    },
    {
      label: "H1",
      title: "Heading 1",
      isActive: () => editor.isActive("heading", { level: 1 }),
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      label: "H2",
      title: "Heading 2",
      isActive: () => editor.isActive("heading", { level: 2 }),
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "H3",
      title: "Heading 3",
      isActive: () => editor.isActive("heading", { level: 3 }),
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "•",
      title: "Bullet list",
      isActive: () => editor.isActive("bulletList"),
      action: () => editor.chain().focus().toggleBulletList().run(),
    },
    {
      label: "1.",
      title: "Numbered list",
      isActive: () => editor.isActive("orderedList"),
      action: () => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "❝",
      title: "Blockquote",
      isActive: () => editor.isActive("blockquote"),
      action: () => editor.chain().focus().toggleBlockquote().run(),
    },
  ];

  return (
    <FieldLabel label={field.label || "Text Content"}>
      <div
        className="nexus-tiptap-editor"
        style={{
          fontFamily: typography.fontFamily,
          fontWeight: typography.fontWeight,
        }}
      >
        <div className="nexus-tiptap-editor__toolbar" role="toolbar" aria-label="Text formatting">
          {buttons.map((btn) => (
            <button
              key={btn.title}
              type="button"
              className={
                btn.isActive()
                  ? "nexus-tiptap-editor__btn nexus-tiptap-editor__btn--active"
                  : "nexus-tiptap-editor__btn"
              }
              title={btn.title}
              aria-pressed={btn.isActive()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={btn.action}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </FieldLabel>
  );
}

export default TiptapField;
