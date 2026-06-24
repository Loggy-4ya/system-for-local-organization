# Puck Editor — Canvas Performance Playbook

**Status:** `[x] Completed` (Phase 13)

**Related:** [puck_editor_enhancements.md](./puck_editor_enhancements.md) · [puck_editor.md](./puck_editor.md)

---

## 1. Problem

Every sidebar field change in Puck dispatches a `replace` action and re-renders the preview iframe. That is normal Puck behavior. **Extra** churn came from Nexus wiring that amplified it:

| Anti-pattern | Effect |
|--------------|--------|
| Lifting full document into React `useState` on every `onChange` | Re-rendered `PuckEditorShell` + inline `overrides={{ … }}` on every keystroke |
| Bare `usePuck()` in block render components | Subscribed to entire store — carousel/tabs/video re-rendered when *any* block changed |
| Immediate `onChange` on text-like custom fields | Canvas updated on every keypress |
| Unconditional `resolveData` returning new prop objects | Extra `replace` cycles and slot child re-resolution |

**Symptom:** Canvas felt like a full page refresh on every edit. **Not** a Next.js `router.refresh()` — that only runs after publish when the path is unchanged.

---

## 2. Core principle

> **Puck owns the live document.** The React parent only mirrors it for publish and server hydration.

- `<Puck data={…}>` `data` prop is **initial state only** after mount.
- Internal edits live in Puck's Zustand store until publish.
- Parent `onChange` must **not** call `setState` with the full document on every mutation.

---

## 3. Ref-only parent sync (mandatory)

**Files:** [`client.tsx`](../../src/app/[...puckPath]/client.tsx), [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx)

### Do

```tsx
const latestDataRef = useRef(initialEditorData);

const handleEditorDataChange = useCallback((nextData: Data) => {
  latestDataRef.current = nextData;
}, []);
```

- Pass `initialEditorData` to `<Puck data={initialEditorData}>` once per mount.
- Bump `puckMountKey` and reset `initialEditorData` **only** when server props change (`data`, `path`, `pageTitle`) — e.g. after `router.refresh()` post-publish or navigation.
- Publish uses Puck's `onPublish(nextData)` payload or `getLatestData()` from the ref.

### Do not

```tsx
// ❌ Re-renders shell on every field change; invalidates Puck override cache
const handleEditorDataChange = (nextData) => {
  latestDataRef.current = nextData;
  setEditorData(nextData);
};
```

### Why debounce was removed from parent

