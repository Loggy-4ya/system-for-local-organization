# General Rules (Content Policy + Telegram Copy)

**Status:** `[x] Completed` — admin editor, MongoDB singleton, runtime cache, Telegram wiring.

## Goal

One admin workspace for **institutional general rules**:

1. **Content policy** — blocked words, weak passwords, user-facing validation messages
2. **Task delegation quotas** — per access-level limits for performer delegation chains
3. **Telegram bot copy** — editable templates for `/start`, Mini App button label, broadcast DM format
4. **Future** — additional bot command messages extend `TELEGRAM_MESSAGE_TEMPLATE_DEFS`

Numeric/structured inputs (group numbers, phones, logins) are **never** language-scanned.

## Admin UI

| Route | Guard | Component |
|-------|-------|-----------|
| `/admin/general-rules` | Legacy `Admin` | `GeneralRulesEditorShell` |

Hub tile: **General Rules** in `src/lib/adminHubAreas.ts`.

### Tabs

| Tab | Contents |
|-----|----------|
| Content policy | Blocked words textarea (`term` or `term \| category`), weak passwords textarea |
| Tasks | Per-tier delegation limits (`taskDelegationLimits`, `null` = unlimited) |
| Telegram bot | One field per registered template key |
| User messages | Blocked-language + weak-password form messages |

## Persistence

| Layer | Path |
|-------|------|
| MongoDB singleton | `general_rules_settings` via `shared/models/GeneralRulesSettings.ts` |
| Domain | `shared/domains/GeneralRulesDomain.ts` |
| Seed constants | `shared/constants/generalRules.ts` + `shared/constants/contentPolicy.ts` |
| Runtime cache | `shared/lib/effectiveGeneralRulesCache.ts` (60s TTL per process) |

## API

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/admin/general-rules` | Admin |
| POST | `/api/admin/general-rules` | Admin |
| GET | `/api/general-rules/effective` | Public (blocked terms + message for client live validation) |

## Runtime consumers

| Consumer | Behaviour |
|----------|-----------|
| `shared/lib/contentPolicy.ts` | Reads effective blocklist + messages from cache |
| `TelegramBotDomain.handleUpdate` | `/start` welcome + button label templates |
| `BroadcastDomain` + `telegramBroadcastFormat.ts` | Broadcast DM prefix template |
| Profile / Puck API | `GeneralRulesDomain.ensureLoaded()` before validation |
| `TaskDomain.delegateTask` | `TaskDomain.loadDelegationLimits()` from persisted `taskDelegationLimits` |

## Telegram template keys

| Key | Default use |
|-----|-------------|
| `startWelcome` | `/start` reply body |
| `startOpenButtonLabel` | Mini App inline button |
| `broadcastAnnouncementPrefix` | Institution broadcast DMs (`{title}`, `{body}`) |

## Tests

```bash
npm run test:general-rules-domain
npm run test:content-policy
```

## Acceptance

- [x] Admin page with save/reset toolbar
- [x] MongoDB-backed blocklist replaces in-memory-only constants after first load
- [x] Telegram `/start` uses editable templates
- [x] Numeric field exclusion documented and enforced (`shouldSkipContentPolicyPlainText`)
- [ ] Client forms fetch `/api/general-rules/effective` for live validation sync (optional follow-up)
