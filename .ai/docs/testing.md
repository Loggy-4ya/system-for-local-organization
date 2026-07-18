# Nexus — Repository Test Registry

Living catalog of automated tests in this repo. **Every new suite MUST be registered in [`scripts/test/testRegistry.json`](../../scripts/test/testRegistry.json) and in the table below** so agents and developers can find and reuse tests without searching the tree.

## Agent protocol

When you add, rename, or remove a test:

1. Add or update the entry in **`scripts/test/testRegistry.json`** (source of truth for paths, env, browser config).
2. Add or update the row in the registry table below.
3. Keep the test file header comment in sync (`Run: npm run test:run -- <id>` line).
4. Add a reciprocal `Tests:` line in the module-under-test JSDoc header.
5. Reference this file from [architecture_map.md](./architecture_map.md) and [AGENTS.md](../AGENTS.md).

## Directory layout

All automated tests live under **`tests/`** — a single-purpose root folder (see [directory_hygiene.md](./directory_hygiene.md)). Subfolders mirror the source tree they exercise:

```
tests/
  puck/
    lib/          ← unit tests for src/components/puck/lib/*.ts
  lib/
    nexusEditor/  ← unit tests for src/lib/nexusEditor/*.ts
```

**Do not** place `*.test.ts` files inside `src/`, `shared/`, or application component folders. Extract pure logic from React components into testable modules under `src/`, then add the suite under the matching `tests/` path.

## Runner

Suites are defined in **`scripts/test/testRegistry.json`**. Invoke via:

```bash
npm test                              # all unit suites
npm run test:run -- carousel-pagination   # one suite by id
npm run test:list                     # print all ids
npm run test:puck                     # puck group bundle
npm run test:run -- browser:puck-mobile-panel   # Playwright
```

Unit suites use **Node.js built-in test runner** via `tsx`:

```bash
npx tsx --test tests/path/to/file.test.ts
```

Imports in test files use the same `@/` and `@shared/` path aliases as application code (`tsconfig.json`).

## Registry

