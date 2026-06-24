"use client";

/**
 * @fileoverview Password input with show/hide toggle for auth and settings forms.
 *
 * @module src/components/ui/PasswordInput
 */

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * Password field that toggles between masked and plain text.
 *
 * @param props - Standard input props forwarded to the inner control.
 * @returns Password input with visibility toggle.
 */
export function PasswordInput({ className, disabled, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <InputGroup className={cn("h-9", className)}>
      <InputGroupInput
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          size="icon-sm"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          disabled={disabled}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? (
            <EyeOff className="size-4" aria-hidden="true" />
          ) : (
            <Eye className="size-4" aria-hidden="true" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}

export default PasswordInput;
