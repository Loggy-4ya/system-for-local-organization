# Content Policy (Blocked Words & Weak Passwords)

**Status:** `[x] Completed` — central blocklists, runtime cache, admin editor at `/admin/general-rules`.

## Goal

One institutional **content policy** for user-authored text and password denylist checks. Seed constants bootstrap MongoDB; admins edit live rules on the **General Rules** page. Validation logic is shared across web API routes, Zod schemas, Telegram bot, and Puck editor.

See also: [general_rules.md](./general_rules.md) (admin UI, Telegram templates, MongoDB singleton).

## Single source of truth

| Artifact | Path | Role |
|----------|------|------|
| Seed blocklists | `shared/constants/contentPolicy.ts` | Defaults for first MongoDB seed |
| Admin editor | `/admin/general-rules` | Live blocked words, weak passwords, messages |
| Runtime cache | `shared/lib/effectiveGeneralRulesCache.ts` | In-process snapshot (60s TTL) |
| Scan / validate helpers | `shared/lib/contentPolicy.ts` | Normalisation, scan, mask, weak-password lookup |
| Password strength (classes, length) | `shared/lib/passwordStrength.ts` | Uses weak-password denylist via `isWeakPolicyPassword` |

## Blocked-word matching

1. Unicode NFKC + lowercase
2. Basic leetspeak map (`@→a`, `1→i`, `0→o`, …)
3. Strip combining marks; collapse punctuation to spaces
4. Word-boundary match (avoids substring hits inside unrelated words where possible)

### Public API (`shared/lib/contentPolicy.ts`)

| Function | Purpose |
|----------|---------|
| `normalizeContentPolicyText` | Normalise input for comparison |
| `scanContentPolicyText` | Full scan with `{ matches, hasBlockedWord }` |
| `containsBlockedWord` | Boolean guard |
| `getBlockedWordError` | First validation error message |
| `maskBlockedWords` | Replace hits with `*` (display/moderation preview) |
| `isWeakPolicyPassword` | Denylist lookup |
| `getWeakPolicyPasswordError` | Weak-password validation message |

## Field-kind exclusions

Content policy applies to **prose plain-text only**. These are never blocklist-scanned:

| Kind | Examples |
|------|----------|
| `numeric` | Group number (`42`), digit-only catalog values |
| `tel` | Phone inputs |
| `email` / `password` / `url` / `login` | Structured credentials and handles |

Server-side: `shouldSkipContentPolicyPlainText()` also skips any value that is digits-only.

Client-side: `useContentPolicyFields()` + `getContentPolicyFieldError()` in `src/lib/useContentPolicyField.ts` — live blur errors on profile/signup name, surname, about, specialty (not group).

## Integration status

- [x] Zod refinements: profile, signup, directory labels, broadcasts
- [x] Puck save: reject blocked language in `POST /api/puck` (title, categories, block props)
- [x] TipTap editor: inline blocked-word feedback; blocks parent `onChange` until clean
- [x] Global Layout: label/title/mention/copyright checks in `GlobalLayoutDomain`
- [x] Admin UI: **General Rules** page (MongoDB-backed override of seed constants)
- [ ] Client forms fetch `/api/general-rules/effective` for live validation sync with DB
- [ ] Audit log rows when content is rejected (reuse `SecuritySanitizeAudit` pattern)

## Wired surfaces

| Surface | Enforcement |
|---------|-------------|
| `NexusRichTextEditor` | Client: `editor.getText()` scan; reverts on blur when dirty |
| `PageCommentComposer` / `POST /api/pages/comments` | Client: `getPageCommentValidationError` + `/api/general-rules/effective`; server: `CommentDomain.createPageComment` after `GeneralRulesDomain.ensureLoaded` |
| `POST /api/puck` | Server: `puckContentPolicy` + title/category scan |
| `PATCH /api/profile` | Zod: `profileUpdateSchema` |
| Signup / register | Zod: `signupSchema`, `registerSchema` |
| Admin directory | Zod: `userDirectoryQuerySchema`, `adminUserUpdateSchema` labels |
| Broadcasts | Zod: `sendBroadcastSchema` |
| Global layout | `GlobalLayoutDomain.validateHeader/Footer` |

## Tests

```bash
npm run test:run -- content-policy
npm run test:run -- password-strength
npm run test:run -- general-rules-domain
```

## Acceptance (foundation)

- [x] Central constants file for blocked words + weak passwords
- [x] Pure scan module with leetspeak + word boundaries
- [x] `passwordStrength` reads weak list from constants (no duplicate arrays)
- [x] Wired into API save paths and TipTap editor (see Wired surfaces)
- [ ] Wired into every future compose surface as it ships
