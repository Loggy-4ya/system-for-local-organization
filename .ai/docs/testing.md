# Nexus — Repository Test Registry

Living catalog of automated tests in this repo. **Every new test file or `npm run test:*` script MUST be registered here** so agents and developers can find and reuse them without searching the tree.

## Agent protocol

When you add, rename, or remove a test:

1. Add or update the row in the registry table below.
2. Add a matching `test:*` script in `package.json` when the suite should be run on demand.
3. Keep the test file header comment in sync (`Run: …` line).
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

All current suites use **Node.js built-in test runner** via `tsx`:

```bash
npx tsx --test tests/path/to/file.test.ts
```

Imports in test files use the same `@/` and `@shared/` path aliases as application code (`tsconfig.json`).

## Registry

| Script | Test file | Module under test | What it verifies |
|--------|-----------|-------------------|------------------|
| `npm run test:preview-content-height` | `tests/puck/lib/previewContentHeight.test.ts` | `previewContentHeight.ts`, `PageRoot.tsx`, `PuckIframeTheme.tsx`, `NexusPuckZoomGuard.tsx` | Edit-mode canvas bounds: content-sized preview iframe + reactive Puck `rootHeight` sync to intrinsic page content (prevents infinite empty scroll and collapse-to-sliver feedback loops). |
| `npm run test:page-root-field-props` | `tests/puck/lib/pageRootFieldProps.test.ts` | `pageRootFieldProps.ts`, `pageBackgroundGridStore.ts`, `LayoutInfiniteGrid.tsx` | Page background grid motion resolves static mode for site-default backgrounds and syncs into the layout-level `InfiniteGrid`. |
| `npm run test:interactive-preview-scrollport` | `tests/puck/lib/interactivePreviewScrollport.test.ts` | `interactivePreviewScrollport.ts`, `previewContentHeight.ts`, `NexusPuckZoomGuard.tsx`, `puck-editor.css` | Interactive preview applies desktop viewport-controls inset on `#puck-canvas-root` (absolute), resets stale shell/iframe scroll offsets, and sizes locked `rootHeight` to the inner canvas below the FAB. |
| `npm run test:editor-mode-panel` | `tests/puck/lib/editorModePanelSnapshot.test.ts` | `editorModePanelSnapshot.ts`, `EditorModeToggle.tsx` | Edit ↔ interactive preview toggle saves plugin panel visibility before closing sidebars and restores it when returning to edit mode. |
| `npm run test:mobile-nav-gestures` | `tests/puck/lib/mobileNavPanelGestureLogic.test.ts` | `mobileNavPanelGestureLogic.ts`, `NexusMobileNavPanelGestures.tsx` | Compact editor bottom-rail **double-tap** detection (touch `button === -1`, ghost-click suppression with new-press guard, back-to-back expand/collapse), active nav link resolution from icon/label descendants, expand vs collapse toggle using `mobilePanelExpanded`, active-tab block rules during the double-tap pairing window. DOM wiring: document capture for `touchstart`/`pointerdown`/`mousedown` block; tap completion on active **`NavItem-link`** div via `touchend`/`pointerup`/`click`. |
| `npm run test:mobile-panel-dismiss` | `tests/puck/lib/mobilePanelDismissLogic.test.ts` | `mobilePanelDismissLogic.ts`, `NexusMobilePanelResizer.tsx`, `mobilePanelLayout.ts`, `NexusMobileNavPanelGestures.tsx` | Compact plugin panel **swipe-to-dismiss** drag: downward resize handle drag may shrink below 160px min; release at/below dismiss threshold dispatches `nexus-mobile-panel-close-request` → forced close sets `leftSideBarVisible: false`, resets persisted height to default for next open; sub-threshold release snaps back to min height. |
| `npm run test:mobile-blocks-palette-dismiss` | `tests/puck/lib/mobileBlocksPalettePanelDismissLogic.test.ts` | `mobileBlocksPalettePanelDismissLogic.ts`, `NexusMobileBlocksPalettePanelDismiss.tsx` | Blocks-tab **palette insert drag** only: panel closes on drag start or when pointer/finger leaves the overlay (`nexus-mobile-panel-close-request`); canvas taps and canvas reparent drags are ignored.
| `npm run test:carousel-pagination` | `tests/puck/lib/carouselPagination.test.ts` | `carouselPagination.ts` | Visible slide counts and pagination tiers at 500 / 640 / 720 / 1024px viewport widths. |
| `npm run test:carousel-nav` | `tests/puck/lib/carouselNavController.test.ts` | `carouselNavController.ts` | Carousel prev/next controller state and wrap-around at bounds. |
| `npm run test:carousel-edit-swipe` | `tests/puck/lib/carouselEditSwipeLogic.test.ts` | `carouselEditSwipeLogic.ts`, `useCarouselEditSwipe.ts`, `NexusCarouselRender.tsx` | Edit-mode swipe gesture routing: Embla `watchDrag` guards, pointer flick fallback, nested Puck block detection. |
| `npm run test:carousel-media-fill` | `tests/puck/lib/carouselMediaFill.test.ts` | `carouselMediaFill.ts`, `NexusVideoRender.tsx`, `NexusImageRender.tsx` | Composite slide detection (grid **inside** slide vs carousel **inside** grid cell); auto fill-slide resolution. |
| `npm run test:preview-iframe-composite` | `tests/puck/lib/previewIframeShellComposite.test.ts` | `previewIframeShellComposite.ts`, `infiniteGridIconLoader.ts` | WebKit/Safari user-agent probe for iframe-contained edit grid compositing fallback. |
| `npm run test:preview-iframe-grid-backing` | `tests/puck/lib/previewIframeGridBacking.test.ts` | `previewIframeGridBacking.ts` | `isInsidePuckEditorShell` — Puck shell detection (no duplicate iframe grids). |
| `npm run test:desktop-letterbox-zoom` | `tests/puck/lib/desktopLetterboxZoom.test.ts` | `sanitizePuckZoomConfig.ts` | Fixed presets shrink-to-fit when canvas is narrower than preset; moderate scale-up (capped) when frame is wider (letterbox). |
| `npm run test:puck-canvas-root-zoom-presentation` | `tests/puck/lib/puckCanvasRootZoomPresentation.test.ts` | `sanitizePuckZoomConfig.ts` | Detects/heals missing `#puck-canvas-root` transform after mobile preview clear helpers strip React-owned inline styles. |
| `npm run test:viewport-zoom-label` | `tests/puck/lib/formatViewportZoomLabel.test.ts` | `formatViewportZoomLabel.ts` | Viewport zoom trigger shows **Auto** for Puck auto-fit values (100% default + shrink-to-fit `(Auto)` options); manual picks stay as percentages. |
| `npm run test:canvas-letterbox-scrollport` | `tests/puck/lib/canvasLetterboxScrollport.test.ts` | `canvasLetterboxScrollport.ts`, `letterboxScrollportLogic.ts` | Shell overflow detection, iframe→shell wheel chaining, letterbox expand hysteresis (config height over clipped DOM). |
| `npm run test:resolve-auto-viewport` | `tests/puck/lib/resolveAutoViewport.test.ts` | `resolveAutoViewport.ts` | Fixed presets preserved; full-width auto when frame wider than closest preset. |
| `npm run test:desktop-editor-scrollport` | `tests/puck/lib/desktopEditorScrollport.test.ts` | `desktopEditorScrollport.ts` | Desktop ≥901px chrome MQ + fixed-viewport centering CSS contract in `puck-editor.css`. |
| `npm run test:compact-editor-viewport` | `tests/puck/lib/compactEditorViewport.test.ts` | `usePuckMobileEditorChrome.ts` | Compact editor `(max-width: 900px)` detection uses `matchMedia`, not raw `innerWidth`. |
| `npm run test:mobile-scrollport-grid-freeze` | `tests/puck/lib/mobileScrollportGridFreeze.test.ts` | `mobileScrollportGridFreeze.ts`, `InfiniteGrid.tsx`, `NexusEditorScrollportGrid.tsx` | Overlay panel + CSS-only backdrop (`inset: 0` on layout-inner); grid/canvas never shrink on panel open. See [puck_mobile_scrollport_grid_backdrop.md](features/puck_mobile_scrollport_grid_backdrop.md). |
| `npm run test:canvas-island-stack` | `tests/puck/lib/canvasIslandStackSync.test.ts` | `canvasIslandStackSync.ts`, `NexusEditorScrollportGrid.tsx`, `mobilePanelLayout.ts` | Measures plugin panel top vs canvas bottom; writes `--nexus-canvas-island-stack-bottom` so history + viewport FABs track panel height/position on compact editor. |
| `npm run test:outline-sortable` | `tests/puck/lib/outlineSortableLogic.test.ts` | `outlineSortableLogic.ts` | Outline drag reorder slot resolution (before/after/nest/outdent). |
| `npm run test:nexus-grid-item-zone` | `tests/puck/lib/nexusGridItemZonePolicy.test.ts` | `nexusGridItemZonePolicy.ts`, layout slot fields, `NexusGridItemPlacementGuard.tsx`, `NexusDraggableOutline.tsx` | Legacy standalone `NexusGridItem` block placement guard; see [puck_grid_item_zone_policy.md](features/puck_grid_item_zone_policy.md). |
| `npm run test:grid-item-array-reorder` | `tests/puck/lib/gridItemArrayReorder.test.ts` | `gridItemArrayReorder.ts`, `NexusGridRender.tsx` | Grid cell array reorder math for sidebar + canvas moves. |
| `npm run test:grid-cell-placement` | `tests/puck/lib/gridCellPlacement.test.ts` | `gridCellPlacement.ts`, `NexusGridRender.tsx` | Row-major explicit CSS grid placement (array order); prevents phantom gaps in carousel slides. |
| `npm run test:grid-row-height-sync` | `tests/puck/lib/gridRowHeightSync.test.ts` | `gridRowHeightSync.ts`, `NexusGridRender.tsx`, `puck-editor.css` | Per-row synchronized grid track heights; content-driven shrink/grow (no stretched empty-cell feedback); video aspect uses frame width. |
| `npm run test:grid-edit-sizing` | `tests/puck/lib/gridEditSizing.test.ts` | `gridEditSizing.ts`, `NexusGridRender.tsx` | Carousel-aware grid gap + forced single-row span in carousel slides. |
| `npm run test:nexus-grid-migration` | `tests/puck/lib/nexusGridMigration.test.ts` | `puckDataTree.ts` (`migrateLegacyNexusGridItems`) | Legacy slot-based grid items → `NexusGrid.props.items` array migration. |
| `npm run test:island-defaults` | `tests/puck/lib/applyIslandDefaultsOnInsert.test.ts` | `applyIslandDefaultsOnInsert.ts` | Island defaults on block insert and outline move; root canvas move seeds **SM** top/bottom margin (`ROOT_BLOCK_VERTICAL_MARGIN`); nested section/grid/carousel/tab inserts reset margins to **None**. |
| `npm run test:block-shell-band` | `tests/puck/lib/blockShellBand.test.ts` | `spacingFields.tsx` | Island-off blocks honor `islandMaxWidth` via centered width band; **Full Width** opts into edge-to-edge bleed. |
| `npm run test:content-width-tokens` | `tests/puck/lib/contentWidthTokens.test.ts` | `contentWidthTokens.ts` | Default 1400px container band; optional `full` bleed. |
| `npm run test:separator-block` | `tests/puck/lib/separatorBlockLogic.test.ts` | `separatorBlockLogic.ts`, `NexusSpacer.tsx` | Style preset bundles, prop normalization/inference, render model resolution for **Spacer & Divider** (`NexusSpacer`). |
| `npm run test:embed-media` | `tests/puck/lib/embedMedia.test.ts` | `embedMedia.ts`, `mediaFitMode.ts` | YouTube/Vimeo URL parsing, embed aspect lock (16:9), direct-file aspect fallback, media fit normalization. |
| `npm run test:canvas-drop-target` | `tests/puck/lib/canvasDropTargetLogic.test.ts` | `canvasDropTargetLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Canvas drag hover sizing, deepest drop-zone hit-test, top-anchor drop probe, slot kind classification. |
| `npm run test:canvas-reparent` | `tests/puck/lib/canvasReparentLogic.test.ts` | `canvasReparentLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Canvas reparent destination index, descendant guard, move/reorder commit builder, override detection. |
| `npm run test:canvas-carousel-drag` | `tests/puck/lib/canvasDragCarouselScenarios.test.ts` | `canvasDragCommitPlan.ts`, `canvasDropTargetLogic.ts`, `canvasReparentLogic.ts`, `NexusCanvasDragCoordinator.tsx` | Screencast-driven carousel drag scenarios: cross-slide move without revert, drag in/out of slides, release snap-back guards, outline cross-slide targets. |
| `npm run test:canvas-section-drop` | `tests/puck/lib/canvasSectionDropTarget.test.ts` | `canvasDropTargetLogic.ts`, `NexusSection.tsx`, `NexusCanvasDragCoordinator.tsx` | Default section glass-shell hit-testing, section vs root pick, occupied-section overlay outline, carousel slide vs wrapper pick. |
| `npm run test:block-render-visibility` | `tests/puck/lib/blockRenderVisibility.test.ts` | `blockRenderVisibility.ts`, all Puck block defaults | Page-root visibility models for every registered Puck block; guards video/image fill-slide collapse (outline exists but canvas height is 0). |
| `npm run test:global-layout` | `tests/shared/domains/globalLayoutValidation.test.ts` | `GlobalLayoutDomain.ts` | Header and footer layout configuration validation rules. |
| `npm run test:page-domain` | `tests/shared/domains/pageDomain.test.ts` | `PageDomain.ts` | Puck page delete path validation (homepage guard, slash prefix). |
| `npm run test:page-category` | `tests/shared/lib/pageCategoryLogic.test.ts` | `pageCategoryLogic.ts` | Page category label normalization, dedupe, suggestion filter, create-offer rules. |
| `npm run test:page-categories-hub-logic` | `tests/shared/lib/pageCategoriesHubLogic.test.ts` | `pageCategoriesHubLogic.ts` | Hub section normalization by path domain, unused domain filter, legacy tag migration, publication image collection, catalog card builder. |
| `npm run test:page-path-logic` | `tests/shared/lib/pagePathLogic.test.ts` | `pagePathLogic.ts` | Page path normalisation, badge labels, catalog filtering. |
| `npm run test:nexus-page-variables` | `tests/shared/lib/nexusPageVariables.test.ts` | `nexusPageVariables.ts` | `${{ variable }}` page field interpolation. |
| `npm run test:page-access-logic` | `tests/shared/lib/pageAccessLogic.test.ts` | `pageAccessLogic.ts` | Delegated editor grant rules, candidate filtering, storage normalisation. |
| `npm run test:page-publisher-invite-logic` | `tests/shared/lib/pagePublisherInviteLogic.test.ts` | `pagePublisherInviteLogic.ts` | Publisher invite token hashing, validation, URL builders, redeem eligibility. |
| `npm run test:global-layout-sortable` | `tests/global-layout/lib/editorSortableLogic.test.ts` | `editorSortableLogic.ts`, `useEditorSortableList.ts`, `HeaderNavItemSortableContext.tsx` | Global Layout Editor flat-list reorder, drop-slot helpers, and cross-category header nav moves. |
| `npm run test:global-layout-align` | `tests/global-layout/lib/headerNavAlignLogic.test.ts` | `headerNavAlignLogic.ts`, `DesktopHeaderNavZones` | Header nav zone grouping, per-category alignment, dense-nav threshold, and gap CSS mapping. |
| `npm run test:drag-scroll` | `tests/lib/dragAutoScrollLogic.test.ts` | `dragAutoScrollLogic.ts`, `useDragAutoScroll.ts` | Edge auto-scroll speed ramp for Global Layout Editor and Puck pointer drags. |
| `npm run test:page-edit-access` | `tests/lib/pageEditAccess.test.ts` | `pageEditAccess.ts`, `PageEditFab.tsx` | Puck page edit FAB visibility (ownership-aware `canEdit` flag from server). |
| `npm run test:page-edit-access-logic` | `tests/shared/lib/pageEditAccessLogic.test.ts` | `pageEditAccessLogic.ts` | Pure page ownership ACL (author, delegated editor, global admin tiers). |
| `npm run test:page-publication` | `tests/shared/lib/pagePublicationLogic.test.ts` | `pagePublicationLogic.ts` | Public visibility, scheduled publish timing, idempotency keys. |
| `npm run test:loader-auto-retry` | `tests/lib/loaderAutoRetryLogic.test.ts` | `loaderAutoRetryLogic.ts`, `SiteLoader.tsx` | Stuck route loader hard-reload cap per pathname (sessionStorage). |
| `npm run test:route-loader-recovery` | `tests/lib/routeLoaderRecoveryLogic.test.ts` | `routeLoaderRecoveryLogic.ts`, `RouteNavigationRecoveryHost.tsx`, `SiteLoader.tsx` | Back/bfcache detection; soft refresh before hard reload delays. |
| `npm run test:validation` | `tests/shared/validation/schemas.test.ts` | `authSchemas.ts`, `profileSchemas.ts` | Input validation rules for credentials login, signup, registration, and profile settings. |
| `npm run test:password-strength` | `tests/shared/lib/passwordStrength.test.ts` | `passwordStrength.ts` | Weak-password detection, login-equals-password guard, mixed character classes. |
| `npm run test:content-policy` | `tests/shared/lib/contentPolicy.test.ts`, `tests/shared/validation/contentPolicySchemas.test.ts` | `shared/lib/contentPolicy.ts`, `shared/validation/contentPolicySchemas.ts` | Blocked-word scan, HTML extraction, field-kind exclusions (numeric/tel skip). |
| `npm run test:general-rules-domain` | `tests/shared/domains/generalRulesDomain.test.ts` | `GeneralRulesDomain.ts`, `generalRulesListParsing.ts`, `effectiveGeneralRulesCache.ts`, `telegramBroadcastFormat.ts` | List parsing, effective cache → content policy, Telegram broadcast format. |
| `npm run test:academic-catalog` | `tests/shared/lib/academicCatalogLogic.test.ts` | `academicCatalogLogic.ts` | Catalog slugify, label normalisation, approved-label matching. |
| `npm run test:split-person-name` | `tests/shared/lib/splitPersonName.test.ts` | `splitPersonName.ts` | OAuth full-name split into given name and surname. |
| `npm run test:site-profile-basic` | `tests/shared/lib/siteProfileBasic.test.ts` | `siteProfileBasic.ts`, `SiteProfileProvider.tsx`, `GET /api/me` | Header basic profile DTO mapping and admin panel role gate. |
| `npm run test:public-profile-redaction` | `tests/shared/lib/publicProfileRedaction.test.ts` | `publicProfileRedaction.ts`, `/users/[userId]` | PII redaction between peers vs self/outranking viewers. |
| `npm run test:profile-contact-logic` | `tests/shared/lib/profileContactLogic.test.ts` | `profileContactLogic.ts`, `ProfileHeroActions.tsx` | Telegram/email contact resolution for profile Message actions. |
| `npm run test:profile-task-display-logic` | `tests/shared/lib/profileTaskDisplayLogic.test.ts` | `profileTaskDisplayLogic.ts`, `ProfileTasksPanel.tsx` | Open-task filtering, urgency sort, status badge classes. |
| `npm run test:task-access-logic` | `tests/shared/lib/taskAccessLogic.test.ts` | `taskAccessLogic.ts`, `TaskDomain.ts` | Task dispatch/view/delegate/start/reopen permission rules. |
| `npm run test:task-score-logic` | `tests/shared/lib/taskScoreLogic.test.ts` | `taskScoreLogic.ts` | Quality/time weighted performer scoring. |
| `npm run test:task-categories-settings-logic` | `tests/shared/lib/taskCategoriesSettingsLogic.test.ts` | `taskCategoriesSettingsLogic.ts` | General rules task category normalization. |
| `npm run test:task-delegation-limits-logic` | `tests/shared/lib/taskDelegationLimitsLogic.test.ts` | `taskDelegationLimitsLogic.ts`, `GeneralRulesSettings.ts` | Merge General Rules delegation quotas with defaults. |
| `npm run test:task-reminder-logic` | `tests/shared/lib/taskReminderLogic.test.ts` | `taskReminderLogic.ts`, `TaskDomain.ts` | Flexible reminder units, before-due scheduling, legacy migration. |
| `npm run test:task-reminder-notification-copy` | `tests/shared/lib/taskReminderNotificationCopy.test.ts` | `taskReminderNotificationCopy.ts` | Reminder toast/Telegram copy for open vs overdue tasks. |
| `npm run test:task-status-logic` | `tests/shared/lib/taskStatusLogic.test.ts` | `taskStatusLogic.ts` | Status transitions and overdue detection. |
| `npm run test:task-group-access-logic` | `tests/shared/lib/taskGroupAccessLogic.test.ts` | `taskGroupAccessLogic.ts` | Task group view/edit/add-part access rules. |
| `npm run test:task-group-roster-logic` | `tests/shared/lib/taskGroupRosterLogic.test.ts` | `taskGroupRosterLogic.ts` | Planned roster dedupe and performer union for groups. |
| `npm run test:task-group-status-logic` | `tests/shared/lib/taskGroupStatusLogic.test.ts` | `taskGroupStatusLogic.ts` | Auto-complete when all child tasks terminal. |
| `npm run test:task-group-reminder-notification-copy` | `tests/shared/lib/taskGroupReminderNotificationCopy.test.ts` | `taskGroupReminderNotificationCopy.ts` | Consolidated project reminder toast copy. |
| `npm run test:institutional-calendar-logic` | `tests/shared/lib/institutionalCalendarLogic.test.ts` | `institutionalCalendarLogic.ts` | Yearly anchors, role targeting, template interpolation. |
| `npm run test:nexus-hosting-logic` | `tests/shared/lib/nexusHostingLogic.test.ts` | `nexusHostingLogic.ts`, `nexusHostingBootstrap.ts` | VPS/serverless/hybrid mode resolution, env validation, scheduler policy clamping. |
| `npm run test:telegram-workspace-logic` | `tests/shared/lib/telegramWorkspaceLogic.test.ts` | `telegramWorkspaceLogic.ts` | Strategy resolution, templates, performer threshold. |
| `npm run test:telegram-channel-id-logic` | `tests/shared/lib/telegramChannelIdLogic.test.ts` | `telegramChannelIdLogic.ts` | Bot API ↔ MTProto supergroup id conversion. |
| `npm run test:telegram-group-command-logic` | `tests/shared/lib/telegramGroupCommandLogic.test.ts` | `telegramGroupCommandLogic.ts`, `TelegramGroupCommandDomain.ts` | `/status` formatting, `/task_done` task resolution. |
| `npm run test:telegram-operator-env` | `tests/shared/lib/telegramOperatorEnv.test.ts` | `telegramOperatorEnv.ts` | MTProto worker env validation. |
| `npm run test:user-search-logic` | `tests/shared/lib/userSearchLogic.test.ts` | `userSearchLogic.ts`, `UserSearchDomain.ts`, `/api/users/search` | User search filters and subtitle formatting. |
| `npm run test:broadcast-schemas` | `tests/shared/validation/broadcastSchemas.test.ts` | `broadcastSchemas.ts` | Admin broadcast API payload validation (channels, body, variant). |
| `npm run test:telegram-init-data` | `tests/shared/lib/verifyTelegramWebAppInitData.test.ts` | `verifyTelegramWebAppInitData.ts` | Telegram Mini App `initData` HMAC verification, tamper rejection, auth_date expiry. |
| `npm run test:telegram-webapp-viewport` | `tests/shared/lib/telegramWebAppViewport.test.ts` | `telegramWebAppViewport.ts`, `TelegramWebAppViewportHost.tsx` | Desktop Telegram viewport stable height resolution and chrome color normalization. |
| `npm run test:telegram-contact-harvest` | `tests/shared/lib/telegramContactHarvestLogic.test.ts` | `telegramContactHarvestLogic.ts`, `AuthDomain.absorbTelegramSharedContact` | Shared-contact validation and phone normalization for bot harvest. |
| `npm run test:seed-admin-user` | `tests/shared/lib/seedAdminUser.test.ts` | `seedAdminUserHelpers.ts`, `oauthLinkCookie.ts` | Admin seed Telegram clearance helper; OAuth link cookie build/read/clear. |
| `npm run test:user-socium` | `tests/shared/lib/userSociumHelpers.test.ts` | `userSociumHelpers.ts`, `User.ts`, `AuthDomain.ts` | Full name formatting, socium role sync from student title, quality score init, publish eligibility. |
| `npm run test:access-control` | `tests/shared/lib/accessControlLogic.test.ts` | `accessControlLogic.ts`, `AccessControlDomain.ts` | Hierarchy same-tier-or-below administration, effective permissions, role administration and delegation rules. |
| `npm run test:membership-application` | `tests/shared/lib/membershipApplicationLogic.test.ts` | `membershipApplicationLogic.ts`, `MembershipApplicationDomain.ts` | Membership application status, readiness gaps. |
| `npm run test:directory-redaction` | `tests/shared/lib/directoryRedaction.test.ts` | `directoryRedaction.ts`, `accessControlLogic.ts` | User Directory PII field-level redaction and DTO mapping, and access-control logic extensions. |
| `npm run test:list-pagination` | `tests/shared/lib/listPaginationLogic.test.ts` | `listPaginationLogic.ts`, `listPagination.ts` | Page size clamp, total pages, row range labels, pagination item builder. |
| `npm run test:list-step-tree` | `tests/puck/lib/listStepTree.test.ts` | `listStepTree.ts` | Stepper flat-index mapping, `chapterOpen` collapse, `resolveRowEmphasis`, label defaults, legacy plain-text HTML wrap. |
| `npm run test:nexus-list-stepper` | `tests/puck/lib/nexusListStepper.test.ts` | `nexusListStepper.ts` | Flat step id helpers (`step-0`, …) for list editor state. |
| `npm run test:infinite-grid-icon-loader` | `tests/components/background/infiniteGridIconLoader.test.ts` | `infiniteGridIconLoader.ts` | Grid icon URL resolution; WebKit UA detection. |
| `npm run test:infinite-grid-motion-ease` | `tests/components/background/infiniteGridMotionEase.test.ts` | `infiniteGridMotionEase.ts`, `InfiniteGrid.tsx` | Exponential ease for dynamic ↔ static grid motion without offset snap. |
| `npm run test:infinite-grid-cursor-sync` | `tests/components/background/infiniteGridCursorSync.test.ts` | `infiniteGridCursorSync.ts`, `PuckIframeTheme.tsx` | Maps Puck preview iframe pointer coords to global `#nexus-bg` cursor spotlight. |
| `npm run test:user-directory-schemas` | `tests/shared/validation/userDirectorySchemas.test.ts` | `userDirectorySchemas.ts` | Admin PATCH validation for profile + access-control fields. |
| `npm run test:user-directory-save` | `tests/shared/lib/userDirectorySaveLogic.test.ts` | `userDirectorySaveLogic.ts` | Pre-save profile requirement checks for User Directory (self-government phone/avatar). |
| `npm run test:apply-profile-patch` | `tests/shared/domains/applyProfilePatchToUser.test.ts` | `userProfilePatch.ts` | Shared profile patch helper for self-service and admin directory edits. |
| `npm run test:profile-completeness` | `tests/shared/lib/userProfileCompleteness.test.ts` | `userProfileCompleteness.ts`, `phoneSchema.ts` | Membership profile gaps, phone requirement for self-government members. |
| `npm run test:strip-user-optional-unique-fields` | `tests/shared/lib/stripUserOptionalUniqueFields.test.ts` | `stripUserOptionalUniqueFields.ts`, `User.ts` | Omit null/empty `email`/`login` before persist; avoids duplicate-key on optional unique indexes. |
| `npm run test:user-notification-settings` | `tests/shared/lib/userNotificationSettingsLogic.test.ts` | `userNotificationSettingsLogic.ts` | Normalize user notification channel prefs; intersect with task/broadcast channels. |
| `npm run job:fix-user-unique-indexes` | `scripts/fixUserUniqueIndexes.ts` | `User.ts` indexes | One-time: `$unset` null email/login, replace legacy `email_1`/`login_1` with partial unique indexes. |
| `npm run test:phone-schema` | `tests/shared/validation/phoneSchema.test.ts` | `phoneSchema.ts` | Phone charset stripping (markup/control chars), Zod normalization, live input filter. |
| `npm run test:media-storage` | `tests/shared/lib/mediaStorageRules.test.ts` | `mediaStorageRules.ts`, `MediaDomain.ts` | Media purpose parsing, MIME/size validation, filename sanitization, local public URL builder. |
| `npm run test:image-crop` | `tests/shared/lib/imageCropLogic.test.ts` | `imageCropLogic.ts`, `imageCropContexts.ts` | Rotation bounding box, export MIME/filename helpers, purpose-based preview mask resolution. |
| `npm run test:remote-image-import` | `tests/shared/lib/remoteImageImport.test.ts` | `remoteImageImport.ts`, `MediaDomain.uploadFromUrl` | HTTPS-only URL guards, blocked IP/host rules, raster MIME sniffing, filename derivation from remote URLs. |
| `npm run test:upload-reference-utils` | `tests/shared/lib/uploadReferenceUtils.test.ts` | `uploadReferenceUtils.ts`, `gcsObjectKey.ts`, `s3ObjectKey.ts` | Parse `/uploads/{segment}/…` paths; GCS/S3/CDN URL resolution; recursive JSON reference extraction. |
| `npm run test:orphan-upload-cleanup` | `tests/shared/lib/orphanUploadCleanupLogic.test.ts` | `orphanUploadCleanupLogic.ts`, `MediaDomain.cleanupOrphanUploads` | Orphan key detection, min-age skip rules, env age parsing. |
| `npm run test:scheduled-events` | `tests/shared/lib/scheduledEventLogic.test.ts` | `scheduledEventLogic.ts`, `SystemScheduledEvent` | Claim eligibility, exponential backoff, locking updates, and retry outcome resolution. |
| `npm run test:safe-href` | `tests/shared/lib/safeHref.test.ts` | `safeHref.ts`, `safeMediaUrl.ts`, Puck block render guards | Safe hyperlink and media URL validation; rejects `javascript:` and `data:` schemes. |
| `npm run test:puck-content-sanitize` | `tests/shared/lib/puckContentSanitize.test.ts` | `puckContentSanitize.ts`, `POST /api/puck` | Deep-walk Puck JSON on save; sanitize `href`, `image`, `url`, and rich `text` props. |
| `npm run test:content-security-policy` | `tests/lib/contentSecurityPolicy.test.ts` | `contentSecurityPolicy.ts`, `middleware.ts` | CSP directive assembly; nonce + `strict-dynamic`; dev vs production script-src rules. |
| `npm run test:security-sanitize-audit` | `tests/shared/lib/securitySanitizeAudit.test.ts` | `puckContentSanitizeReport.ts`, `puckContentSanitize.ts` | Puck save audit report events; field path and kind metadata. |
| `npm run test:security-sanitize-domain` | `tests/shared/domains/securitySanitizeDomain.test.ts` | `SecuritySanitizeDomain.ts` | Domain export smoke; list API wiring. |
| `npm run test:user-directory-audit` | `tests/shared/lib/userDirectoryAuditLog.test.ts` | `userDirectoryAuditLog.ts`, `UserDirectoryAuditDomain.ts` | Patch summary strings; safe metadata builder (no PII). |
| `npm run test:user-directory-audit-domain` | `tests/shared/domains/userDirectoryAuditDomain.test.ts` | `UserDirectoryAuditDomain.ts` | Domain export smoke; list/record API wiring. |
| `npm run job:media-orphan-cleanup` | `scripts/mediaOrphanCleanup.ts` | `MediaDomain.cleanupOrphanUploads` | CLI scan/delete pass (requires MongoDB). Use `job:media-orphan-cleanup:dry-run` to preview. |
| `npm run job:process-scheduled-events` | `scripts/processScheduledEvents.ts` | `SchedulerDomain.processDueEvents` | CLI scheduled events claim and execution pass (requires MongoDB). Use `job:process-scheduled-events:dry-run` to preview. |
| `npm run test:nexus-editor-content` | `tests/lib/nexusEditor/nexusEditorContent.test.ts` | `nexusRichTextSanitize.ts`, `NexusRichTextEditor.tsx`, `NexusRichTextView.tsx` | Rich text HTML allowlist, mention anchor serialization, unsafe href stripping. |
| `npm run test:nexus-editor-slash` | `tests/lib/nexusEditor/slashCommandCatalog.test.ts` | `slashCommandCatalog.ts`, `NexusSlashCommandExtension.ts` | Slash command catalog filtering, variant gating, keyword scoring. |
| `npm run test:puck` | *(meta)* | All Puck lib suites above | Runs every registered Puck unit test script in sequence. |
| `npm run test:browser:install` | — | Playwright Chromium | One-time browser install for e2e specs. |
| `npm run test:browser:puck-mobile-panel` | `tests/e2e/puck/mobile-panel.spec.ts` | Compact editor panel chrome | Bottom-rail panel reachability, grid backdrop freeze (requires running app + MongoDB). |
| `npm run test:browser:puck-canvas-scrollport` | `tests/e2e/puck/canvas-scrollport.spec.ts` | `canvasLetterboxScrollport.ts`, `NexusPuckZoomGuard.tsx` | Single canvas scroll owner, no document/body duplicate scrollbars, letterbox scroll reachability (desktop). |
| `npm run test:browser:puck-grid-row-height` | `tests/e2e/puck/grid-row-height.spec.ts` | `gridRowHeightSync.ts`, `NexusGridRender.tsx`, `puck-editor.css` | Carousel grid row tracks hug video height; empty cells stay within row tracks (requires running app + grid fixture page). |
| `npm run test:browser:puck-grid-settings` | `tests/e2e/puck/grid-settings-select.spec.ts` | `NexusGridRender.tsx`, `usePuckOverlayPortal.ts`, `puck-editor.css` | Empty grid cell + settings gear open Grid Layout sidebar fields (requires auth + page with grid or Blocks insert). |

