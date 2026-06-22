# Content Security (XSS Hardening)

**Status:** `[~] In Progress` — core layers, CSP nonces, sanitization audit, and admin viewer shipped; CSP reporting planned.

## Goal

Reduce stored and reflected XSS risk across Puck pages, rich text, and media uploads without breaking the Next.js editor or YouTube embeds.

## Defense layers

| Layer | Path | When it runs |
|-------|------|--------------|
| Rich text allowlist | `shared/lib/nexusRichTextSanitize.ts` | TipTap output, read view, Puck `text`/`content` props |
| Safe hyperlinks | `shared/lib/safeHref.ts` | Rich text `<a href>`, `NexusButton`, `NexusNewsCard` |
| Safe media URLs | `shared/lib/safeMediaUrl.ts` | `<img src>`, `<video src>`, Puck `image` props |
| Puck persistence | `shared/lib/puckContentSanitize.ts` → `POST /api/puck` | Before MongoDB upsert |
| Sanitization audit | `shared/lib/securitySanitizeAuditLog.ts` | When save sanitization mutates fields |
| Render-time guards | Puck block renderers (`NexusImageRender`, `NexusVideoRender`, …) | Published pages + editor preview |
| SVG upload block | `shared/lib/mediaStorage/mediaStorageRules.ts` | All image upload paths |
| Remote import | `shared/lib/mediaStorage/remoteImageImport.ts` | HTTPS raster sniff only (no SVG) |
| CSP header | `src/lib/contentSecurityPolicy.ts` → `src/middleware.ts` | Every matched HTML response |

## Allowed link schemes

- Same-origin paths (`/news`, `#section`)
- `https://`, `http://`, `mailto:`, `tel:`

Rejected: `javascript:`, `data:`, `vbscript:`, protocol-relative `//…`.

## Content-Security-Policy

### Nonce mode (production default)

When `CSP_USE_NONCE` is enabled (default in production):

1. Middleware generates a per-request nonce (`generateCspNonce`).
2. CSP uses `script-src 'self' 'nonce-…' 'strict-dynamic'` (no `'unsafe-inline'`).
3. Nonce is forwarded on `x-nonce` request header for Server Components.
4. Root layout passes `nonce` to `next/script` blocks (theme init, wallet shim).
5. Next.js attaches the nonce to framework script chunks when the CSP request header is set.

Dev default keeps legacy `'unsafe-inline'` unless `CSP_USE_NONCE=true`.

### Legacy inline mode (dev default)

- `script-src 'self' 'unsafe-inline'` (+ `'unsafe-eval'` in dev)
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- `frame-src` allows YouTube, Vimeo, and Telegram Login Widget (`oauth.telegram.org`) embed hosts

## Sanitization audit log

On `POST /api/puck`, when sanitization alters any field:

- Structured `console.warn` with path, field kind, and length metadata (no raw payload).
- MongoDB document in `security_sanitize_audits` unless `SECURITY_SANITIZE_AUDIT_PERSIST=false`.

Report types: `shared/lib/puckContentSanitizeReport.ts`.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `CSP_USE_NONCE` | `true` in production | Enable per-request script nonces |
| `SECURITY_SANITIZE_AUDIT_PERSIST` | persist | Set `false` for console-only audit |

## Tests

```bash
npm run test:safe-href
npm run test:puck-content-sanitize
npm run test:security-sanitize-audit
npm run test:content-security-policy
npm run test:nexus-editor-content
npm run test:media-storage
```

Registry: [testing.md](../testing.md)

## Acceptance criteria

- [x] `POST /api/puck` sanitizes user-authored strings before persistence
- [x] Puck blocks strip unsafe `href` and media URLs at render time
- [x] Rich text sanitizer shared between web and Node tests
- [x] SVG uploads rejected at validation layer
- [x] CSP header on middleware-matched routes
- [x] CSP nonces in production (`strict-dynamic`, no `unsafe-inline`)
- [x] Security audit log for blocked sanitization events
- [x] Admin UI to browse `security_sanitize_audits` at `/admin/logs` (Content sanitization section; legacy `/admin/security-audits` redirects)
