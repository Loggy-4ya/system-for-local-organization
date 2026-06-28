# Form Fields, Surveys & Quizzes (Puck `NexusInput`)

**Status:** `[x] Completed` — question + answer block, choice/quiz modes, response storage, author statistics chapter, distribution stubs for future channels.

---

## Overview

The Puck **Form Input** block (`NexusInput`) lets page authors add **questions** with either:

| Mode | Respondent UI | Author use |
|------|---------------|------------|
| **Open text** | Single-line input (text / email / number / password) | Surveys, feedback, open answers |
| **Choice** | Radio (single pick) or checkboxes (multi pick) | Surveys or **quizzes** with marked correct options |

Responses are stored per authenticated user per field (one answer per user). Authors with page edit access see aggregates in the optional **Statistics** sidebar chapter.

---

## Puck block props

| Prop | Type | Notes |
|------|------|-------|
| `question` | string | Respondent-facing question (legacy `label` migrates on load) |
| `mode` | `text` \| `choice` | Answer capture style |
| `options` | `{ id, label, isCorrect }[]` | 2–12 rows when `mode === "choice"`; `isCorrect` used for quiz grading |
| `placeholder` | string | Text mode only |
| `helperText` | string | Optional description under the question |
| `inputType` | `text` \| `email` \| `password` \| `number` | Text mode only |
| `required` | `yes` \| `no` | Blocks empty submission |
| `answerMode` | `survey-single` \| `survey-multiple` \| `quiz-single` \| `quiz-multiple` | Single sidebar control — combines scoring + respondent pick shape |
| `gradingMode` | `none` \| `single` \| `multiple` | Derived from `answerMode` (kept for API / stats) |
| `choiceSelection` | `single` \| `multiple` | Derived from `answerMode` (legacy / runtime) |
| `distribution` | object | Cross-platform publish flags (see below) |
| `statsPanel` | custom | Read-only statistics UI in editor |

Sidebar chapters: **Content**, **Options** (choice — drag-reorder rows, inline **Correct** badges for quizzes), **Text Answer** (text), **Validation**, **Quiz Grading** (choice — unified **Answer mode** segmented control), **Distribution**, **Statistics**.

**Answer mode:** One 2×2 segmented control replaces separate grading + respondent-selection radios — e.g. “Survey — pick one”, “Quiz — multiple correct”. **Options:** drag grip + label + correct badge per row; status hint explains the active rules.

---

## Runtime behaviour

1. Published page renders `NexusInputRender` inside a `glass-panel` shell.
2. Respondent must **sign in** to submit (same policy as page likes/comments).
3. `POST /api/pages/form-fields/submit` validates against live Puck props on the page document.
4. Quiz fields return immediate `isCorrect` in the API response after submit.
5. Prior answers hydrate via `GET /api/pages/form-fields/mine` (409 on re-submit).

**Lookup keys:** `pagePath` (MongoDB page path) + Puck `props.id` (block id).

---

## Data model

| Collection | Model | Purpose |
|------------|-------|---------|
| `form_field_responses` | `FormFieldResponse` | Per-user answers (`textAnswer` or `selectedOptionIds`, optional `isCorrect`) |
| `survey_participations` | `SurveyParticipation` | Upserted once per user per page on first field submit (`surveyId` = page path) |

---

## API routes

| Method | Path | Auth | Role |
|--------|------|------|------|
| `POST` | `/api/pages/form-fields/submit` | Session required | Respondent submit |
| `GET` | `/api/pages/form-fields/mine` | Optional | Hydrate current user's answer |
| `GET` | `/api/pages/form-fields/stats` | Session + page edit access | Author statistics |

---

## Statistics chapter

Visible when the page is **persisted**. Loads `GET /api/pages/form-fields/stats` for the selected block id:

- Total responses
- Per-option bars (choice mode)
- Recent text answers (text mode, up to 20 preview rows)
- Quiz correctness rate when `gradingMode` is `single` or `multiple`

---

## Distribution (future cross-platform)

The **Distribution** chapter stores author intent for syndicating the same field elsewhere. **Only Web is active today** (`web` is always forced to `yes` on save).

| Flag | Status | Planned consumer |
|------|--------|------------------|
| `web` | **Active** | Published Puck page |
| `telegramMiniApp` | Stub UI | Telegram Mini App form renderer |
| `telegramBot` | Stub UI | Bot prompts / group surveys |
| `externalEmbed` | Stub UI | Signed embed or public field API |

**Agent note:** When implementing a new channel, read this table first — response schema and `fieldId` + `pagePath` keys must stay stable so statistics remain unified.

---

## Code map

| Layer | Path |
|-------|------|
| Constants | `shared/constants/formField.ts` |
| Pure logic | `shared/lib/formFieldLogic.ts` |
| Model | `shared/models/FormFieldResponse.ts` |
| Domain | `shared/domains/FormFieldDomain.ts` |
| Validation | `shared/validation/formFieldSchemas.ts` |
| Puck block | `src/components/puck/blocks/content/NexusInput.tsx` |
| Runtime UI | `src/components/puck/blocks/content/NexusInputRender.tsx` |
| Stats field | `src/components/puck/fields/FormFieldStatsPanelField.tsx` |
| Distribution field | `src/components/puck/fields/FormFieldDistributionField.tsx` |
| Client | `src/lib/formFieldClient.ts` |
| Tests | `tests/shared/lib/formFieldLogic.test.ts` — `npm run test:run -- form-field-logic` |

---

## Acceptance criteria

- [x] Question + text or choice answer on published pages
- [x] Quiz modes with author-editable correct options (`single` / `multiple`)
- [x] Authenticated submit with one answer per user per field
- [x] `SurveyParticipation` upsert on first page response
- [x] Author statistics sidebar chapter
- [x] Distribution toggles documented for future Telegram / embed work
- [ ] Telegram Mini App / bot / external embed consumers
- [ ] Anonymous or editable responses (deferred)
