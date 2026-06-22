# List pagination policy

## Outcome

Long MongoDB-backed lists must never render or fetch an entire collection in one response. Every admin or dashboard roster uses **offset pagination** (`page` + `limit`) with a hard cap, and the UI uses Shadcn **`NexusListPagination`** instead of unbounded "Load more" accumulation.

## Why

| Risk | Mitigation |
|------|------------|
| Browser freeze from huge React trees | Replace list state each page — do not append all rows client-side |
| MongoDB overload (`find` without limit) | Server `.skip()` + `.limit()`; `countDocuments` only for total pages |
| Memory growth in client shells | One page of rows in state (default **10**, max **50**) |

## Shared constants

`shared/constants/listPagination.ts`

| Constant | Value | Use |
|----------|-------|-----|
| `DEFAULT_LIST_PAGE_SIZE` | 10 | User directory, generic admin tables |
| `DEFAULT_AUDIT_LIST_PAGE_SIZE` | 15 | Audit/log feeds with tall rows |
| `MAX_LIST_PAGE_SIZE` | 50 | Zod/API hard cap on `limit` |

## Pure logic

`shared/lib/listPaginationLogic.ts`

- `clampListPageSize`, `computeTotalPages`, `pageToSkip`, `computePageRowRange`
- `buildPaginationItems` — page numbers + ellipsis for Shadcn bar

Tests: `npm run test:list-pagination`

## API contract

List endpoints should accept:

| Query | Type | Notes |
|-------|------|-------|
| `page` | `number` ≥ 1 | Default `1` |
| `limit` | `number` 1–50 | Default per surface |
| `cursor` | `string` | Legacy cursor feeds only — prefer `page` for new work |

Response should include:

```json
{
  "items": [],
  "page": 1,
  "limit": 10,
  "totalCount": 45,
  "totalPages": 5
}
```

(User directory uses `users` instead of `items`.)

### Reference implementation

- Domain: `AccessControlDomain.listDirectoryUsers` — `skip` + `limit` + `countDocuments`
- Schema: `userDirectoryQuerySchema` — `page` + `limit` defaults
- Route: `GET /api/admin/users`

## UI contract

| Component | Path | Role |
|-----------|------|------|
| `pagination.tsx` | `src/components/ui/pagination.tsx` | Shadcn primitives |
| `NexusListPagination` | `src/components/ui/NexusListPagination.tsx` | Reusable bar + optional summary |

### Shell rules

1. Store **one page** of rows — `setUsers(data.users)`, never spread-append prior pages.
2. Reset `page` to `1` when search/filter changes.
3. Show `NexusListPagination` below the list with `disabled={isLoading}`.
4. Optional summary: `Showing {from}–{to} of {totalCount}` via `computePageRowRange`.
5. Do **not** use unbounded "Load more" for institutional rosters.

### Implemented surfaces

| Surface | Status |
|---------|--------|
| User Directory (`UserDirectoryShell`) | Done — page size 10 |
| Security sanitization audit | Done — offset pagination via `NexusListPagination` |
| User directory audit section | Done — offset pagination; deep link `?targetUserId=` |

## Acceptance criteria

- [x] User directory fetches one page at a time with Shadcn pagination
- [x] API returns `page`, `limit`, `totalCount`, `totalPages`
- [x] Shared constants and pure pagination helpers with tests
- [x] Cursor rule for agents (`.cursor/rules/list-pagination.mdc`)
- [x] Migrate security audit and directory audit lists to offset pagination

## Production notes

- Ensure MongoDB indexes support list filters (`accessLevelIndex`, text/name fields).
- For collections &gt; 10k rows, consider caching `totalCount` or showing prev/next only if `countDocuments` becomes hot.
