"use client";

/**
 * @fileoverview Tiptap rich text editor custom field for Puck sidebars.
 *
 * @module src/components/puck/fields/TiptapField
 */

import { FieldLabel } from "@measured/puck";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";
import { sanitizeRichTextHtml } from "../lib/richTextContent";

/** Props passed by Puck to the Tiptap field renderer. */
interface TiptapFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/** Toolbar button definition. */
interface ToolbarButton {
  label: string;
  title: string;
  isActive: () => boolean;
  action: () => void;
}

/**
 * Rich text editor with StarterKit formatting toolbar.
 *
 * @param props - Puck custom field props.
 * @returns Tiptap editor UI.
 */
export function TiptapField({ field, value, onChange }: TiptapFieldProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class: "nexus-tiptap-editor__content",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      const html = sanitizeRichTextHtml(nextEditor.getHTML());
      onChange(html);
    },
  });

  useEffect(() => {
    if (!editor) return;
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
      <div className="nexus-tiptap-editor">
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