| Script | Test file | Module under test | What it verifies |
|--------|-----------|-------------------|------------------|
| `npm run test:run -- preview-content-height` | `tests/puck/lib/previewContentHeight.test.ts` | `previewContentHeight.ts`, `PageRoot.tsx`, `PuckIframeTheme.tsx`, `NexusPuckZoomGuard.tsx` | Edit-mode canvas bounds: content-sized preview iframe + reactive Puck `rootHeight` sync to intrinsic page content (prevents infinite empty scroll and collapse-to-sliver feedback loops). |
| `npm run test:run -- page-root-field-props` | `tests/puck/lib/pageRootFieldProps.test.ts` | `pageRootFieldProps.ts`, `pageBackgroundGridStore.ts`, `LayoutInfiniteGrid.tsx` | Page background grid motion resolves static mode for site-default backgrounds and syncs into the layout-level `InfiniteGrid`; editor page title prefers MongoDB title over puck default placeholder. |
| `npm run test:run -- deferred-field-commit` | `tests/puck/lib/useDeferredFieldCommit.test.ts` | `useDeferredFieldCommit.ts`, `PageSettingsFieldGroup.tsx` | Blur commits use ref-backed draft (no stale render snapshot); page title field defers Puck `onChange` until commit. |
| `npm run test:run -- interactive-preview-scrollport` | `tests/puck/lib/interactivePreviewScrollport.test.ts` | `interactivePreviewScrollport.ts`, `previewContentHeight.ts`, `NexusPuckZoomGuard.tsx`, `puck-editor.css` | Interactive preview applies desktop viewport-controls inset on `#puck-canvas-root` (absolute), resets stale shell/iframe scroll offsets, and sizes locked `rootHeight` to the inner canvas below the FAB. |
| `npm run test:run -- editor-mode-panel` | `tests/puck/lib/editorModePanelSnapshot.test.ts` | `editorModePanelSnapshot.ts`, `EditorModeToggle.tsx` | Edit ↔ interactive preview toggle saves plugin panel visibility before closing sidebars and restores it when returning to edit mode. |
| `npm run test:run -- mobile-nav-gestures` | `tests/puck/lib/mobileNavPanelGestureLogic.test.ts` | `mobileNavPanelGestureLogic.ts`, `NexusMobileNavPanelGestures.tsx` | Compact editor bottom-rail **double-tap** detection (touch `button === -1`, ghost-click suppression with new-press guard, back-to-back expand/collapse), active nav link resolution from icon/label descendants, expand vs collapse toggle using `mobilePanelExpanded`, active-tab block rules during the double-tap pairing window. DOM wiring: document capture for `touchstart`/`pointerdown`/`mousedown` block; tap completion on active **`NavItem-link`** div via `touchend`/`pointerup`/`click`. |
| `npm run test:run -- mobile-panel-dismiss` | `tests/puck/lib/mobilePanelDismissLogic.test.ts` | `mobilePanelDismissLogic.ts`, `NexusMobilePanelResizer.tsx`, `mobilePanelLayout.ts`, `NexusMobileNavPanelGestures.tsx` | Compact plugin panel **swipe-to-dismiss** drag: downward resize handle drag may shrink below 160px min; release at/below dismiss threshold dispatches `nexus-mobile-panel-close-request` → forced close sets `leftSideBarVisible: false`, resets persisted height to default for next open; sub-threshold release snaps back to min height. |
| `npm run test:run -- mobile-blocks-palette-dismiss` | `tests/puck/lib/mobileBlocksPalettePanelDismissLogic.test.ts` | `mobileBlocksPalettePanelDismissLogic.ts`, `NexusMobileBlocksPalettePanelDismiss.tsx` | Blocks-tab **palette insert drag** only: panel closes on drag start or when pointer/finger leaves the overlay (`nexus-mobile-panel-close-request`); canvas taps and canvas reparent drags are ignored.
| `npm run test:run -- carousel-pagination` | `tests/puck/lib/carouselPagination.test.ts` | `carouselPagination.ts` | Visible slide counts and pagination tiers at 500 / 640 / 720 / 1024px viewport widths. |
| `npm run test:run -- carousel-nav` | `tests/puck/lib/carouselNavController.test.ts` | `carouselNavController.ts` | Carousel prev/next controller state and wrap-around at bounds. |
| `npm run test:run -- carousel-edit-swipe` | `tests/puck/lib/carouselEditSwipeLogic.test.ts` | `carouselEditSwipeLogic.ts`, `useCarouselEditSwipe.ts`, `NexusCarouselRender.tsx` | Edit-mode swipe gesture routing: Embla `watchDrag` guards, pointer flick fallback, nested Puck block detection. |
| `npm run test:run -- carousel-media-fill` | `tests/puck/lib/carouselMediaFill.test.ts` | `carouselMediaFill.ts`, `NexusVideoRender.tsx`, `NexusImageRender.tsx` | Composite slide detection (grid **inside** slide vs carousel **inside** grid cell); auto fill-slide resolution. |
| `npm run test:run -- preview-iframe-composite` | `tests/puck/lib/previewIframeShellComposite.test.ts` | `previewIframeShellComposite.ts`, `infiniteGridIconLoader.ts` | WebKit/Safari user-agent probe for iframe-contained edit grid compositing fallback. |
| `npm run test:run -- preview-iframe-grid-backing` | `tests/puck/lib/previewIframeGridBacking.test.ts` | `previewIframeGridBacking.ts` | `isInsidePuckEditorShell` — Puck shell detection (no duplicate iframe grids). |
| `npm run test:run -- desktop-letterbox-zoom` | `tests/puck/lib/desktopLetterboxZoom.test.ts` | `sanitizePuckZoomConfig.ts` | Fixed presets shrink-to-fit when canvas is narrower than preset; moderate scale-up (capped) when frame is wider (letterbox). |
| `npm run test:run -- puck-canvas-root-zoom-presentation` | `tests/puck/lib/puckCanvasRootZoomPresentation.test.ts` | `sanitizePuckZoomConfig.ts` | Detects/heals missing `#puck-canvas-root` transform after mobile preview clear helpers strip React-owned inline styles. |
| `npm run test:run -- viewport-zoom-label` | `tests/puck/lib/formatViewportZoomLabel.test.ts` | `formatViewportZoomLabel.ts` | Viewport zoom trigger shows **Auto** for Puck auto-fit values (100% default + shrink-to-fit `(Auto)` options); manual picks stay as percentages. |
| `npm run test:run -- canvas-letterbox-scrollport` | `tests/puck/lib/canvasLetterboxScrollport.test.ts` | `canvasLetterboxScrollport.ts`, `letterboxScrollportLogic.ts` | Shell overflow detection, iframe→shell wheel chaining, letterbox expand hysteresis (config height over clipped DOM). |
| `npm run test:run -- resolve-auto-viewport` | `tests/puck/lib/resolveAutoViewport.test.ts` | `resolveAutoViewport.ts` | Fixed presets preserved; full-width auto when frame wider than closest preset. |
| `npm run test:run -- desktop-editor-scrollport` | `tests/puck/lib/desktopEditorScrollport.test.ts` | `desktopEditorScrollport.ts` | Desktop ≥901px chrome MQ + fixed-viewport centering CSS contract in `puck-editor.css`. |
| `npm run test:run -- compact-editor-viewport` | `tests/puck/lib/compactEditorViewport.test.ts` | `usePuckMobileEditorChrome.ts` | Compact editor `(max-width: 900px)` detection uses `matchMedia`, not raw `innerWidth`. |
| `npm run test:run -- mobile-scrollport-grid-freeze` | `tests/puck/lib/mobileScrollportGridFreeze.test.ts` | `mobileScrollportGridFreeze.ts`, `InfiniteGrid.tsx`, `NexusEditorScrollportGrid.tsx` | Overlay panel + CSS-only backdrop (`inset: 0` on layout-inner); grid/canvas never shrink on panel open. See [puck_mobile_scrollport_grid_backdrop.md](features/puck_mobile_scrollport_grid_backdrop.md). |
| `npm run test:run -- canvas-island-stack` | `tests/puck/lib/canvasIslandStackSync.test.ts` | `canvasIslandStackSync.ts`, `NexusEditorScrollportGrid.tsx`, `mobilePanelLayout.ts` | Measures plugin panel top vs canvas bottom; writes `--nexus-canvas-island-stack-bottom` so history + viewport FABs track panel height/position on compact editor. |
| `npm run test:run -- outline-sortable` | `tests/puck/lib/outlineSortableLogic.test.ts` | `outlineSortableLogic.ts` | Outline drag reorder slot resolution (before/after/nest/outdent). |
| `npm run test:run -- nexus-grid-item-zone` | `tests/puck/lib/nexusGridItemZonePolicy.test.ts` | `nexusGridItemZonePolicy.ts`, layout slot fields, `NexusGridItemPlacementGuard.tsx`, `NexusDraggableOutline.tsx` | Legacy standalone `NexusGridItem` block placement guard; see [puck_grid_item_zone_policy.md](features/puck_grid_item_zone_policy.md). |
| `npm run test:run -- grid-item-array-reorder` | `tests/puck/lib/gridItemArrayReorder.test.ts` | `gridItemArrayReorder.ts`, `NexusGridRender.tsx` | Grid cell array reorder math for sidebar + canvas moves. |
| `npm run test:run -- grid-cell-placement` | `tests/puck/lib/gridCellPlacement.test.ts` | `gridCellPlacement.ts`, `NexusGridRender.tsx` | Row-major explicit CSS grid placement (array order); prevents phantom gaps in carousel slides. |
| `npm run test:run -- grid-row-height-sync` | `tests/puck/lib/gridRowHeightSync.test.ts` | `gridRowHeightSync.ts`, `NexusGridRender.tsx`, `puck-editor.css` | Per-row synchronized grid track heights; content-driven shrink/grow (no stretched empty-cell feedback); video aspect uses frame width. |
| `npm run test:run -- grid-edit-sizing` | `tests/puck/lib/gridEditSizing.test.ts` | `gridEditSizing.ts`, `NexusGridRender.tsx` | Carousel-aware grid gap + forced single-row span in carousel slides. |
| `npm run test:run -- nexus-grid-migration` | `tests/puck/lib/nexusGridMigration.test.ts` | `puckDataTree.ts` (`migrateLegacyNexusGridItems`) | Legacy slot-based grid items → `NexusGrid.props.items` array migration. |
| `npm run test:run -- island-defaults` | `tests/puck/lib/applyIslandDefaultsOnInsert.test.ts` | `applyIslandDefaultsOnInsert.ts` | Island defaults on block insert and outline move; root canvas move seeds **SM** top/bottom margin (`ROOT_BLOCK_VERTICAL_MARGIN`); nested section/grid/carousel/tab inserts reset margins to **None**. |
| `npm run test:run -- block-shell-band` | `tests/puck/lib/blockShellBand.test.ts` | `spacingFields.tsx` | Island-off blocks honor `islandMaxWidth` via centered width band; **Full Width** opts into edge-to-edge bleed. |
| `npm run test:run -- content-width-tokens` | `tests/puck/lib/contentWidthTokens.test.ts` | `contentWidthTokens.ts` | Default 1400px container band; optional `full` bleed. |
| `npm run test:run -- separator-block` | `tests/puck/lib/separatorBlockLogic.test.ts` | `separatorBlockLogic.ts`, `NexusSpacer.tsx` | Style preset bundles, prop normalization/inference, render model resolution for **Spacer & Divider** (`NexusSpacer`). |
| `npm run test:run -- embed-media` | `tests/puck/lib/embedMedia.test.ts` | `embedMedia.ts`, `mediaFitMode.ts` | YouTube/Vimeo URL parsing, embed aspect lock (16:9), direct-file aspect fallback, media fit normalization. |
| `npm run test:run -- canvas-drop-target` | `tests/puck/lib/canvasDropTargetLogic.test.ts` | `canvasDropTargetLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Canvas drag hover sizing, deepest drop-zone hit-test, top-anchor drop probe, slot kind classification. |
| `npm run test:run -- canvas-reparent` | `tests/puck/lib/canvasReparentLogic.test.ts` | `canvasReparentLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Canvas reparent destination index, descendant guard, move/reorder commit builder, override detection. |
| `npm run test:run -- canvas-carousel-drag` | `tests/puck/lib/canvasDragCarouselScenarios.test.ts` | `canvasDragCommitPlan.ts`, `canvasDropTargetLogic.ts`, `canvasReparentLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Screencast-driven carousel drag scenarios: cross-slide move without revert, drag in/out of slides, release snap-back guards, outline cross-slide targets. |
| `npm run test:run -- canvas-section-drop` | `tests/puck/lib/canvasSectionDropTarget.test.ts` | `canvasDropTargetLogic.ts`, `NexusSection.tsx`, `NexusCanvasDragCoordinator.tsx` | Default section glass-shell hit-testing, section vs root pick, occupied-section overlay outline, carousel slide vs wrapper pick. |
| `npm run test:run -- block-render-visibility` | `tests/puck/lib/blockRenderVisibility.test.ts` | `blockRenderVisibility.ts`, all Puck block defaults | Page-root visibility models for every registered Puck block; guards video/image fill-slide collapse (outline exists but canvas height is 0). |
| `npm run test:run -- global-layout` | `tests/shared/domains/globalLayoutValidation.test.ts` | `GlobalLayoutDomain.ts` | Header and footer layout configuration validation rules. |
| `npm run test:run -- global-layout-header-seed` | `tests/shared/lib/globalLayoutHeaderSeedLogic.test.ts` | `globalLayoutHeaderSeedLogic.ts`, `GlobalLayoutDomain.ts` | Default header nav seed fingerprints and clone helper for MongoDB migration. |
| `npm run test:run -- page-domain` | `tests/shared/domains/pageDomain.test.ts` | `PageDomain.ts` | Puck page delete path validation (homepage guard, slash prefix). |
| `npm run test:run -- page-comment-logic` | `tests/shared/lib/pageCommentLogic.test.ts` | `pageCommentLogic.ts`, `CommentDomain.ts` | Comment body normalization and blocklist validation. |
| `npm run test:run -- page-comments-block-logic` | `tests/shared/lib/pageCommentsBlockLogic.test.ts` | `pageCommentsBlockLogic.ts`, `NexusComments.tsx`, `POST /api/puck` | Derive page `commentsEnabled` from NexusComments block presence + block toggle. |
| `npm run test:run -- form-field-logic` | `tests/shared/lib/formFieldLogic.test.ts` | `formFieldLogic.ts`, `FormFieldDomain.ts` | Form/survey/quiz validation, grading, and statistics aggregation. |
| `npm run test:run -- page-comment-count-cache` | `tests/shared/lib/pageCommentCountCache.test.ts` | `pageCommentCountCache.ts`, `CommentDomain.ts` | Server-side TTL cache for top-level comment counts. |
| `npm run test:run -- page-comments-layout-logic` | `tests/shared/lib/pageCommentsLayoutLogic.test.ts` | `pageCommentsLayoutLogic.ts`, `NexusComments` | Comments band width/align/view-mode normalization. |
| `npm run test:run -- engagement-vote-logic` | `tests/shared/lib/engagementVoteLogic.test.ts` | `engagementVoteLogic.ts` | Mutually exclusive like/dislike toggle math for page + comment UI. |
| `npm run test:run -- page-category` | `tests/shared/lib/pageCategoryLogic.test.ts` | `pageCategoryLogic.ts` | Page category label normalization, dedupe, suggestion filter, create-offer rules. |
| `npm run test:run -- page-categories-hub-logic` | `tests/shared/lib/pageCategoriesHubLogic.test.ts` | `pageCategoriesHubLogic.ts` | Hub section normalization by path domain, unused domain filter, legacy tag migration, publication image collection, catalog card builder. |
| `npm run test:run -- page-manager-catalog-logic` | `tests/shared/lib/pageManagerCatalogLogic.test.ts` | `pageManagerCatalogLogic.ts` | Page Manager catalog reorder, cross-domain move path computation, section reorder. |
| `npm run test:run -- page-catalog-domain-visibility-logic` | `tests/shared/lib/pageCatalogDomainVisibilityLogic.test.ts` | `pageCatalogDomainVisibilityLogic.ts` | Catalog domain visibility modes, select encode/decode, viewer gating by `accessLevelIndex`. |
| `npm run test:run -- page-catalog-display-logic` | `tests/shared/lib/pageCatalogDisplayLogic.test.ts` | `pageCatalogDisplayLogic.ts` | Catalog carousel threshold, grid pagination slices, responsive visible card counts. |
| `npm run test:run -- page-path-logic` | `tests/shared/lib/pagePathLogic.test.ts` | `pagePathLogic.ts` | Page path normalisation, badge labels, catalog filtering. |
| `npm run test:run -- dom-event-rejection-logic` | `tests/shared/lib/domEventRejectionLogic.test.ts` | `domEventRejectionLogic.ts` | Benign DOM `Event` promise rejection detection for dev overlay guard. |
| `npm run test:run -- nexus-page-variables` | `tests/shared/lib/nexusPageVariables.test.ts` | `nexusPageVariables.ts` | `${{ variable }}` page field interpolation. |
| `npm run test:run -- page-access-logic` | `tests/shared/lib/pageAccessLogic.test.ts` | `pageAccessLogic.ts` | Delegated editor grant rules, candidate filtering, storage normalisation. |
| `npm run test:run -- page-publisher-invite-logic` | `tests/shared/lib/pagePublisherInviteLogic.test.ts` | `pagePublisherInviteLogic.ts` | Publisher invite token hashing, validation, URL builders, redeem eligibility. |
| `npm run test:run -- global-layout-sortable` | `tests/global-layout/lib/editorSortableLogic.test.ts` | `editorSortableLogic.ts`, `useEditorSortableList.ts`, `HeaderNavItemSortableContext.tsx` | Global Layout Editor flat-list reorder, drop-slot helpers, and cross-category header nav moves. |
| `npm run test:run -- global-layout-align` | `tests/global-layout/lib/headerNavAlignLogic.test.ts` | `headerNavAlignLogic.ts`, `DesktopHeaderNavZones` | Header nav zone grouping, per-category alignment, dense-nav threshold, and gap CSS mapping. |
| `npm run test:run -- drag-scroll` | `tests/lib/dragAutoScrollLogic.test.ts` | `dragAutoScrollLogic.ts`, `useDragAutoScroll.ts` | Edge auto-scroll speed ramp for Global Layout Editor and Puck pointer drags. |
| `npm run test:run -- page-edit-access` | `tests/lib/pageEditAccess.test.ts` | `pageEditAccess.ts`, `PageEditFab.tsx` | Puck page edit FAB visibility (ownership-aware `canEdit` flag from server). |
| `npm run test:run -- page-edit-access-logic` | `tests/shared/lib/pageEditAccessLogic.test.ts` | `pageEditAccessLogic.ts` | Pure page ownership ACL (author, delegated editor, global admin tiers). |
| `npm run test:run -- page-publication` | `tests/shared/lib/pagePublicationLogic.test.ts` | `pagePublicationLogic.ts` | Public visibility, scheduled publish timing, idempotency keys. |
| `npm run test:run -- loader-auto-retry` | `tests/lib/loaderAutoRetryLogic.test.ts` | `loaderAutoRetryLogic.ts`, `SiteLoader.tsx` | Stuck route loader hard-reload cap per pathname (sessionStorage). |
| `npm run test:run -- route-loader-recovery` | `tests/lib/routeLoaderRecoveryLogic.test.ts` | `routeLoaderRecoveryLogic.ts`, `RouteNavigationRecoveryHost.tsx`, `SiteLoader.tsx` | Back/bfcache detection; soft refresh before hard reload delays. |
| `npm run test:run -- validation` | `tests/shared/validation/schemas.test.ts` | `authSchemas.ts`, `profileSchemas.ts` | Input validation rules for credentials login, signup, registration, and profile settings. |
| `npm run test:run -- password-strength` | `tests/shared/lib/passwordStrength.test.ts` | `passwordStrength.ts` | Weak-password detection, login-equals-password guard, mixed character classes. |
| `npm run test:run -- content-policy` | `tests/shared/lib/contentPolicy.test.ts`, `tests/shared/validation/contentPolicySchemas.test.ts` | `shared/lib/contentPolicy.ts`, `shared/validation/contentPolicySchemas.ts` | Blocked-word scan, HTML extraction, field-kind exclusions (numeric/tel skip). |
| `npm run test:run -- general-rules-domain` | `tests/shared/domains/generalRulesDomain.test.ts` | `GeneralRulesDomain.ts`, `generalRulesListParsing.ts`, `effectiveGeneralRulesCache.ts`, `telegramBroadcastFormat.ts` | List parsing, effective cache → content policy, Telegram broadcast format. |
| `npm run test:run -- academic-catalog` | `tests/shared/lib/academicCatalogLogic.test.ts` | `academicCatalogLogic.ts` | Catalog slugify, label normalisation, approved-label matching. |
| `npm run test:run -- split-person-name` | `tests/shared/lib/splitPersonName.test.ts` | `splitPersonName.ts` | OAuth full-name split into given name and surname. |
| `npm run test:run -- site-profile-basic` | `tests/shared/lib/siteProfileBasic.test.ts` | `siteProfileBasic.ts`, `SiteProfileProvider.tsx`, `GET /api/me` | Header basic profile DTO mapping and admin panel role gate. |
| `npm run test:run -- public-profile-redaction` | `tests/shared/lib/publicProfileRedaction.test.ts` | `publicProfileRedaction.ts`, `/users/[userId]` | PII redaction between peers vs self/outranking viewers. |
| `npm run test:run -- profile-badge-logic` | `tests/shared/lib/profileBadgeLogic.test.ts` | `profileBadgeLogic.ts`, `ProfileBadge.tsx`, profile pages | Typed profile badge CSS classes, hierarchy/RBAC labels, social link accents. |
| `npm run test:run -- profile-contact-logic` | `tests/shared/lib/profileContactLogic.test.ts` | `profileContactLogic.ts`, `ProfileHeroActions.tsx` | Telegram/email contact resolution for profile Message actions. |
| `npm run test:run -- profile-task-display-logic` | `tests/shared/lib/profileTaskDisplayLogic.test.ts` | `profileTaskDisplayLogic.ts`, `ProfileTasksPanel.tsx` | Open-task filtering, urgency sort, status badge classes. |
| `npm run test:run -- task-access-logic` | `tests/shared/lib/taskAccessLogic.test.ts` | `taskAccessLogic.ts`, `TaskDomain.ts` | Task dispatch/view/delegate/start/reopen permission rules. |
| `npm run test:run -- task-score-logic` | `tests/shared/lib/taskScoreLogic.test.ts` | `taskScoreLogic.ts` | Quality/time weighted performer scoring. |
| `npm run test:run -- task-categories-settings-logic` | `tests/shared/lib/taskCategoriesSettingsLogic.test.ts` | `taskCategoriesSettingsLogic.ts` | General rules task category normalization. |
| `npm run test:run -- task-delegation-limits-logic` | `tests/shared/lib/taskDelegationLimitsLogic.test.ts` | `taskDelegationLimitsLogic.ts`, `GeneralRulesSettings.ts` | Merge General Rules delegation quotas with defaults. |
| `npm run test:run -- task-reminder-logic` | `tests/shared/lib/taskReminderLogic.test.ts` | `taskReminderLogic.ts`, `TaskDomain.ts` | Flexible reminder units, before-due scheduling, legacy migration. |
| `npm run test:run -- task-reminder-notification-copy` | `tests/shared/lib/taskReminderNotificationCopy.test.ts` | `taskReminderNotificationCopy.ts` | Reminder toast/Telegram copy for open vs overdue tasks. |
| `npm run test:run -- task-status-logic` | `tests/shared/lib/taskStatusLogic.test.ts` | `taskStatusLogic.ts` | Status transitions and overdue detection. |
| `npm run test:run -- task-group-access-logic` | `tests/shared/lib/taskGroupAccessLogic.test.ts` | `taskGroupAccessLogic.ts` | Task group view/edit/add-part access rules. |
| `npm run test:run -- task-group-roster-logic` | `tests/shared/lib/taskGroupRosterLogic.test.ts` | `taskGroupRosterLogic.ts` | Planned roster dedupe and performer union for groups. |
| `npm run test:run -- task-group-status-logic` | `tests/shared/lib/taskGroupStatusLogic.test.ts` | `taskGroupStatusLogic.ts` | Auto-complete when all child tasks terminal. |
| `npm run test:run -- task-group-reminder-notification-copy` | `tests/shared/lib/taskGroupReminderNotificationCopy.test.ts` | `taskGroupReminderNotificationCopy.ts` | Consolidated project reminder toast copy. |
| `npm run test:run -- institutional-calendar-logic` | `tests/shared/lib/institutionalCalendarLogic.test.ts` | `institutionalCalendarLogic.ts` | Yearly anchors, role targeting, template interpolation. |
| `npm run test:run -- nexus-hosting-logic` | `tests/shared/lib/nexusHostingLogic.test.ts` | `nexusHostingLogic.ts`, `nexusHostingBootstrap.ts` | VPS mode resolution, env validation (production requires S3), scheduler policy. |
| `npm run test:run -- nexus-deployment-infrastructure` | `tests/infrastructure/nexusDeploymentStacks.test.ts` | `infrastructure/lib/nexus-deployment-stacks.ts` | Immutable ECR repositories, no SSH ingress, IMDSv2, EC2 termination protection, exact GitHub Environment OIDC subject, constrained SSM release SHA. |
| `npm run test:run -- telegram-workspace-logic` | `tests/shared/lib/telegramWorkspaceLogic.test.ts` | `telegramWorkspaceLogic.ts` | Strategy resolution, templates, performer threshold. |
| `npm run test:run -- telegram-channel-id-logic` | `tests/shared/lib/telegramChannelIdLogic.test.ts` | `telegramChannelIdLogic.ts` | Bot API ↔ MTProto supergroup id conversion. |
| `npm run test:run -- telegram-bot-command-logic` | `tests/shared/lib/telegramBotCommandLogic.test.ts` | `telegramBotCommandLogic.ts` | Bot command parsing, `@bot` suffix stripping, wizard control vs cancel rules. |
| `npm run test:run -- telegram-report-flow-logic` | `tests/shared/lib/telegramReportFlowLogic.test.ts` | `telegramReportFlowLogic.ts` | Report wizard step order, media allowance filtering, plain-text → HTML. |
| `npm run test:run -- telegram-bot-task-logic` | `tests/shared/lib/telegramBotTaskLogic.test.ts` | `telegramBotTaskLogic.ts` | `/tasks` template formatting, task index resolution. |
| `npm run test:run -- telegram-bot-user-logic` | `tests/shared/lib/telegramBotUserLogic.test.ts` | `telegramBotUserLogic.ts`, `TelegramBotUserDomain.ts` | Register vs incomplete vs ready classification. |
| `npm run test:run -- telegram-operator-env` | `tests/shared/lib/telegramOperatorEnv.test.ts` | `telegramOperatorEnv.ts` | MTProto worker env validation. |
| `npm run test:run -- user-search-logic` | `tests/shared/lib/userSearchLogic.test.ts` | `userSearchLogic.ts`, `UserSearchDomain.ts`, `/api/users/search` | User search filters and subtitle formatting. |
| `npm run test:run -- broadcast-schemas` | `tests/shared/validation/broadcastSchemas.test.ts` | `broadcastSchemas.ts` | Admin broadcast API payload validation (channels, body, variant). |
| `npm run test:run -- telegram-init-data` | `tests/shared/lib/verifyTelegramWebAppInitData.test.ts` | `verifyTelegramWebAppInitData.ts` | Telegram Mini App `initData` HMAC verification, tamper rejection, auth_date expiry. |
| `npm run test:run -- telegram-webapp-viewport` | `tests/shared/lib/telegramWebAppViewport.test.ts` | `telegramWebAppViewport.ts`, `TelegramWebAppViewportHost.tsx` | Desktop Telegram viewport stable height resolution and chrome color normalization. |
| `npm run test:run -- telegram-contact-harvest` | `tests/shared/lib/telegramContactHarvestLogic.test.ts` | `telegramContactHarvestLogic.ts`, `AuthDomain.absorbTelegramSharedContact` | Shared-contact validation and phone normalization for bot harvest. |
| `npm run test:run -- seed-admin-user` | `tests/shared/lib/seedAdminUser.test.ts` | `seedAdminUserHelpers.ts`, `oauthLinkCookie.ts` | Admin seed Telegram clearance helper; OAuth link cookie build/read/clear. |
| `npm run test:run -- user-socium` | `tests/shared/lib/userSociumHelpers.test.ts` | `userSociumHelpers.ts`, `User.ts`, `AuthDomain.ts` | Full name formatting, socium role sync from student title, quality score init, publish eligibility. |
| `npm run test:run -- access-control` | `tests/shared/lib/accessControlLogic.test.ts` | `accessControlLogic.ts`, `AccessControlDomain.ts` | Hierarchy same-tier-or-below administration, effective permissions, role administration and delegation rules. |
| `npm run test:run -- membership-application` | `tests/shared/lib/membershipApplicationLogic.test.ts` | `membershipApplicationLogic.ts`, `MembershipApplicationDomain.ts` | Membership application status, readiness gaps. |
| `npm run test:run -- directory-redaction` | `tests/shared/lib/directoryRedaction.test.ts` | `directoryRedaction.ts`, `accessControlLogic.ts` | User Directory PII field-level redaction and DTO mapping, and access-control logic extensions. |
| `npm run test:run -- locale-path-logic` | `tests/lib/localePathLogic.test.ts` | `localePathLogic.ts` | Strip/add locale prefix; read locale from pathname. |
| `npm run test:run -- list-pagination` | `tests/shared/lib/listPaginationLogic.test.ts` | `listPaginationLogic.ts`, `listPagination.ts` | Page size clamp, total pages, row range labels, pagination item builder. |
| `npm run test:run -- list-step-tree` | `tests/puck/lib/listStepTree.test.ts` | `listStepTree.ts` | Stepper flat-index mapping, `chapterOpen` collapse, `resolveRowEmphasis`, label defaults, legacy plain-text HTML wrap. |
| `npm run test:run -- nexus-list-stepper` | `tests/puck/lib/nexusListStepper.test.ts` | `nexusListStepper.ts` | Flat step id helpers (`step-0`, …) for list editor state. |
| `npm run test:run -- infinite-grid-icon-loader` | `tests/components/background/infiniteGridIconLoader.test.ts` | `infiniteGridIconLoader.ts` | Grid icon URL resolution; WebKit UA detection. |
| `npm run test:run -- infinite-grid-motion-ease` | `tests/components/background/infiniteGridMotionEase.test.ts` | `infiniteGridMotionEase.ts`, `InfiniteGrid.tsx` | Exponential ease for dynamic ↔ static grid motion without offset snap. |
| `npm run test:run -- infinite-grid-cursor-sync` | `tests/components/background/infiniteGridCursorSync.test.ts` | `infiniteGridCursorSync.ts`, `PuckIframeTheme.tsx` | Maps Puck preview iframe pointer coords to global `#nexus-bg` cursor spotlight. |
| `npm run test:run -- infinite-grid-paint-theme` | `tests/components/background/infiniteGridPaintTheme.test.ts` | `infiniteGridPaintTheme.ts`, `InfiniteGrid.tsx` | DOM `data-theme` wins over next-themes `system` for grid paint palette. |
| `npm run test:run -- infinite-grid-sync-store` | `tests/components/background/infiniteGridSyncStore.test.ts` | `infiniteGridSyncStore.ts`, `InfiniteGrid.tsx` | Canvas mirror offsets align with layout grid publish snapshot. |
| `npm run test:run -- user-directory-schemas` | `tests/shared/validation/userDirectorySchemas.test.ts` | `userDirectorySchemas.ts` | Admin PATCH validation for profile + access-control fields. |
| `npm run test:run -- user-directory-save` | `tests/shared/lib/userDirectorySaveLogic.test.ts` | `userDirectorySaveLogic.ts` | Pre-save profile requirement checks for User Directory (self-government phone/avatar). |
| `npm run test:run -- apply-profile-patch` | `tests/shared/domains/applyProfilePatchToUser.test.ts` | `userProfilePatch.ts` | Shared profile patch helper for self-service and admin directory edits. |
| `npm run test:run -- profile-completeness` | `tests/shared/lib/userProfileCompleteness.test.ts` | `userProfileCompleteness.ts`, `phoneSchema.ts` | Membership profile gaps, phone requirement for self-government members. |
| `npm run test:run -- strip-user-optional-unique-fields` | `tests/shared/lib/stripUserOptionalUniqueFields.test.ts` | `stripUserOptionalUniqueFields.ts`, `User.ts` | Omit null/empty `email`/`login` before persist; avoids duplicate-key on optional unique indexes. |
| `npm run test:run -- user-notification-settings` | `tests/shared/lib/userNotificationSettingsLogic.test.ts` | `userNotificationSettingsLogic.ts` | Normalize user notification channel prefs; intersect with task/broadcast channels. |
| `npm run test:run -- notification-inbox` | `tests/shared/lib/notificationInboxLogic.test.ts` | `notificationInboxLogic.ts` | Inbox delivery keys, kind mapping, channel normalization. |
| `npm run test:run -- page-publish-notification` | `tests/shared/lib/pagePublishNotificationLogic.test.ts` | `pagePublishNotificationLogic.ts` | First go-live notification gating, copy builders, notify opt-in resolution. |
| `npm run test:run -- page-mention-notification` | `tests/shared/lib/pageMentionNotificationLogic.test.ts` | `pageMentionNotificationLogic.ts` | @mention extraction from Puck HTML, author exclusion, first go-live gating. |
| `npm run job:fix-user-unique-indexes` | `scripts/jobs/migrations/fixUserUniqueIndexes.ts` | `User.ts` indexes | One-time: `$unset` null email/login, replace legacy `email_1`/`login_1` with partial unique indexes. |
| `npm run test:run -- phone-schema` | `tests/shared/validation/phoneSchema.test.ts` | `phoneSchema.ts` | Phone charset stripping (markup/control chars), Zod normalization, live input filter. |
| `npm run test:run -- media-storage` | `tests/shared/lib/mediaStorageRules.test.ts` | `mediaStorageRules.ts`, `MediaDomain.ts` | Media purpose parsing, MIME/size validation, filename sanitization, local public URL builder. |
| `npm run test:run -- image-crop` | `tests/shared/lib/imageCropLogic.test.ts` | `imageCropLogic.ts`, `imageCropContexts.ts` | Rotation bounding box, export MIME/filename helpers, purpose-based preview mask resolution. |
| `npm run test:run -- remote-image-import` | `tests/shared/lib/remoteImageImport.test.ts` | `remoteImageImport.ts`, `MediaDomain.uploadFromUrl` | HTTPS-only URL guards, blocked IP/host rules, raster MIME sniffing, filename derivation from remote URLs. |
| `npm run test:run -- upload-reference-utils` | `tests/shared/lib/uploadReferenceUtils.test.ts` | `uploadReferenceUtils.ts`, `s3ObjectKey.ts` | Parse `/uploads/{segment}/…` paths; S3/CDN URL resolution; recursive JSON reference extraction. |
| `npm run test:run -- orphan-upload-cleanup` | `tests/shared/lib/orphanUploadCleanupLogic.test.ts` | `orphanUploadCleanupLogic.ts`, `MediaDomain.cleanupOrphanUploads` | Orphan key detection, min-age skip rules, env age parsing. |
| `npm run test:run -- scheduled-events` | `tests/shared/lib/scheduledEventLogic.test.ts` | `scheduledEventLogic.ts`, `SystemScheduledEvent` | Claim eligibility, exponential backoff, locking updates, and retry outcome resolution. |
| `npm run test:run -- safe-href` | `tests/shared/lib/safeHref.test.ts` | `safeHref.ts`, `safeMediaUrl.ts`, Puck block render guards | Safe hyperlink and media URL validation; rejects `javascript:` and `data:` schemes. |
| `npm run test:run -- puck-content-sanitize` | `tests/shared/lib/puckContentSanitize.test.ts` | `puckContentSanitize.ts`, `POST /api/puck` | Deep-walk Puck JSON on save; sanitize `href`, `image`, `url`, and rich `text` props. |
| `npm run test:run -- puck-draft-autosave` | `tests/shared/lib/puckDraftAutosaveLogic.test.ts` | `puckDraftAutosaveLogic.ts`, `usePuckBackgroundDraftSave.ts` | Background draft autosave quiet/interval gating, fingerprint equality, save-status resolution. |
| `npm run test:run -- content-security-policy` | `tests/lib/contentSecurityPolicy.test.ts` | `contentSecurityPolicy.ts`, `middleware.ts` | CSP directive assembly; nonce + `strict-dynamic`; dev vs production script-src rules. |
| `npm run test:run -- site-toast-motion` | `tests/lib/siteToastMotion.test.ts` | `siteToastMotion.ts`, `SiteToastCard.tsx` | Toast exit `animationend` detection for slide-out dismiss. |
| `npm run test:run -- suggestion-portal-logic` | `tests/lib/suggestionPortalLogic.test.ts` | `suggestionPortalLogic.ts`, `createSuggestionPortalRenderer.ts` | `@` / `/` popup fixed positioning, rect validation, stale portal cleanup. |
| `npm run test:run -- nexus-mention-types` | `tests/shared/lib/nexusMentionTypes.test.ts` | `nexusMentionTypes.ts` | Mention search flatten + dedupe by entity id. |
| `npm run test:run -- security-sanitize-audit` | `tests/shared/lib/securitySanitizeAudit.test.ts` | `puckContentSanitizeReport.ts`, `puckContentSanitize.ts` | Puck save audit report events; field path and kind metadata. |
| `npm run test:run -- security-sanitize-domain` | `tests/shared/domains/securitySanitizeDomain.test.ts` | `SecuritySanitizeDomain.ts` | Domain export smoke; list API wiring. |
| `npm run test:run -- user-directory-audit` | `tests/shared/lib/userDirectoryAuditLog.test.ts` | `userDirectoryAuditLog.ts`, `UserDirectoryAuditDomain.ts` | Patch summary strings; safe metadata builder (no PII). |
| `npm run test:run -- user-directory-audit-domain` | `tests/shared/domains/userDirectoryAuditDomain.test.ts` | `UserDirectoryAuditDomain.ts` | Domain export smoke; list/record API wiring. |
| `npm run job:media-orphan-cleanup` | `scripts/jobs/mediaOrphanCleanup.ts` | `MediaDomain.cleanupOrphanUploads` | CLI scan/delete pass (requires MongoDB). Use `job:media-orphan-cleanup:dry-run` to preview. |
| `npm run job:process-scheduled-events` | `scripts/jobs/processScheduledEvents.ts` | `SchedulerDomain.processDueEvents` | CLI scheduled events claim and execution pass (requires MongoDB). Use `job:process-scheduled-events:dry-run` to preview. |
| `npm run test:run -- nexus-editor-content` | `tests/lib/nexusEditor/nexusEditorContent.test.ts` | `nexusRichTextSanitize.ts`, `NexusRichTextEditor.tsx`, `NexusRichTextView.tsx` | Rich text HTML allowlist, mention anchor serialization, unsafe href stripping. |
| `npm run test:run -- nexus-editor-slash` | `tests/lib/nexusEditor/slashCommandCatalog.test.ts` | `slashCommandCatalog.ts`, `NexusSlashCommandExtension.ts` | Slash command catalog filtering, variant gating, keyword scoring. |
| `npm run test:puck` | *(meta)* | All Puck lib suites above | Runs every registered Puck unit test script in sequence. |
| `npm run test:run -- browser:install` | — | Playwright Chromium | One-time browser install for e2e specs. |
| `npm run test:run -- browser:puck-mobile-panel` | `tests/e2e/puck/mobile-panel.spec.ts` | Compact editor panel chrome | Bottom-rail panel reachability, grid backdrop freeze (requires running app + MongoDB). |
| `npm run test:run -- preview-iframe-document-ready` | `tests/puck/lib/previewIframeDocumentReady.test.ts` | `previewIframeDocumentReady.ts` | Guards against mutating Puck preview iframe documents before `documentElement` exists. |
| `npm run test:run -- browser:puck-theme-canvas` | `tests/e2e/puck/theme-canvas.spec.ts` | `PuckIframeTheme.tsx`, `puck-editor.css` | Theme toggle keeps single `#nexus-bg` + transparent canvas; no duplicate grid (requires running app). |
| `npm run test:run -- browser:puck-canvas-scrollport` | `tests/e2e/puck/canvas-scrollport.spec.ts` | `canvasLetterboxScrollport.ts`, `NexusPuckZoomGuard.tsx` | Single canvas scroll owner, no document/body duplicate scrollbars, letterbox scroll reachability (desktop). |
| `npm run test:run -- browser:puck-grid-row-height` | `tests/e2e/puck/grid-row-height.spec.ts` | `gridRowHeightSync.ts`, `NexusGridRender.tsx`, `puck-editor.css` | Carousel grid row tracks hug video height; empty cells stay within row tracks (requires running app + grid fixture page). |
| `npm run test:run -- browser:puck-grid-settings` | `tests/e2e/puck/grid-settings-select.spec.ts` | `NexusGridRender.tsx`, `usePuckOverlayPortal.ts`, `puck-editor.css` | Empty grid cell + settings gear open Grid Layout sidebar fields (requires auth + page with grid or Blocks insert). |
| `npm run test:run -- browser:puck-page-title` | `tests/e2e/puck/page-title-blur.spec.ts` | `useDeferredFieldCommit.ts`, `PageSettingsFieldGroup.tsx`, `PageHeaderLabel.tsx` | Page title sidebar + header badge keep edited value after blur (requires auth + edit route). |
| `npm run test:run -- browser:puck-inline-mention` | `tests/e2e/puck/inline-mention.spec.ts` | `NexusMentionExtension.ts`, `NexusEditorLinkExtension.ts`, `NexusText.tsx`, `TiptapField.tsx` | Body Text inline `@` mentions render as badges on canvas, round-trip in sidebar editor, and href navigates on publish (requires auth + `/news` or `PUCK_E2E_PAGE_PATH`). |

