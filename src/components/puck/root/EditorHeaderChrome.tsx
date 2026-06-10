"use client";

/**
 * @fileoverview Non-interactive header chrome preview rendered inside PageRoot.
 *
 * Visual placeholder matching {@link GlobalHeader} for Puck pages. Structured
 * with semantic `data-*` regions for future nav CRUD wiring.
 *
 * @module src/components/puck/root/EditorHeaderChrome
 */

import Image from "next/image";
import { BRAND } from "@/lib/assets";

/** Props for the editor header chrome preview. */
export interface EditorHeaderChromeProps {
  /** When true, shows a subtle preview badge (editor mode). */
  isEditor?: boolean;
}

/**
 * Fixed header dummy rendered at the top of every Puck page root.
 *
 * @param props - See {@link EditorHeaderChromeProps}.
 * @returns Header chrome JSX subtree.
 */
export function EditorHeaderChrome({ isEditor = false }: EditorHeaderChromeProps) {
  const navLinks = ["News", "Council Apply", "Propose Activity", "Create Page"];

  return (
    <header
      className="relative z-20 flex h-[72px] w-full shrink-0 items-center justify-center px-6"
      role="banner"
      aria-label="Site header preview"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="glass-panel flex w-full max-w-[1200px] items-center justify-between px-4 py-[10px]"
        style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,0.35)" }}
      >
        <div className="flex items-center gap-5" data-header-nav>
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-md"
            style={{ background: "var(--color-accent-user)" }}
          >
            <Image
              src={BRAND.logo}
              alt=""
              width={16}
              height={16}
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </span>
          <nav aria-label="Primary navigation preview">
            <ul className="m-0 flex list-none items-center gap-5 p-0">
              {navLinks.map((label) => (
                <li key={label}>
                  <span className="text-[13px] text-[var(--color-text-secondary)]">{label}</span>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="flex flex-col items-end gap-[3px]" data-header-actions>
          {isEditor && (
            <span
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--color-text-secondary)",
                opacity: 0.8,
              }}
            >
              Header preview
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[var(--color-accent-user)] px-[10px] py-[5px] text-[12px] font-medium text-white">
              + New Page
            </span>
            <span
              className="h-[28px] w-[28px] rounded-full"
              style={{
                border: "2px solid var(--color-accent-user)",
                background: "var(--color-bg-elevated)",
              }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </header>
  );
}

export default EditorHeaderChrome;
