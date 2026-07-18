# Nexus Documentation Index

Central entry point for **Project Nexus** living documentation (`.ai/docs/`).

**Agent mandate:** Read relevant docs here before code changes; update them when architecture or behavior changes. See root [`AGENTS.md`](../AGENTS.md) — especially **§0.1 Documentation router** for deploy/architecture onboarding.

---

## Start here

| Document | Purpose |
|----------|---------|
| **[README.md](../README.md)** | **Project entry** — quick start, common commands |
| **[env_and_secrets.md](./env_and_secrets.md)** | **Environment & dotenvx** — `.env.local`, team staging, encrypt/pull, troubleshooting |
| **[.env.example](../.env.example)** | Variable catalogue and dev defaults |
| **[production_readiness.md](./production_readiness.md)** | **Production deploy checklist and deferred work** — verify before go-live; track future tasks from security, media, admin, and platform workstreams |
| [roadmap.md](./roadmap.md) | Master feature progress tracker (`Planned` / `In Progress` / `Completed`) |
| [architecture_map.md](./architecture_map.md) | Directory purposes and domain map |
| [testing.md](./testing.md) | Test registry — `scripts/test/testRegistry.json`, `npm run test:run -- <id>` |
| [directory_hygiene.md](./directory_hygiene.md) | Where files belong; test placement rules |

---

## Features

| Area | Spec |
|------|------|
| Auth & profiles | [features/auth_and_profiles.md](./features/auth_and_profiles.md) |
| **Local OAuth setup (dev)** | [features/local_oauth_setup.md](./features/local_oauth_setup.md) |
| **Public user profiles** | [features/public_user_profiles.md](./features/public_user_profiles.md) |
| **Task management** | [features/task_management.md](./features/task_management.md) |
| **Task groups** | [features/task_groups.md](./features/task_groups.md) |
| **Institutional calendar** | [features/institutional_calendar.md](./features/institutional_calendar.md) |
| Sign-in identity matrix | [features/signin_identity_matrix.md](./features/signin_identity_matrix.md) |
| **Membership applications** | [features/membership_applications.md](./features/membership_applications.md) |
| User model & socium | [features/user_model_and_social_identity.md](./features/user_model_and_social_identity.md) |
| Access control | [features/access_control_and_hierarchy.md](./features/access_control_and_hierarchy.md) |
| **List pagination** | [features/list_pagination.md](./features/list_pagination.md) |
| Admin hub | [features/admin_hub.md](./features/admin_hub.md) |
| **Internationalization** | [features/internationalization.md](./features/internationalization.md) |
| System broadcasts | [features/system_broadcasts.md](./features/system_broadcasts.md) |
| **Personal notification center** | [features/notification_center.md](./features/notification_center.md) |
| **Content security (XSS)** | [features/content_security.md](./features/content_security.md) |
| **Content policy (blocked words)** | [features/content_policy.md](./features/content_policy.md) |
| **General rules (admin)** | [features/general_rules.md](./features/general_rules.md) |
| Media storage | [features/media_storage.md](./features/media_storage.md) |
| **Image crop editor** | [features/image_crop_editor.md](./features/image_crop_editor.md) |
| Puck editor | [features/puck_editor.md](./features/puck_editor.md) |
| **Form fields / surveys / quizzes** | [features/form_fields_and_surveys.md](./features/form_fields_and_surveys.md) |
| **Page categories (tags)** | [features/page_categories.md](./features/page_categories.md) |
| **Page categories hub / news catalog** | [features/page_categories_hub.md](./features/page_categories_hub.md) |
| **Page access & path links** | [features/page_access_and_paths.md](./features/page_access_and_paths.md) |
| **Page variables (`${{ }}`)** | [features/nexus_page_variables.md](./features/nexus_page_variables.md) |
| **Page publisher invite links** | [features/page_publisher_invite_links.md](./features/page_publisher_invite_links.md) |
| Rich text editor | [features/nexus_rich_text_editor.md](./features/nexus_rich_text_editor.md) |
| Puck field controls | [features/puck_field_controls.md](./features/puck_field_controls.md) |
| **Field hints (settings UX)** | [features/field_hints.md](./features/field_hints.md) |
| Global layout | [features/global_layout.md](./features/global_layout.md) |
| Scheduled events | [features/scheduled_events.md](./features/scheduled_events.md) |
| **Hosting & deployment** | [features/hosting_and_deployment.md](./features/hosting_and_deployment.md) |
| Telegram & Mini App | [features/telegram_mini_app_and_bot.md](./features/telegram_mini_app_and_bot.md) |
| **Telegram project workspaces** | [features/telegram_project_workspaces.md](./features/telegram_project_workspaces.md) |
| Figma integration | [features/figma_ui_integration.md](./features/figma_ui_integration.md) |

---

## Conventions

- Feature specs live under `features/`.
- New directories must be declared in [architecture_map.md](./architecture_map.md).
- New tests must be registered in [testing.md](./testing.md).
- Production-only verification steps and **planned follow-ups** belong in [production_readiness.md](./production_readiness.md).