## Agent quickstart — Playwright browser automation

1. `npm run test:run -- browser:install`
2. Start app: `docker compose up` or `npm run dev` (MongoDB required for Puck edit routes)
3. `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:browser:puck-canvas-scrollport`
4. Optional: `PUCK_E2E_EDIT_PATH=/your-page/edit` (default `/test1/edit`; requires admin seed login — `PUCK_E2E_LOGIN` / `PUCK_E2E_PASSWORD` override `.env` defaults)

## Running tests

```bash
# Single suite
npm run test:run -- mobile-nav-gestures

# All Puck lib unit tests
npm run test:puck

# Every unit suite
npm test
```

## Mobile nav gestures — manual smoke (real device or DevTools)

After changing `NexusMobileNavPanelGestures.tsx` or `mobileNavPanelGestureLogic.ts`:

1. Open Puck editor at **≤900px width** (phone or Chrome DevTools → device toolbar, e.g. iPhone 14).
2. Open a bottom-rail tab (Blocks / Outline / Fields) — panel must be **open**.
3. **Double-click/tap the active tab** (the highlighted one, icon or label) within **~300ms** between taps → panel animates to max height.
4. **Double-click/tap again** → panel returns to height before step 3.
5. **Single click/tap** active tab → panel closes after ~**340ms**.

**DevTools notes:** Emulated clicks are mouse events, not touch — use two separate clicks or a native double-click on the **active** tab label. Clicks on inactive tabs switch tabs instead. Always hard-refresh after code changes.

Always run `npm run test:run -- mobile-nav-gestures` before marking the task complete.

## Adding a new test (template)

**Module under test** (top of source file JSDoc):

```typescript
/**
 * …
 * Tests: `tests/your/path/module.test.ts` — `npm run test:run -- your-suite`
 */
```

**Test file header** (top of `tests/**/*.test.ts`):

```typescript
/**
 * @fileoverview Unit tests for …
 *
 * Module under test: src/your/path/module.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:run -- your-suite`
 */
```

**package.json**:

```json
"test:your-suite": "npx tsx --test tests/your/path/module.test.ts"
```

**This registry**: add a row to the table above.