An earlier debounced `setEditorData` broke **drag-and-drop** (stale controlled `data` fighting Puck's internal move state). Ref-only sync preserves DnD while eliminating parent re-renders.

### Server sync pattern

```tsx
useEffect(() => {
  if (!isEditing || skipFirstRun) return;
  const next = buildEditorData(data, pageTitle, path);
  latestDataRef.current = next;
  setInitialEditorData(next);
  setPuckMountKey((k) => k + 1); // remount Puck with fresh server payload
}, [data, pageTitle, path, isEditing]);
```

---

## 4. Stable Puck overrides (mandatory)

**File:** [`puckEditorOverrides.tsx`](../../src/components/puck/puckEditorOverrides.tsx)

Puck memoizes `overrides` by object reference (`useLoadedOverrides`). **Never** pass inline `overrides={{ … }}` from a component that re-renders on edit.

### Do

- Export a **module-level** `PUCK_EDITOR_OVERRIDES` object with stable function references.
- For dynamic UI (publish errors), use **context** (`PuckEditorErrorContext`) inside override components — not props on the overrides object.

### Do not

- Wrap overrides in `useMemo` for React Compiler projects — use module-level constants instead.

---

## 5. Selective `createUsePuck` selectors (mandatory in render components)

**File:** [`useNexusPuck.ts`](../../src/components/puck/lib/useNexusPuck.ts)

Puck warns in dev: bare `usePuck()` subscribes to the **entire** store.

### Do

```tsx
import { useNexusPuck, usePuckPreviewMode } from "../lib/useNexusPuck";

// Narrow subscription — only re-render when preview mode changes
const previewMode = usePuckPreviewMode();
const isInteractive = previewMode === "interactive";

// Or ad-hoc selector
const dispatch = useNexusPuck((s) => s.dispatch);
const selectedItem = useNexusPuck((s) => s.selectedItem);
```

For one-off reads without subscribing (e.g. title commit), use `useGetPuck()`:

```tsx
const getPuck = useGetPuck();
const commit = () => {
  const { appState, dispatch } = getPuck();
  dispatch({ type: "replaceRoot", root: { … } });
};
```

### Do not

```tsx
// ❌ Re-renders on every document mutation anywhere in the page
const { appState } = usePuck();
```

### Current usages (keep updated)

| Component | Selector |
|-----------|----------|
| `NexusCarouselRender.tsx` | `usePuckPreviewMode()` |
| `NexusTabsRender.tsx` | `usePuckPreviewMode()` |
| `NexusVideoRender.tsx` | `usePuckPreviewMode()` |
| `EditorModeToggle.tsx` | `useNexusPuck(s => s.appState.ui.previewMode)`, `useNexusPuck(s => s.dispatch)` |
| `TiptapField.tsx` | `useNexusPuck(s => s.selectedItem)` |
| `PageHeaderLabel.tsx` | `useSyncExternalStore(subscribePageMetadataDraft, getPageMetadataDraft)` — no Puck subscription |
| `PageTitleEditor.tsx` | *(deprecated, not mounted)* `useNexusPuck(s => root title)`, `useGetPuck()` on commit |

**Rule:** Any block `render` function inside the Puck iframe must not use bare `usePuck()`.

---

## 6. Deferred field commits (non-DnD fields)

**Files:** [`useDeferredFieldCommit.ts`](../../src/components/puck/lib/useDeferredFieldCommit.ts), [`DeferredTextInputField.tsx`](../../src/components/puck/fields/DeferredTextInputField.tsx)

Custom sidebar fields call Puck `onChange` → `replace` → canvas re-render. Defer commits for **typing** and **continuous input**; commit immediately for **discrete** picks.

### When to defer

| Field type | Pattern | Commit trigger |
|------------|---------|----------------|
| Page title | `PageSettingsFieldGroup.tsx` | Blur/Enter only; keystrokes update `editorPageMetadataStore` only |
| Page slug | `PageSettingsFieldGroup.tsx` | Blur/Enter only; keystrokes update `editorPageMetadataStore` only |
| Rich text | `TiptapField.tsx` | 400ms debounce + blur flush |
| Array item labels (tabs/carousel) | `StripArrayLabelField` | 400ms debounce + blur; syncs `editorActiveIndex` on mount/focus |
| Custom spacing / dimensions | `CustomDimensionInput` via `SpacingFieldGroup`, `CarouselDimensionFields` | Blur only (`textDebounceMs: 0`) |

### When to commit immediately

| Field type | Reason |
|------------|--------|
| Preset `<select>` / radio | One discrete `replace` per user choice — expected |
| Color preset pickers | Single click |
| Drag-and-drop | Must not defer — Puck DnD relies on synchronous state |

### Hook usage

```tsx
const { draft, onTextChange, onTextBlur, onTextFocus } = useDeferredFieldCommit({
  value: externalValue,
  onChange: puckOnChange,
  textDebounceMs: 400, // 0 = blur/Enter only
});
```

### Adding a new deferred field

1. Keep local `draft` state while focused.
2. Call Puck `onChange` only on blur, Enter, debounce timeout, or pointer-up (sliders).
3. Sync draft from external `value` when not focused (`isFocusedRef` guard in hook).

### Header metadata draft store

**Files:** [`editorPageMetadataStore.ts`](../../src/components/puck/lib/editorPageMetadataStore.ts), [`PageHeaderLabel.tsx`](../../src/components/puck/PageHeaderLabel.tsx)

Sidebar title/slug inputs must update the Puck header label live without calling Puck `onChange` on every keystroke (which would rerender the canvas). Pattern:

1. `initPageMetadataDraft()` in `PuckClient.buildEditorData()` seeds the store from MongoDB/page settings.
2. `PageSettingsFieldGroup` calls `setPageMetadataDraft()` on every keystroke; Puck `onChange` only on blur via `useDeferredFieldCommit`.
3. `PageHeaderLabel` subscribes with `useSyncExternalStore` and portals into `[class*="PuckHeader-title"]`.

---

## 6b. Background draft autosave

**Files:** [`usePuckBackgroundDraftSave.ts`](../../src/components/puck/lib/usePuckBackgroundDraftSave.ts), [`puckDraftAutosaveLogic.ts`](../../shared/lib/puckDraftAutosaveLogic.ts), [`PuckEditorShell.tsx`](../../src/app/[...puckPath]/PuckEditorShell.tsx)

| Constant | Value | Role |
|----------|-------|------|
| `PUCK_DRAFT_AUTOSAVE_QUIET_MS` | 2500 | Idle time after last Puck `onChange` before autosave may POST |
| `PUCK_DRAFT_AUTOSAVE_INTERVAL_MS` | 12000 | Timer cadence for autosave evaluation |
| `PUCK_RESERVED_PATHS_CACHE_MS` | 60000 | TTL for `GET /api/pages/paths` during background saves only |

- **Dirty tracking:** `onChange` sets a ref flag only — no parent React state lift (same ref-only pattern as §5).
- **Fingerprint:** `JSON.stringify` of the live document compared to the last successful save; skips redundant POSTs.
- **Silent saves:** Background POST uses `persistPage({ silent: true })` — no header error on invalid slug, no `router.refresh()` (manual **Save draft** still refreshes).
- **Slug rename:** Successful background save with a new slug calls `router.replace('/new-path/edit')` only when the path changes.

---

## 7. Tight `resolveData` (block authors)

**Reference:** [`NexusCarousel.tsx`](../../src/components/puck/blocks/content/NexusCarousel.tsx)

`resolveData` runs on many `replace` triggers. Returning new objects when nothing changed causes Puck to treat the node as mutated and re-resolve **slot children**.

### Do

```tsx
resolveData: ({ props }, params) => {
  const shouldNormalize =
    params.trigger === "load" ||
    params.trigger === "insert" ||
    params.changed.carouselSize ||
    params.changed.height /* …other size keys… */;

  if (!shouldNormalize) {
    return { props }; // pass-through — no extra replace cycle
  }

  return {
    props: {
      ...props,
      carouselSize: resolveSizeProps(props),
    },
  };
},
```

### Guidelines

| Trigger | Typical use |
|---------|-------------|
| `load` | Normalize legacy/migrated props |
| `insert` / `move` | Apply defaults (e.g. island-on-insert via `withBlockShell`) |
| `replace` | Only react to `params.changed` keys you care about |
| `force` | Rare; full re-normalize |

### Do not

- Spread props and re-assign unchanged nested objects on every `replace`.
- Use `setData` in header/title editors — prefer `replaceRoot` with `useGetPuck()`.

### `withBlockShell` note

[`spacingFields.tsx`](../../src/components/puck/lib/spacingFields.tsx) `resolveAutoIslandProps` already gates on `trigger === "insert" | "move"` only — do not re-enable island on every `replace`.

---

## 8. Checklist for new Puck features

Before merging editor changes, verify:

- [ ] Parent `onChange` writes to ref only — no `setState` per edit
- [ ] `PUCK_EDITOR_OVERRIDES` unchanged reference; no inline overrides object
- [ ] Block render components use `useNexusPuck(selector)` or `usePuckPreviewMode()`
- [ ] Text-like custom fields use `useDeferredFieldCommit` or `DeferredTextInputField`
- [ ] New `resolveData` hooks check `params.changed` and `params.trigger`
- [ ] DnD manually tested after any parent state or debounce change
- [ ] No bare `usePuck()` in iframe render tree

---

## 9. Debugging canvas thrash

1. **React DevTools** — confirm `PuckClient` / `PuckEditorShell` do not re-render on sidebar typing.
2. **Console** — Puck dev warning: *"usePuck without a selector"*.
3. **Puck internals** — `setData` logs *"expensive and may cause unnecessary re-renders"*; prefer `replace` / `replaceRoot`.
4. **Network** — `router.refresh()` only after publish, not per field change.

---

## 10. File index

| Concern | File |
|---------|------|
| Ref-only sync + server remount | `src/app/[...puckPath]/client.tsx` |
| Editor shell + publish | `src/app/[...puckPath]/PuckEditorShell.tsx` |
| Stable overrides | `src/components/puck/puckEditorOverrides.tsx` |
| Publish error context | `src/components/puck/PuckEditorErrorContext.tsx` |
| Selector hook | `src/components/puck/lib/useNexusPuck.ts` |
| Deferred commit hook | `src/components/puck/lib/useDeferredFieldCommit.ts` |
| Debounced text field | `src/components/puck/fields/DeferredTextInputField.tsx` |
| Spacing blur commit | `src/components/puck/fields/SpacingFieldGroup.tsx` |
| Carousel resolveData | `src/components/puck/blocks/content/NexusCarousel.tsx` |
