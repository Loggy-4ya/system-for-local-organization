# Nexus Rich Text Editor (Mentions + Slash Commands)

**Status:** In progress — site-wide TipTap foundation shipped; comments composer + read view wired; page hover preview cards planned.

## Goal

Provide a reusable rich text editor for comments, news, task reports, and any authenticated compose surface.

- **`@` mentions** — tag users and internal pages (rendered as badge chips)
- **`/` slash commands** — Notion-style block and inline formatting menu
- **Page hover preview** (planned) — `data-page-path` + `onPageMentionHover` hook on read view
- **Go-live mention inbox** — on first publish, {@link PageDomain} notifies `@` user mentions in Puck rich text (`page_mention` inbox kind); page author excluded — see [page_metadata_and_engagement.md](./page_metadata_and_engagement.md)

## Architecture

| Layer | Path | Role |
|-------|------|------|
| Types | `shared/lib/nexusMentionTypes.ts` | `NexusMentionItem`, href builders, search result shapes |
| Domain | `shared/domains/MentionDomain.ts` | MongoDB search for users + published pages |
| API | `src/app/api/mentions/search/route.ts` | `GET ?q=` — session-required autocomplete |
| Sanitizer | `shared/lib/nexusRichTextSanitize.ts` | Allowlist HTML + `data-nexus-mention` anchors; **single regex SSR path** for identical server/client output (strips TipTap attrs like `dir="auto"`) |
| Content policy | `shared/lib/contentPolicy.ts` | Blocked-word scan on editor plain text; server-side via `puckContentPolicy` + Zod |
| Safe URLs | `shared/lib/safeHref.ts`, `shared/lib/safeMediaUrl.ts` | Hyperlink and media-src validation for Puck blocks and rich text |
| Puck sanitize | `shared/lib/puckContentSanitize.ts` | Server-side walk of `puckData` on `POST /api/puck` before MongoDB write |
| CSP | `src/lib/contentSecurityPolicy.ts` | `Content-Security-Policy` header via `src/middleware.ts` |
| Slash catalog | `src/lib/nexusEditor/slashCommandCatalog.ts` | `/` menu definitions + query filtering |
| Slash apply | `src/lib/nexusEditor/applySlashCommand.ts` | Maps command ids → TipTap editor chains |
| Client fetch | `src/lib/nexusEditor/mentionQueryClient.ts` | Default `fetchMentionSearch` helper |
| Mention node | `src/components/editor/extensions/NexusMentionExtension.ts` | Inline atom + `@tiptap/suggestion` |
| Link mark | `src/components/editor/extensions/NexusEditorLinkExtension.ts` | Hyperlinks excluding `data-nexus-mention` anchors (prevents mention ↔ link parse collisions) |
| Slash extension | `src/components/editor/extensions/NexusSlashCommandExtension.ts` | `/` menu + `@tiptap/suggestion` |
| Editor | `src/components/editor/NexusRichTextEditor.tsx` | Controlled HTML editor (`variant`: minimal / default / full) |
| Read view | `src/components/editor/NexusRichTextView.tsx` | Sanitized render + page-hover hook stubs |
| Styles | `src/app/nexus-editor.css` | Badge chips, toolbar, suggestion popups |
| Popup logic | `src/components/editor/lib/suggestionPortalLogic.ts`, `createSuggestionPortalRenderer.ts` | Fixed viewport positioning, stale portal cleanup, hide-until-positioned |

## Suggestion popups (`@` and `/`)

TipTap suggestion menus render through `ReactRenderer` into a `document.body` portal (not inside the Puck sidebar scrollport). Positioning uses **`position: fixed`** + `clientRect()` viewport coordinates so nested editor scroll does not drift the menu.

Orphan popups in the **top-left corner** appeared when stale portals were not cleaned up or `clientRect()` briefly returned a zero rect.

**Double `@` before mentions** came from three sources (fixed 2026-06): the editor badge rendered an `AtSign` icon *and* `@label` text; mention anchors parsed inner `@label` text as sibling plaintext; legacy HTML could leave an orphan trigger `@` before the anchor. Fixes: `getContent: () => ''` on mention parse rules, `normalizeMentionLabel()`, `repairLegacyMentionHtml()` in sanitization, and a single `@` prefix in the badge UI.

**Dropdown vanishing** while typing `@` was caused by Puck field commits firing during an active suggestion session (parent re-render). Commits are now deferred until the suggestion closes.

