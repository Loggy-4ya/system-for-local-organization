# Nexus Page Variables (`${{ name }}`)

**Status:** `[x] Completed` — basic page field automation in Puck block renderers.

**Related:** [page_metadata_and_engagement.md](./page_metadata_and_engagement.md), [page_access_and_paths.md](./page_access_and_paths.md)

---

## Syntax

In Puck block text, HTML, image URL, or link fields:

```text
${{ title }}
${{ description }}
${{ image }}
```

Spaces inside the braces are allowed: `${{ title }}`.

Unknown names stay literal so editors can spot mistakes.

---

## Available variables

| Variable | Source |
|----------|--------|
| `title` | Page Details → title |
| `description` | Publication → description |
| `image`, `coverImage` | Publication → cover image URL (alias of `image1`) |
| `image1` | Primary publication cover image URL |
| `image2` | Second publication gallery image |
| `image3` | Third publication gallery image |
| `image4` | Fourth publication gallery image |
| `slug` | Page Details → URL slug |
| `path`, `url` | Canonical page path (`/news/fair`) |
| `categories` | Page Details → categories (comma-separated) |
| `author`, `authorName` | Primary publisher display name |
| `views`, `likes` | Public engagement counters |
| `publishDate` | Scheduled / published date (locale formatted) |

Catalog: `shared/constants/nexusPageVariables.ts`.

---

## Resolution

| Module | Role |
|--------|------|
| `shared/lib/nexusPageVariables.ts` | `buildNexusPageVariableMap`, `interpolateNexusPageVariables` |
| `nexusPageVariablesContext.tsx` | React provider on `PageRoot`; merges live Puck root props + `PageMetadataDto` |
| `useInterpolatedNexusValue()` | Hook used by block renderers |

Editor and published views both wrap content in `PageEditorMetaProvider` + `NexusPageVariablesFromRoot` so variables reflect live sidebar edits in the canvas.

---

## Blocks with interpolation

- Body Text (`NexusRichTextView`)
- Heading
- Image (src + alt)
- Button (label + href)
- Blockquote (text + author)
- News Card (image, title, description, category, read time, href)
- News Catalog block (admin-curated hub — see [page_categories_hub.md](./page_categories_hub.md))

---

## Tests

`npm run test:run -- nexus-page-variables`
