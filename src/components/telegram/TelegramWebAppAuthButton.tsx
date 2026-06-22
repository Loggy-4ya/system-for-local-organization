/**
 * @fileoverview Primary Telegram auth button for pages opened inside the Mini App WebView.
 *
 * The official Login Widget iframe does not render in Telegram — this button uses
 * signed `initData` instead (same flow as `/telegram`).
 *
 * @module src/components/telegram/TelegramWebAppAuthButton
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { FormAlert } from "@/components/ui/form-alert";
import { signInViaTelegramMiniApp } from "@/lib/telegramMiniAppAuthClient";
import { cn } from "@/lib/utils";

/** Props for {@link TelegramWebAppAuthButton}. */
export interface TelegramWebAppAuthButtonProps {
  /** Post-auth redirect when sign-in succeeds. */
  callbackUrl?: string;
  /** Button label — defaults to a Telegram-branded sign-in string. */
  label?: string;
  /** Full-width CTA styling. */
  fullWidth?: boolean;
  /** Match sibling OAuth provider buttons when embedded in a row. */
  variant?: VariantProps<typeof buttonVariants>["variant"];
  /** Show the Telegram send icon before the label. */
  showIcon?: boolean;
  /** Optional extra class names on the button. */
  className?: string;
}

/**
 * Sign-in button that authenticates via Telegram Mini App `initData`.
 *
 * @param props - Redirect target and presentation options.
 * @returns Telegram Mini App auth button JSX.
 */
export function TelegramWebAppAuthButton({
  callbackUrl = "/profile",
  label = "Sign in with Telegram",
  fullWidth = true,
  variant = "default",
  showIcon = true,
  className,
}: TelegramWebAppAuthButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Trigger initData authentication against the Mini App API. */
  async function handleClick() {
    setError(null);
    setLoading(true);

    try {
      const result = await signInViaTelegramMiniApp(callbackUrl);
      if (result.needsOnboarding) {
        router.push("/telegram");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Telegram sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", !fullWidth && "min-w-0 flex-1")}>
      <Button
        type="button"
        variant={variant}
        className={cn(fullWidth && "w-full", !fullWidth && "w-full", "gap-2", className)}
        disabled={loading}
        onClick={() => void handleClick()}
      >
        {showIcon ? <Send className="size-4" aria-hidden="true" /> : null}
        {loading ? "Connecting…" : label}
      </Button>
      {error ? <FormAlert variant="error">{error}</FormAlert> : null}
    </div>
  );
}

export default TelegramWebAppAuthButton;