**Duplicate people rows** (e.g. several identical `admin` entries) were caused by duplicate search rows reaching the popup and/or multiple mounted editors opening mention menus. Fixes: `dedupeNexusMentionItems` / `dedupeUserSearchCandidates` at domain, API client, editor search, and `MentionSuggestionList`; suggestion plugins use `shouldShow: () => editor.isFocused` so only the active editor opens a menu.

## Slash commands — no extra package

TipTap documents slash commands as an **experiment** with **no published `@tiptap/*` package** ([slash commands docs](https://tiptap.dev/docs/examples/experiments/slash-commands)). The official approach is `@tiptap/suggestion` — already installed for `@` mentions. Nexus implements `/` the same way.

### Default commands by variant

| Command | minimal | default | full |
|---------|---------|---------|------|
| Text (paragraph) | ✓ | ✓ | ✓ |
| Heading 2 | ✓ | ✓ | ✓ |
| Heading 3 | | ✓ | ✓ |
| Bullet list | ✓ | ✓ | ✓ |
| Numbered list | | ✓ | ✓ |
| Quote | ✓ | ✓ | ✓ |
| Code block | | ✓ | ✓ |
| Divider | | | ✓ |
| Bold / Italic / Strike | | | ✓ |

### Custom slash commands

```tsx
import {
  NexusRichTextEditor,
  type NexusSlashCommandDefinition,
} from "@/components/editor";

const taskCommands: NexusSlashCommandDefinition[] = [
  {
    id: "bulletList",
    title: "Checklist",
    keywords: ["checklist", "todo"],
    group: "lists",
    icon: "list",
    variants: ["default", "full"],
  },
];

<NexusRichTextEditor slashCommands={taskCommands} ... />
```

Host-defined rows **merge** with defaults (same `id` = duplicate entry — prefer unique ids for custom blocks).

## Stored HTML contract

Mentions persist as inline anchors (not plain `@text`):

```html
<a href="/users/{id}" data-nexus-mention data-mention-type="user" ...>@Name</a>
<a href="/news" data-nexus-mention data-mention-type="page" data-page-path="/news" ...>@News</a>
```

Slash commands mutate block structure (headings, lists, `hr`, `pre`) — no special HTML token.

## Usage

```tsx
"use client";

import { useState } from "react";
import { NexusRichTextEditor, NexusRichTextView } from "@/components/editor";

export function CommentComposer() {
  const [body, setBody] = useState("");

  return (
    <>
      <NexusRichTextEditor value={body} onChange={setBody} variant="default" />
      <NexusRichTextView html={body} enablePagePreviews />
    </>
  );
}
```

Type `/` at the start of a line (or after whitespace) to open the command menu. Type `@` anywhere for mentions.

## Acceptance criteria

- [x] `@` opens grouped autocomplete (People, Pages)
- [x] `/` opens grouped slash command menu (Basic, Lists, Blocks, Inline)
- [x] Selected slash commands replace `/query` and apply formatting
- [x] Selected mention targets insert non-editable inline badge nodes
- [x] Stored HTML sanitizes mention attrs and strips scripts (SSR regex path preserves inline mention anchors without duplicating `@label</a>` tails)
- [x] Read-only view sanitizes with the same SSR-safe path on server and client (no hydration mismatch from TipTap attrs)
- [x] Read-only view renders badges with Nexus tokens
- [x] Page mentions include `data-page-path` + hover callback hook
- [ ] Public `/users/[id]` profile route
- [ ] Page hover preview card component
- [x] Adopt in Puck `TiptapField` / `NexusText` body text block

## Dependencies

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/suggestion` (3.26.x)
- `immediatelyRender: false` on `useEditor` for Next.js SSR safety

## Tests

- `npm run test:run -- nexus-editor-content` — `tests/lib/nexusEditor/nexusEditorContent.test.ts`
- `npm run test:run -- nexus-editor-slash` — `tests/lib/nexusEditor/slashCommandCatalog.test.ts`
- `npm run test:run -- suggestion-portal-logic` — `tests/lib/suggestionPortalLogic.test.ts`
- `npm run test:run -- nexus-mention-types` — `tests/shared/lib/nexusMentionTypes.test.ts`
- `npm run test:run -- browser:puck-inline-mention` — Playwright: mention badge render + href in Puck Body Text
