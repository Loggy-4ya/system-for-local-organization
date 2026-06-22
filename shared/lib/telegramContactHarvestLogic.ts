/**
 * @fileoverview Pure validation for Telegram bot shared-contact phone harvest.
 *
 * @module shared/lib/telegramContactHarvestLogic
 *
 * Tests: `npm run test:telegram-contact-harvest`
 * Registry: `.ai/docs/testing.md`
 */

import { normalizePhoneInput } from "@shared/validation/phoneSchema";

/** Telegram `message.contact` payload subset from Bot API updates. */
export interface TelegramSharedContactPayload {
  /** E.164-style phone string from Telegram. */
  phone_number?: string;
  /** Optional vCard payload when Telegram omits `phone_number`. */
  vcard?: string;
  /** Telegram user id embedded in the shared contact card. */
  user_id?: number | string;
  /** Contact first name — informational only. */
  first_name?: string;
}

/** Result of validating a shared contact for phone harvest. */
export interface TelegramSharedContactValidation {
  /** Whether the contact may be persisted. */
  ok: boolean;
  /** Normalized phone when {@link ok} is true. */
  phone: string | null;
  /** Machine-readable rejection reason for bot replies. */
  reason: "missing_phone" | "self_mismatch" | "invalid_phone" | null;
}

/**
 * Coerce Telegram user ids from Bot API / initData JSON into a finite integer.
 *
 * Webhook JSON occasionally delivers ids as strings; strict equality would reject valid shares.
 *
 * @param value - Raw id from Telegram payloads.
 * @returns Normalized numeric id or null when not parseable.
 */
export function normalizeTelegramUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return null;
}

/**
 * Extract a dialable phone from a Telegram shared-contact payload.
 *
 * @param contact - `message.contact` from a Bot API update.
 * @returns Raw phone candidate or null when absent.
 */
export function extractTelegramContactPhone(
  contact: TelegramSharedContactPayload,
): string | null {
  if (contact.phone_number?.trim()) {
    return contact.phone_number.trim();
  }

  if (!contact.vcard?.trim()) {
    return null;
  }

  const telMatch = contact.vcard.match(/TEL[^:\n]*:([+\d\s\-()]+)/i);
  return telMatch?.[1]?.trim() ?? null;
}

/**
 * Validate that a Telegram user shared their own contact and normalize the phone.
 *
 * @param senderTelegramId - `message.from.id` for the inbound update.
 * @param contact - `message.contact` payload from Telegram.
 * @returns Validation outcome with normalized phone when accepted.
 */
export function validateTelegramSharedContact(
  senderTelegramId: number | string,
  contact: TelegramSharedContactPayload,
): TelegramSharedContactValidation {
  const senderId = normalizeTelegramUserId(senderTelegramId);
  if (senderId == null) {
    return { ok: false, phone: null, reason: "invalid_phone" };
  }

  const rawPhone = extractTelegramContactPhone(contact);
  if (!rawPhone) {
    return { ok: false, phone: null, reason: "missing_phone" };
  }

  const normalized = normalizePhoneInput(rawPhone);
  if (!normalized) {
    return { ok: false, phone: null, reason: "invalid_phone" };
  }

  const contactUserId = normalizeTelegramUserId(contact.user_id);
  if (contactUserId != null && contactUserId !== senderId) {
    return { ok: false, phone: null, reason: "self_mismatch" };
  }

  return { ok: true, phone: normalized, reason: null };
}
