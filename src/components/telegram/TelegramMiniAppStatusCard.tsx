/**
 * @fileoverview Presentational status cards for the Telegram Mini App entry page.
 *
 * Full-width within the static page shell (1400px band). Gradient is limited to the
 * hero header; body surfaces use Nexus design tokens.
 *
 * @module src/components/telegram/TelegramMiniAppStatusCard
 */

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Bot,
  ExternalLink,
  LogIn,
  Send,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Visual tone for the status card hero. */
export type TelegramStatusTone = "setup" | "telegram" | "error";

/** Props for {@link TelegramMiniAppStatusCard}. */
export interface TelegramMiniAppStatusCardProps {
  /** Card heading shown in the hero. */
  title: string;
  /** Short supporting line under the title. */
  subtitle: string;
  /** Hero visual tone — drives icon accent color. */
  tone: TelegramStatusTone;
  /** Main body content below the hero. */
  children: ReactNode;
  /** Optional primary action rendered at the bottom. */
  action?: ReactNode;
}

const TONE_META: Record<TelegramStatusTone, { icon: LucideIcon; iconClass: string }> = {
  setup: {
    icon: Settings2,
    iconClass: "text-(--color-warning)",
  },
  telegram: {
    icon: Send,
    iconClass: "text-(--color-accent-user)",
  },
  error: {
    icon: AlertCircle,
    iconClass: "text-(--color-danger)",
  },
};

/** Shared outer shell classes — stretches to the static page max-width column. */
const CARD_SHELL_CLASS =
  "telegram-status-card glass-panel w-full overflow-hidden rounded-lg shadow-[0_16px_40px_-8px_rgba(15,23,41,0.14)]";

/**
 * Gradient hero + structured body card for Telegram Mini App states.
 *
 * @param props - See {@link TelegramMiniAppStatusCardProps}.
 * @returns Status card JSX.
 */
export function TelegramMiniAppStatusCard({
  title,
  subtitle,
  tone,
  children,
  action,
}: TelegramMiniAppStatusCardProps) {
  const { icon: Icon, iconClass } = TONE_META[tone];

  return (
    <div className={CARD_SHELL_CLASS}>
      <div
        className="telegram-status-card__hero relative px-6 py-10 sm:px-10 sm:py-12"
        style={{
          background:
            "linear-gradient(135deg, var(--accent-blue-strong) 0%, var(--accent-purple-strong) 100%)",
        }}
      >
        <div className="relative flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
          <div
            className={cn(
              "flex size-16 shrink-0 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--color-text-primary)_18%,transparent)] bg-[color-mix(in_srgb,var(--color-bg-surface)_55%,transparent)]",
              iconClass,
            )}
          >
            <Icon className="size-8" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-text-primary)_65%,transparent)]">
              Telegram Mini App
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-(--color-text-primary) sm:text-[28px]">
              {title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[color-mix(in_srgb,var(--color-text-primary)_78%,transparent)]">
              {subtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 bg-(--color-bg-panel) px-6 py-8 sm:px-10 sm:py-10">
        {children}
        {action ? <div className="flex flex-wrap gap-3">{action}</div> : null}
      </div>
    </div>
  );
}

/** Props for a numbered setup step row. */
export interface TelegramSetupStepProps {
  /** Step number (1-based). */
  step: number;
  /** Step title. */
  title: string;
  /** Step description. */
  children: ReactNode;
}

/**
 * Numbered setup step with system surface tokens.
 *
 * @param props - See {@link TelegramSetupStepProps}.
 * @returns Step row JSX.
 */
export function TelegramSetupStep({ step, title, children }: TelegramSetupStepProps) {
  return (
    <div className="flex h-full gap-4 rounded-md border border-(--color-border-default) bg-(--color-bg-surface) p-4 sm:p-5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-(--color-border-default) bg-(--color-bg-elevated) text-sm font-semibold text-(--color-accent-user)">
        {step}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold text-(--color-text-primary)">{title}</h2>
        <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-(--color-text-secondary)">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Monospace env-var or URL chip for setup instructions.
 *
 * @param props - Display value.
 * @returns Chip JSX.
 */
export function TelegramCodeChip({ children }: { children: ReactNode }) {
  return (
    <code className="inline-block max-w-full break-all rounded-md border border-(--color-border-default) bg-(--color-bg-cell) px-2.5 py-1.5 font-mono text-xs text-(--color-text-primary)">
      {children}
    </code>
  );
}

/** Props for {@link TelegramNotConfiguredCard}. */
export interface TelegramNotConfiguredCardProps {
  /** Public Mini App URL shown in setup step 3. */
  miniAppUrl: string;
}

/**
 * Polished setup card when bot credentials are missing.
 *
 * @param props - See {@link TelegramNotConfiguredCardProps}.
 * @returns Not-configured status card.
 */
export function TelegramNotConfiguredCard({ miniAppUrl }: TelegramNotConfiguredCardProps) {
  return (
    <TelegramMiniAppStatusCard
      tone="setup"
      title="Bot not configured yet"
      subtitle="Add your BotFather credentials so Nexus can verify Telegram sign-in and open this Mini App from your bot."
      action={
        <>
          <Link href="/login" className={cn(buttonVariants(), "h-11 gap-2 px-5")}>
            <LogIn className="size-4" aria-hidden />
            Sign in on the website
          </Link>
          <a
            href="https://core.telegram.org/bots#creating-a-new-bot"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "outline" }), "h-11 gap-2 px-5")}
          >
            <Bot className="size-4" aria-hidden />
            BotFather guide
            <ExternalLink className="size-3.5 opacity-70" aria-hidden />
          </a>
        </>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <TelegramSetupStep step={1} title="Add environment variables">
          <p>
            Copy these into <TelegramCodeChip>.env.local</TelegramCodeChip> and restart the app:
          </p>
          <div className="flex flex-col gap-2">
            <TelegramCodeChip>TELEGRAM_BOT_TOKEN=…</TelegramCodeChip>
            <TelegramCodeChip>NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=your_bot</TelegramCodeChip>
          </div>
        </TelegramSetupStep>

        <TelegramSetupStep step={2} title="Register the Mini App URL">
          <p>
            In BotFather, set the Web App URL to the address below (must match how you open Nexus):
          </p>
          <TelegramCodeChip>{miniAppUrl}</TelegramCodeChip>
        </TelegramSetupStep>

        <TelegramSetupStep step={3} title="Open from Telegram">
          <p>
            This page only works inside the Telegram app. After configuration, open your bot and tap{" "}
            <strong className="text-(--color-text-primary)">Open Nexus</strong> — or send{" "}
            <TelegramCodeChip>/start</TelegramCodeChip> when the webhook is set up.
          </p>
        </TelegramSetupStep>
      </div>
    </TelegramMiniAppStatusCard>
  );
}

