"use client";

/**
 * @fileoverview Puck sidebar field — delegates to site-wide {@link NexusRichTextEditor}.
 *
 * Provides `@` mentions, `/` slash commands, and full formatting for the
 * {@link NexusText} body text block.
 *
 * @module src/components/puck/fields/TiptapField
 */

import { FieldLabel } from "@puckeditor/core";
import { useTranslations } from "next-intl";
import { NexusRichTextEditor } from "@/components/editor/NexusRichTextEditor";
import { useNexusPuck } from "../lib/useNexusPuck";
import {
  resolveBlockTypography,
  type FontFamilyToken,
  type FontWeightToken,
} from "../lib/nexusTypography";

/** Props passed by Puck to the Tiptap field renderer. */
interface TiptapFieldProps {
  field: { label?: string };
  value: string;
  onChange: (value: string) => void;
}

/**
 * Puck custom field for rich body text — wraps {@link NexusRichTextEditor}.
 *
 * @param props - Puck custom field props.
 * @returns Rich text editor inside a {@link FieldLabel}.
 */
export function TiptapField({ field, value, onChange }: TiptapFieldProps) {
  const t = useTranslations("puck.fieldHints");
  const selectedItem = useNexusPuck((state) => state.selectedItem);

  const blockProps = selectedItem?.props as {
    fontFamily?: FontFamilyToken;
    fontWeight?: FontWeightToken;
  } | undefined;
  const typography = resolveBlockTypography(
    "NexusText",
    blockProps?.fontFamily,
    blockProps?.fontWeight,
  );

  return (
    <FieldLabel label={field.label || "Text Content"}>
      <div
        className="nexus-rich-text-editor--puck-host"
        style={{
          fontFamily: typography.fontFamily,
          fontWeight: typography.fontWeight,
        }}
      >
        <NexusRichTextEditor
          value={value || ""}
          onChange={onChange}
          variant="full"
          className="nexus-rich-text-editor--puck"
          placeholder={t("tiptapPlaceholder")}
          minHeight={160}
        />
      </div>
    </FieldLabel>
  );
}

export default TiptapField;
