# Content Security (XSS Hardening)

**Status:** In progress — core layers shipped; audit logging and stricter CSP (nonces) planned.

## Goal

Reduce stored and reflected XSS risk across Puck pages, rich text, and media uploads without breaking the Next.js editor or YouTube embeds.

## Defense layers

| Layer | Path | When it runs |
|-------|------|--------------|
| Rich text allowlist | `shared/lib/nexusRichTextSanitize.ts` | TipTap output, read view, Puck `text`/`content` props |
| Safe hyperlinks | `shared/lib/safeHref.ts` | Rich text `<a href>`, `NexusButton`, `NexusNewsCard` |
| Safe media URLs | `shared/lib/safeMediaUrl.ts` | `<img src>`, `<video src>`, Puck `image` props |
| Puck persistence | `shared/lib/puckContentSanitize.ts` → `POST /api/puck` | Before MongoDB upsert |
| Render-time guards | Puck block renderers (`NexusImageRender`, `NexusVideoRender`, …) | Published pages + editor preview |
| SVG upload block | `shared/lib/mediaStorage/mediaStorageRules.ts` | All image upload paths |
| Remote import | `shared/lib/mediaStorage/remoteImageImport.ts` | HTTPS raster sniff only (no SVG) |
| CSP header | `src/lib/contentSecurityPolicy.ts` → `src/middleware.ts` | Every matched HTML response |

## Allowed link schemes

- Same-origin paths (`/news`, `#section`)
- `https://`, `http://`, `mailto:`, `tel:`

Rejected: `javascript:`, `data:`, `vbscript:`, protocol-relative `//…`.

## Content-Security-Policy (current)

Balanced for Next.js App Router (`'unsafe-inline'` scripts required today):

- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- `frame-src` allows YouTube and Vimeo embed hosts
- `img-src` allows self, data/blob, Google avatars, Telegram, GCS hosts
- Dev mode adds `'unsafe-eval'` for HMR

Future: migrate to nonce-based `script-src` when Next.js static chunks support it.

## Tests

```bash
npm run test:safe-href
npm run test:puck-content-sanitize
npm run test:content-security-policy
npm run test:nexus-editor-content
npm run test:media-storage   # includes SVG rejection
```

Registry: [testing.md](../testing.md)

## Acceptance criteria

- [x] `POST /api/puck` sanitizes user-authored strings before persistence
- [x] Puck blocks strip unsafe `href` and media URLs at render time
- [x] Rich text sanitizer shared between web and Node tests
- [x] SVG uploads rejected at validation layer
- [x] CSP header on middleware-matched routes
- [ ] Stricter CSP with nonces (planned)
- [ ] Security audit log for blocked sanitization events (planned)