/** Props for {@link TelegramOutsideAppCard}. */
export interface TelegramOutsideAppCardProps {
  /** Optional bot @username when configured. */
  botUsername?: string | null;
}

/**
 * Card shown when `/telegram` is opened outside the Telegram WebView.
 *
 * @param props - See {@link TelegramOutsideAppCardProps}.
 * @returns Outside-Telegram status card.
 */
export function TelegramOutsideAppCard({ botUsername }: TelegramOutsideAppCardProps) {
  const botLabel = botUsername ? `@${botUsername}` : "your Nexus bot";

  return (
    <TelegramMiniAppStatusCard
      tone="telegram"
      title="Open inside Telegram"
      subtitle="This is the Nexus Mini App entry — it receives signed authentication only from the Telegram app, not from a regular browser tab."
      action={
        <Link href="/login" className={cn(buttonVariants(), "h-11 gap-2 px-5")}>
          <LogIn className="size-4" aria-hidden />
          Use website sign-in instead
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-(--color-border-default) bg-(--color-bg-surface) p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)">
            In Telegram
          </p>
          <p className="mt-2 text-sm leading-relaxed text-(--color-text-secondary)">
            Open <strong className="text-(--color-text-primary)">{botLabel}</strong>, then tap{" "}
            <strong className="text-(--color-text-primary)">Open Nexus</strong> or send{" "}
            <TelegramCodeChip>/start</TelegramCodeChip>.
          </p>
        </div>
        <div className="rounded-md border border-(--color-border-default) bg-(--color-bg-surface) p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-(--color-text-secondary)">
            In a browser
          </p>
          <p className="mt-2 text-sm leading-relaxed text-(--color-text-secondary)">
            Use the login page with Google, credentials, or the Telegram Login Widget once
            the bot username is configured.
          </p>
        </div>
      </div>
    </TelegramMiniAppStatusCard>
  );
}

/** Props for {@link TelegramErrorCard}. */
export interface TelegramErrorCardProps {
  /** User-facing error message. */
  message?: string | null;
}

/**
 * Card shown when Mini App authentication fails.
 *
 * @param props - See {@link TelegramErrorCardProps}.
 * @returns Error status card.
 */
export function TelegramErrorCard({ message }: TelegramErrorCardProps) {
  return (
    <TelegramMiniAppStatusCard
      tone="error"
      title="Could not sign in"
      subtitle="Telegram did not complete authentication. This is usually fixed by reopening the Mini App from your bot."
    >
      {message ? (
        <div className="rounded-md border border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-danger)_8%,var(--color-bg-panel))] px-4 py-3 text-sm text-(--color-text-primary)">
          {message}
        </div>
      ) : null}
      <p className="text-sm leading-relaxed text-(--color-text-secondary)">
        Close this window, return to your bot chat, and launch <strong>Open Nexus</strong> again.
        If the problem persists, check that <TelegramCodeChip>TELEGRAM_BOT_TOKEN</TelegramCodeChip>{" "}
        matches the bot you opened.
      </p>
    </TelegramMiniAppStatusCard>
  );
}

/**
 * Full-width loading state matching the status card shell.
 *
 * @returns Loading card JSX.
 */
export function TelegramLoadingCard() {
  return (
    <div
      className={cn(
        CARD_SHELL_CLASS,
        "flex flex-col items-center gap-5 bg-(--color-bg-panel) px-8 py-14",
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl border border-(--color-border-default) bg-(--color-bg-elevated) text-(--color-accent-user)">
        <Send className="size-7 animate-pulse" strokeWidth={1.75} aria-hidden />
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-(--color-text-primary)">Connecting to Nexus</p>
        <p className="mt-1 text-sm text-(--color-text-secondary)">
          Verifying your Telegram session…
        </p>
      </div>
    </div>
  );
}

export default TelegramMiniAppStatusCard;