## Agent quickstart — Playwright browser automation

1. `npm run test:browser:install`
2. Start app: `docker compose up` or `npm run dev` (MongoDB required for Puck edit routes)
3. `PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:browser:puck-canvas-scrollport`
4. Optional: `PUCK_E2E_EDIT_PATH=/your-page/edit` (default `/test1/edit`; requires admin seed login — `PUCK_E2E_LOGIN` / `PUCK_E2E_PASSWORD` override `.env` defaults)

## Running tests

```bash
# Single suite
npm run test:mobile-nav-gestures

# All Puck lib unit tests
npm run test:puck
```

## Mobile nav gestures — manual smoke (real device or DevTools)

After changing `NexusMobileNavPanelGestures.tsx` or `mobileNavPanelGestureLogic.ts`:

1. Open Puck editor at **≤900px width** (phone or Chrome DevTools → device toolbar, e.g. iPhone 14).
2. Open a bottom-rail tab (Blocks / Outline / Fields) — panel must be **open**.
3. **Double-click/tap the active tab** (the highlighted one, icon or label) within **~300ms** between taps → panel animates to max height.
4. **Double-click/tap again** → panel returns to height before step 3.
5. **Single click/tap** active tab → panel closes after ~**340ms**.

**DevTools notes:** Emulated clicks are mouse events, not touch — use two separate clicks or a native double-click on the **active** tab label. Clicks on inactive tabs switch tabs instead. Always hard-refresh after code changes.

Always run `npm run test:mobile-nav-gestures` before marking the task complete.

## Adding a new test (template)

**Module under test** (top of source file JSDoc):

```typescript
/**
 * …
 * Tests: `tests/your/path/module.test.ts` — `npm run test:your-suite`
 */
```

**Test file header** (top of `tests/**/*.test.ts`):

```typescript
/**
 * @fileoverview Unit tests for …
 *
 * Module under test: src/your/path/module.ts
 * Registry: .ai/docs/testing.md
 * Run: `npm run test:your-suite`
 */
```

**package.json**:

```json
"test:your-suite": "npx tsx --test tests/your/path/module.test.ts"
```

**This registry**: add a row to the table above.
