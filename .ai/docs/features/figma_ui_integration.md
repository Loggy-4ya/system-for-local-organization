# Figma UI Integration — Design System & Core Views

**Status:** `[~] In Progress` — tokens and page shells exist; **core screens are not production-ready** (see Section 5 gaps).

**Figma file:** [Project Nexus — Design System](https://www.figma.com/design/J2lVqyamWpo7Rxzah1Fq4i)

**File key:** `J2lVqyamWpo7Rxzah1Fq4i`

**Plan:** Figma Pro · Full seat

**Run ID:** `nexus-ds-2026-004`

> **Honest state:** Frames exist on pages 04–07 but most are **incomplete shells**, not finished designs. Do **not** mark this feature `[x]` until Section 5 acceptance criteria are truly met.

---

## 0. Agent MCP Operating Protocol (Pro Tier)

### Quality bar (mandatory for all frames)

- **Auto-layout** for all structural containers — no absolute-position hacks except root frame placement on canvas
- **Drop shadow** (`effect/shadow/lg`) on elevated panels
- **Glass panels:** white/dark surface at 92–97% opacity, 1px border, 16–24px corner radius
- **Transparent root frames** (1440×900) — `InfiniteGridEngine` shows through
- **Global header** — `Header/Global` component instance at top of every screen (72px slot; `1200px` contained glass bar; Nexus label stacked above theme picker)
- **Inter** typography with local text styles (Section 1)
- **Dark theme default** across all app screens (transparent roots; dark glass panels)
- **Incremental `use_figma`** — one screen per call; return all node IDs

### Token architecture

```
Nexus/Primitives     → VariableCollectionId:2:2
Nexus/Color          → VariableCollectionId:10:2 (Light + Dark modes)
Nexus/User Accent    → VariableCollectionId:75:14 (5 color modes — user preference)
Nexus/Spacing        → VariableCollectionId:4:2
Nexus/Radius         → VariableCollectionId:4:9
```

Legacy collections `Nexus/Color/Light` / `Nexus/Color/Dark` — safe to delete manually in Figma.

### Theming model (Light/Dark + user accent)

| Layer | Purpose | User control |
|-------|---------|--------------|
| **Light / Dark** (`Nexus/Color`) | Surfaces, text, borders | Global theme toggle |
| **User accent** (`Nexus/User Accent`) | Chrome: active tabs, primary buttons, links, avatar ring | User picks **1 of 5 families** (Red-Orange, Yellow, Green, Blue, Purple) and **1 of 3 shades** (soft / medium / strong) |
| **Semantic** (`color/warning`, `color/danger`, `color/success`) | Content emphasis: warnings, errors, success states | Fixed — driven by page content, not user preference |

`Nexus/User Accent` variables:

| Token | Variable ID | Notes |
|-------|-------------|-------|
| `accent/soft` | `VariableID:75:17` | Shade 300 |
| `accent/medium` | `VariableID:75:16` | Shade 400 — default `color/accent/user` |
| `accent/strong` | `VariableID:75:15` | Shade 500 |
| `color/accent/user` | `VariableID:75:18` | Aliases `accent/medium` per selected family mode |

Primitives `accent/{family}/{300|400|500}` in `Nexus/Primitives` are the source ramps. News Hub shows the pattern via **“Your accent: Blue · Medium”** pill (`81:26`).

---

## 1. Styles & Variables

### Text styles

| Style | ID |
|-------|-----|
| `text/heading/xl` | `S:c43f88d87438a3b6240c3d93d4658dfb53095383,` |
| `text/heading/lg` | `S:f659b61db744021c9e21a90b5178d0f7b11a8807,` |
| `text/heading/md` | `S:8f69ba14f5b500a283519570b36f67b4b065e478,` |
| `text/body/md` | `S:3143a4f2e906fdb58cf924ebced8a1e0a40e75f4,` |
| `text/body/sm` | `S:00a2c9633dcd7637dbc8e0f62daa35fe5bec3c06,` |
| `text/label` | `S:fe6e2c24fee62e5a2e2975a7e4027e8aa7dde70e,` |

### Effect style

| Style | ID |
|-------|-----|
| `effect/shadow/lg` | `S:c1a01c689355f9c155d4a61106a1a68de6e2c299,` |

### `Nexus/Color` semantic tokens — `VariableCollectionId:10:2`

| Token | Variable ID |
|-------|-------------|
| `color/bg/surface` | `VariableID:10:3` |
| `color/bg/elevated` | `VariableID:10:4` |
| `color/text/primary` | `VariableID:10:5` |
| `color/text/secondary` | `VariableID:10:6` |
| `color/border/default` | `VariableID:10:7` |
| `color/accent/active` | `VariableID:10:8` |
| `color/warning` | `VariableID:10:9` |
| `color/danger` | `VariableID:10:10` |
| `color/success` | `VariableID:10:11` |

### Icon sizes (Lucide)

Code ↔ Figma mapping for nav and editor icons: [icon_sizes.md](../icon_sizes.md).

| Context | Figma target | Code token |
|---------|--------------|------------|
| Site header/footer nav & social | 18×18px, stroke 2.25 | `SITE_CHROME_ICON_SIZE`, `--site-chrome-icon-size` |
| Puck editor sidebar / fields | 14×14px, stroke 1.75 | `puckIcon()` in `puckIcons.tsx` |

---

## 2. Page & Frame Registry

| Page | Page ID | Frame | Frame ID |
|------|---------|-------|----------|
| `01 — Foundations` | `11:2` | `Foundations/All` | `38:2` |
| `02 — Components` | `11:3` | `Components/All` (catalog board) | `27:2` |
| `02 — Components` | `11:3` | Component sources (off-canvas, `x=-2000`) | `27:4` … `138:42` |
| `02 — Components` | `11:3` | `Button/Primary` | `27:4` |
| `02 — Components` | `11:3` | `Button/Secondary` | `136:19` |
| `02 — Components` | `11:3` | `Button/Ghost` | `136:21` |
| `02 — Components` | `11:3` | `Input/Default` | `27:6` |
| `02 — Components` | `11:3` | `CommentInput` | `138:30` |
| `02 — Components` | `11:3` | `Header/Global` | `56:2` |
| `02 — Components` | `11:3` | `NavItem` | `137:25` |
| `02 — Components` | `11:3` | `TabGroup` | `27:9` |
| `02 — Components` | `11:3` | `SegmentedControl` | `137:20` |
| `02 — Components` | `11:3` | `Sidebar/Admin` | `138:42` |
| `02 — Components` | `11:3` | `Badge/Warning` | `27:14` |
| `02 — Components` | `11:3` | `Badge/Success` | `136:23` |
| `02 — Components` | `11:3` | `Badge/Danger` | `136:25` |
| `02 — Components` | `11:3` | `Tag/Role` | `136:30` |
| `02 — Components` | `11:3` | `TaskChip` | `136:28` |
| `02 — Components` | `11:3` | `StatCard` | `138:34` |
| `02 — Components` | `11:3` | `Avatar` | `136:27` |
| `02 — Components` | `11:3` | `NewsTile` | `27:16` |
| `02 — Components` | `11:3` | `CommentRow` | `138:25` |
| `02 — Components` | `11:3` | `AccentPill` | `138:37` |
| `02 — Components` | `11:3` | `Card/Surface` | `138:39` |
| `03 — Auth` | `11:5` | `Auth/StudentSignUp — Light` | `57:2` |
| `03 — Auth` | `11:5` | `Auth/StudentSignUp — Dark` | `57:17` |
| `04 — Admin Dashboard` | `11:6` | `Admin/CalendarMode` | `58:2` |
| `04 — Admin Dashboard` | `11:6` | `Admin/TasksStackMode` | `58:17` (pan right, x=1500) |
| `05 — News Hub` | `11:7` | `News/Hub` | `59:17` |
| `06 — Text Editor` | `11:8` | `Editor/RichText` | `59:32` |
| `07 — User Profile` | `11:9` | `Profile/User` | `59:47` |
| `08 — Works Report` | `245:17` | `WorksReport/Main` | `245:18` |
| `00 — Cover` | `0:1` | `Cover/Main` | `59:2` |

---

## 3. Screen specifications

### Global header (`Header/Global` — `56:2`)

Present on **every screen** as a top **72px** slot inside each `1440×900` frame. The bar itself is **contained** — not edge-to-edge:

| Layer | Spec |
|-------|------|
| Outer slot | `1440×72`, transparent, vertically centers the bar |
| `Header/Bar` | `1200×52`, glass panel, `12px` radius, drop shadow, `16px` inner padding |

| Zone | Content |
|------|---------|
| Left | Logo mark (24px) + nav links |
| Nav | **News** · **Council Apply** · **Propose Activity** · **Admin** (active link = `Medium` + primary text) |
| Right (stacked) | **Nexus** wordmark on top → below: theme toggle (`☀` / `☾`) + profile photo (accent ring) |

**Background:** every page root (`00`–`07`) includes locked `Background/InfiniteGrid` (absolute, bottom z-order, `InfiniteGrid` PNG fill).

**Optional Admin link:** component boolean property `showAdminPanel` (`showAdminPanel#192:0`, default `false`).

| Screen type | `showAdminPanel` |
|-------------|------------------|
| Student-facing (Auth, News, Editor, Profile) | `false` — Admin hidden |
| Admin Dashboard (`58:2`, `58:17`) | `true` — Admin visible |

**React:** single `GlobalHeader` in root layout (`src/app/layout.tsx`). Pass `showAdminPanel` from RBAC session; nav routes map to News hub, council application flow, activity proposal form, and admin dashboard.

### Screen layout standard (pages `03`–`07`)

All app screens share the same **page chrome**:

| Layer | Size / spacing |
|-------|----------------|
| Root frame | `1440×900`, vertical auto-layout |
| `Header/Global` | `72px` slot, contained `1200px` bar centered |
| `Content` | `FILL`, **`24px` padding** on all sides, centers child shell |
| Inner shell (`Shell` / `AppShell` / `NewsHubContent` / editor / profile) | **`1200px` wide**, `12px` radius, glass panel (`panel` @ 92% + border) |
| `Background/InfiniteGrid` | Absolute, `1440×900`, bottom z-order |

Horizontal gutter on a `1440` canvas: `(1440 − 1200) / 2 = 120px` per side **including** the `24px` content padding → visual equal margins left/right.

### Auth (`57:2`, `57:17`)
Centered `1200×680` `Shell`: split layout — gradient brand panel + registration form. Fields: Email, Password, Specialty, Group. Role chips: Starosta, Deputy, Neither. OAuth row. Primary CTA.

### Admin Calendar (`58:2`)
Centered `1200×788` `AppShell` (`51:3`) inside `58:16` Content. `Sidebar/Admin` instance + main card (`8px` radius). Tracker table `117:38` must stay **834px FIXED width** (never `layoutGrow`). Legend `51:150` fixed **196px**. Grid wrap `51:24` = **1084px** total. Student rows include **Group Badges** (e.g. `SE-42`, `CS-301`) next to names.

### Admin Stack (`58:17`)
Centered `1200×788` `AppShell`: `Sidebar/Admin` + `StackMain`. Member rows **FILL** shell width. Segmented toggle (Stack active), width legend (1 / 5 / 10 tasks). Member list rows include **Group Badges** next to names.

### News Hub (`59:17` → `81:26`)
Centered `1200×780` `NewsHubContent` shell with `24px` inner padding. Tiles grid and discussion panel **FILL** shell width. Comments in `DiscussionPanel` include student **Group and Role Badges** next to commenter names.

| Section | Content |
|---------|---------|
| Header | Title, subtitle, user accent pill |
| Category tabs | Current (active) · Sport · Announcements |
| Tile grid | 2×2 gradient cards with title + category/read-time meta |
| Discussion | 3 sample comments (avatar + name + body), input + Post CTA |

### Text Editor — Puck builder (`59:32` → shell `53:3`)

Three-column **Puck.js** editor layout inside centered `1200×788` shell:

| Column | Width | Content |
|--------|-------|---------|
| `Puck/Components` | `260px` | `20px` padding, `16px` block gap, search field (`Search blocks…`), 10 registry block cards |
| `Puck/Canvas` | `FILL` | `20px` padding; page title, Publish, toolbar, block canvas with selection outline |
| `Puck/Properties` | `280px` | `20px` padding; field editors + JSON schema preview for selected block |

Canvas shows assembled blocks: `NexusTabs` (selected), `NewsTile` ×2, `CommentRow`. Toolbar includes `/` slash-command chip.

### User Profile (`59:47` → shell `54:3`)

Emulates live Nexus user record + task accountability:

| Section | Content |
|---------|---------|
| **ProfileHero** | Photo avatar, name, specialty/group, linked identities (email, Telegram, Google), `Tag/Role` ×3 (including Group SE-42 badge), Telegram sync status |
| **StatsRow** | `StatCard` ×3 — Stars (124), Tasks (18), Warnings (0/3) |
| **BodySplit** | Left: `SegmentedControl` + 4 task rows with `Badge/Warning` / `Badge/Success` + action buttons (ack flow) |
| **ActivityColumn** | Council votes/proposals, 30-day performance, `AccentPill` |

### Works Report (`245:18` → shell `245:36`)

Review and approval interface for student submissions:

| Section | Content |
|---------|---------|
| **HeaderRow** | Title, subtitle, search input ("Search by student or task..."), Filters button |
| **BodySplit** | Left: List of 4 student submission cards with metadata, status badges (Awaiting Review, Approved, Revision Requested), and click-to-view hints. Right: Detailed view of selected report (Lab Report #3 by Anna Koval) with full text, attached files list, media preview, feedback input, and "Request Revision" / "Approve Submission" buttons. |

---

## 4. Puck.js Component Registry

| Figma component | Puck block | Category | Component ID | Status |
|-----------------|------------|----------|--------------|--------|
| `Header/Global` | `GlobalHeader` | Layout-level | `56:2` | Implemented |
| `TabGroup` | `NexusTabs` | Content | `27:9` | Implemented |
| `Button/Primary` | `NexusButton` | Content | `27:4` | Implemented (Primary, Secondary, Ghost) |
| `Input/Default` | `NexusInput` | Content | `27:6` | Implemented |
| `StatCard` | `NexusStatCard` | User & Data | `138:34` | Implemented |
| `Avatar` | `NexusAvatar` | User & Data | `136:27` | Implemented |
| `NewsTile` / `Card/Surface` | `NexusNewsCard` | News & Cards | `27:16` / `138:39` | Implemented (Merged into rich NewsCard) |
| `Tag/Role` | Merged into `NexusUserBadge` | User & Data | `136:30` | Implemented |
| `Section` | `NexusSection` | Layout | — | Implemented |
| `Grid` | `NexusGrid` | Layout | — | Implemented |
| `Columns` | `NexusColumns` | Layout | — | Implemented |
| `Spacer` / `Divider` | `NexusSpacer` *(Spacer & Divider)* | Layout | — | Implemented (merged; style presets for space, line, section break) |
| `Sidebar/Admin` | `AdminSidebar` | Sidebar | `138:42` | Planned (Phase 3) |
| `NavItem` | `NexusNavItem` | Navigation | `137:25` | Planned (Phase 3) |
| `SegmentedControl` | `NexusSegmentedControl` | Navigation | `137:20` | Planned (Phase 3) |
| `CommentInput` | `NexusCommentInput` | Forms | `138:30` | Planned (Phase 5) |
| `CommentRow` | `NexusCommentRow` | Content | `138:25` | Planned (Phase 5) |
| `AccentPill` | `NexusAccentPill` | Content | `138:37` | Planned (Phase 5) |

---

## 5. Acceptance Criteria & Known Gaps

### Component white-stain fix (Jun 2026)

Root cause: auto-layout children stretched to **100px** height (parent `TabGroup` / `Header` Actions) and **empty-fill** wrapper frames (`Logo`, `Nav`, `Actions`) rendered as white blocks in previews and instances.

Fixes applied on `02 — Components`:

- Rebuilt `Header/Global` (`56:2`) — `SPACE_BETWEEN` horizontal layout, hug-sized wrappers, no empty large frames
- Rebuilt `TabGroup` (`27:9`) — parent height reset before tabs; tabs hug content (~31px)
- Rebuilt `NewsTile` (`27:16`) — vertical auto-layout, dark `Thumb` frame with border + placeholder label
- Rebuilt `Input/Default`, `CommentInput`, `Sidebar/Admin` — dark elevated fills (no `#FFFFFF` surfaces)
- Reset all 21 catalog instances on `27:2`; purged solid white fills file-wide on frames

### Spacing normalization (Jun 2026)

All **21 components** on `02 — Components` now use `Nexus/Spacing` tokens:

| Token | px | Usage |
|-------|-----|-------|
| `spacing/xs` | 4 | Badge/chip padding, TabGroup/SegmentedControl outer pad |
| `spacing/sm` | 8 | Button vertical pad, input vertical pad, preview card pad, section gaps |
| `spacing/md` | 16 | Button horizontal pad, input horizontal pad, NewsTile/StatCard/Sidebar pad, row gaps |
| `spacing/lg` | 24 | Header horizontal pad, board section padding |

`CommentRow` vertical padding fixed (`8/16`); `Card/Surface` body uses `16px` horizontal inset.

### InfiniteGrid background in Figma (Jun 2026)

Source assets: `.ai/docs/assets/background/` (`logo.svg`, `app.js`, `index.html`) — symlinked at `.ai/assets/background/`.

Static preview frame rendered from `InteractiveGridEngine` config → `background-1440x900.png` (tiled rotated logo, 40% opacity, radial vignette on `#0b0f15`).

Applied to **all pages** (`00 — Cover` through `07 — User Profile`, including `02 — Components` catalog) as locked absolute layer `Background/InfiniteGrid` (bottom z-order, `layoutPositioning: ABSOLUTE`):

| Screen | Root frame ID | BG node ID |
|--------|---------------|------------|
| Auth Light | `57:2` | `187:24` |
| Auth Dark | `57:17` | `187:36` |
| Admin Calendar | `58:2` | `187:48` |
| Admin Stack | `58:17` | `187:60` |
| News Hub | `59:17` | `187:72` |
| Text Editor | `59:32` | `187:84` |
| User Profile | `59:47` | `187:96` |
| Works Report | `245:18` | `245:118` |

Image hash: `2046e1860882f82c54ebf5e4297b2a37ac473ce0`

### Components catalog cards + dummy images (Jun 2026)

Rebuilt all **21 preview cards** on board `27:2` (`02 — Components`):

- 5 sections (`Section/Actions`, `Forms`, `Navigation`, `Data display`, `Content`) with wrapped `Row` auto-layout
- Each `Preview/*` card: dark panel fill, 8px radius, border, 11px muted label, component instance below
- `Header/Global` preview scaled to 720px width (not full 1440)
- Fixed `SegmentedControl` (`137:20`) hug height (~33px); `AccentPill` hug; `Card/Surface` (`138:39`) with `HeroImage` frame

**Dummy images** uploaded via `upload_assets` (picsum placeholders):

| Target | Node ID | Component |
|--------|---------|-----------|
| News thumbnail | `166:67` | `NewsTile` → `Thumb` |
| Avatar photo | `170:200` | `Avatar` → `Photo` |
| Header avatar | `161:76` | `Header/Global` → `Photo` |
| Comment avatar | `154:80` | `CommentRow` → `Photo` |
| Card hero | `170:201` | `Card/Surface` → `HeroImage` |

### Done (foundation only)

- [x] Primitives + unified `Nexus/Color` (Light/Dark)
- [x] Text styles + shadow effect style
- [x] Component library rebuilt on `02 — Components` (21 components, dark theme)
- [x] Page shells created on all 8 pages
- [x] Node IDs documented

### Not done — blocks marking feature complete

| Screen | Frame ID | What's missing vs spec |
|--------|----------|----------------------|
| **Admin Dashboard** | `51:2`, `52:2` | **v4 complete** for core spec. Polish: bind variables, add more users/weeks if needed. |
| **Text Editor** | `53:2` | **v4 complete** for core spec. Polish: dark mode variant, richer block types. |
| **User Profile** | `54:2` | **v4 complete** for core spec. Polish: dark mode variant, assigned-tasks tab content. |
| **News Hub** | `59:17` | **Layout complete** (`81:26`). Polish: bind variables, Sport/Announcements tab states as separate frames. |
| **Foundations** | `38:2` | Accent + semantic docs rendered. Still missing: full typography specimens, spacing scale grid. |
| **Auth** | `39:2`, `39:29` | Partial; Dark variant is a light clone. OAuth buttons and full field labels need polish. |

### Completion checklist (all must be `[x]` before roadmap `[x]`)

- [x] Global `Header/Global` on all app screens (`56:2`)
- [x] Admin Calendar: user×day grid, task chips, 1–12 mark legend, warning badges (`58:2`)
- [x] Admin Stack: horizontal volume bars per user (`58:17`)
- [x] Text Editor: Notion-style UI per Section 3 spec (`59:32`)
- [x] User Profile: full profile layout per Section 3 spec (`59:47`)
- [x] News Hub: categories + tiles + comment block complete (`81:26`)
- [~] Foundations: accent + semantic swatches done; type + spacing specimens pending
- [x] User accent collection: 5 families × 3 shades (`VariableCollectionId:75:14`)
- [ ] Variable bindings on frames (not hardcoded hex)
- [x] Dark theme applied to Dashboard, News, Editor, Profile, Auth, Cover, Components, Foundations
- [ ] Light theme variants (optional toggle preview frames)
- [ ] Transparent canvas roots preserved on all screens

---

## 6. React implementation rules

1. Map CSS variables 1:1 to `Nexus/Color` semantic tokens
2. `InfiniteGridEngine` in root layout behind `{children}`
3. One React component per Figma atom under `src/components/ui/`
4. `AdminTrackerTable` single component, `mode: 'calendar' | 'stack'`
