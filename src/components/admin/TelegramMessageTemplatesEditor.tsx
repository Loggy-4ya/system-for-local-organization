"use client";

/**
 * @fileoverview Reusable admin form for institutional Telegram bot message templates.
 *
 * Used by {@link GeneralRulesEditorShell} and {@link TelegramBotMessagesEditorShell}.
 *
 * @module src/components/admin/TelegramMessageTemplatesEditor
 */

import type { TelegramMessageTemplateKey } from "@shared/constants/generalRules";
import { TELEGRAM_MESSAGE_TEMPLATE_DEFS } from "@shared/constants/generalRules";
import { FormField } from "@/components/ui/form-field";

/** Props for {@link TelegramMessageTemplatesEditor}. */
export interface TelegramMessageTemplatesEditorProps {
  /** Current template map (partial overrides merged with defaults at render). */
  templates: Partial<Record<TelegramMessageTemplateKey, string>>;
  /** Called when one template body changes. */
  onChange: (key: TelegramMessageTemplateKey, value: string) => void;
}

/**
 * Editable list of registered Telegram bot templates.
 *
 * @param props - Template map and change handler.
 * @returns Template textarea fields.
 */
export function TelegramMessageTemplatesEditor({
  templates,
  onChange,
}: TelegramMessageTemplatesEditorProps) {
  return (
    <>
      {TELEGRAM_MESSAGE_TEMPLATE_DEFS.map((def) => (
        <FormField
          key={def.key}
          label={def.label}
          htmlFor={`telegram-template-${def.key}`}
          hint={def.description}
        >
          <textarea
            id={`telegram-template-${def.key}`}
            rows={def.key === "startOpenButtonLabel" ? 2 : 4}
            value={templates[def.key] ?? def.defaultText}
            onChange={(e) => onChange(def.key, e.target.value)}
            className="w-full rounded-[var(--radius-md)] border border-(--color-border-default) bg-(--color-bg-elevated) px-3 py-2 text-sm text-(--color-text-primary)"
          />
        </FormField>
      ))}
    </>
  );
}

export default TelegramMessageTemplatesEditor;
