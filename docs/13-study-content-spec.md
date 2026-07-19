# 13 · Study Content Spec (Study Notes, Flashcards, Videos)

Covers doc 05's screens O (Study Notes), P (Flashcards), Q (Videos), and doc
07's gesture-driven UX for all three. Verified against
`/Users/saaz/Projects/zziippee`. Corrects doc 03 §3.6 and substantially
extends doc 09 §9.5.

## 13.1 Headline finding: Flashcards and Videos don't exist as content — not a wrapping job

Doc 09 §9.5 flagged these as "verified-clean, thin controllers." That was
accurate as far as it went (no session-state issue), but a closer read
changes the picture: **`FlashcardsController` and `VideosController` are
both stubs** (`app/Http/Controllers/Learn/FlashcardsController.php:17-24`,
`VideosController.php:17-24`) — each returns `component: null` and a bare
navigation outline, nothing else. There is **no `Flashcard` model, no
`Video` model, no corresponding migration** anywhere in the codebase.
`app/Imports/FlashcardsImport.php` and `app/Imports/VideosImport.php`
reference `App\Models\Flashcard`/`App\Models\Video` that don't exist — those
importers would fatal-error if actually run.

This means Flashcards and Videos aren't "build a JSON wrapper around existing
logic" work — they're **build the feature from scratch**: content model,
migration, admin authoring/import path, and only then an API. Doc 07's
swipe-to-grade deck and Reels-style video feed are real, well-specified
mobile UX (§7.3), but there's nothing on the backend to feed them yet. Don't
schedule mobile work on these ahead of the backend content model existing —
there's no way to build against real data, and building against an invented
shape risks the same kind of contract drift Exam had.

**Study Notes has real content** and is buildable now — see below.

## 13.2 Study Notes — verified findings

- **Topic hierarchy**: `StudyNotesController::index()`
  (`app/Http/Controllers/Learn/StudyNotesController.php:25-31`, data from
  `CourseOutlineService::forCourse`) nests topics inside
  `course.domains[].lessons[].topics[]`, each `{id, name, code, slug,
  study_notes:[{id,title}]}` — `code` and `slug` are the same value (both
  `topics.slug`); there's no separate `topicSlug` field the way doc 03's
  route param naming implied. Each topic's `study_notes` array holds only
  the single latest active note's `{id,title}` — no completion/progress
  indicator in this list response.
- **Content is heterogeneous, not a single markdown format.**
  `StudyNoteBlock` (`app/Models/StudyNoteBlock.php:19-123`) has a `type`
  column with real values `text, quiz, video, image, code, assignment,
  case_study` (migration
  `2026_04_11_000004_create_study_note_blocks_table.php:17-25`) — **not**
  `rich_text`/`key_facts`/`exam_tips` as doc 04/07 assumed. `content`'s shape
  depends entirely on `type` (`getContentAttribute`, `:45-54`):
  - `text`: either `content.markdown` (a Markdown string, matching the
    mobile app's `react-native-markdown-display` approach), **or** legacy
    structured JSON with keys like `opening, key_points[], exam_focus[],
    must_know, formula, mnemonic, comparison[], process[], table[], example,
    cross_reference, caution, exam_tip` — two different shapes under the
    same `type`, distinguished only by which keys are present. The mobile
    renderer needs to handle both, or the backend needs to normalize legacy
    blocks to the markdown shape before they reach the API.
  - `image`: `{src, alt, caption}`.
  - `quiz`: `{questions[]}`, each carrying `correct_options` — scored
    server-side (`StudyNotesController.php:150-169`), never trust client input.
  - `code`, `assignment`, `case_study`: exist as types but weren't read in
    detail — check their exact shapes before building renderers for them.
- **No sanitization anywhere server-side.** Confirmed precisely: the *only*
  sanitization in the entire pipeline is client-side `DOMPurify` in the web
  Vue app (`resources/js/pages/learn/study-notes/Show.vue:210,402,991-995`),
  applied after fetch, never server-side. The API itself would emit raw
  stored content. Fields needing sanitization before mobile can safely
  render them: `content.markdown` and every legacy structured string field
  (`opening, must_know, formula, mnemonic, example, cross_reference, caution,
  exam_tip`, plus the array-valued ones). This must be fixed server-side —
  the mobile app has no equivalent of `DOMPurify` available for
  `react-native-markdown-display` content, so client-side sanitization isn't
  a realistic fallback the way it might be for a WebView-based renderer.
- **`track-interaction` only tracks `view`/`answer`, not `bookmark` or
  `complete`** (`StudyNotesController.php:100-145`, validation:
  `action: required|in:view,answer`). Model `StudyNoteBlockCompletion`
  (`app/Models/StudyNoteBlockCompletion.php`) stores
  `{user_id, study_note_block_id, is_completed, completed_at,
  completion_time, is_correct, selected_answer, attempts}`. **Gap:**
  `show()` never attaches this completion state back to the `blocks`
  response — there's no way for a client to know "which blocks has this user
  already seen/answered" without a new query. The web app works around this
  with a client-side "read blocks" set that resets every session (not
  persisted). Mobile needs either a new endpoint or an eager-load added to
  `show()` (`completionForUser($user->id)` per block) to show real progress
  — doc 07's "segment bar shows position in the topic" is about scroll
  position, which is client-only and fine as-is, but a "how much of this
  topic have I actually completed across sessions" indicator needs this fix.
- **Study plan is also a stub** — `StudyPlanController`
  (`app/Http/Controllers/Learn/StudyPlanController.php:12-77`) returns
  `studyPlan: null, insights: null, weeklySchedule: [], todaySchedule: [],
  adaptationAvailable: false`. Doc 03 §3.6's `/study-plan` row has nothing
  real to wrap — treat as not-started, same category as Flashcards/Videos.

## 13.3 Proposed API surface

Supersedes doc 03 §3.6.

| Method | Path | Returns | Status |
|---|---|---|---|
| GET | `/learn/{product}/study-notes` | Topic tree (domains→lessons→topics), each topic's latest note `{id,title}` | Buildable now |
| GET | `/learn/{product}/study-notes/{topicSlug}` | `{topic, study_note, blocks[] (sanitized), previous_note, next_note}` | Buildable now, **blocked on adding server-side sanitization first** (§13.2) |
| POST | `/learn/{product}/study-notes/blocks/{block}/track-interaction` | `{action: view\|answer, completion_time?, selected_options?}` → `202` | Already exists (`routes/api.php:195-198`), needs Sanctum wrapping only |
| GET | `/learn/{product}/study-notes/{topicSlug}` (completion) | Should include per-block completion state | **New work** — not in the current `show()` response (§13.2) |
| GET | `/learn/{product}/flashcards` | — | **Not buildable** — no content model exists (§13.1) |
| GET | `/learn/{product}/videos` | — | **Not buildable** — no content model exists (§13.1) |
| GET | `/learn/{product}/study-plan` | — | **Not buildable** — stub, no real logic (§13.2) |

## 13.4 Mobile UX notes (corrects doc 07)

- **Study Notes' vertical Reel (doc 07 §7.3) is buildable** once
  sanitization is added — but the renderer needs a per-block-type switch
  (text/quiz/image/code/assignment/case_study), not a single markdown
  component, and needs to handle the legacy structured-JSON variant of
  `text` blocks alongside the markdown variant (§13.2).
- **Flashcards' swipe-to-grade deck and Videos' Reels feed (doc 07 §7.3) are
  fully speced UX with no backend to build against.** Don't start mobile
  implementation here until product/backend decides whether and how to build
  the underlying content model — building against an invented shape
  risks the exact kind of contract drift Exam had, except worse, since here
  there's no existing behavior at all to eventually reconcile against.

## 13.5 Corrections to existing docs

| Doc | Claim | Reality |
|---|---|---|
| 09 §9.5 | Flashcards/Videos "verified-clean" (thin, Inertia-only controllers) | Accurate on session-state, but incomplete — there's no content model behind them at all; this is unstarted feature work, not a wrapping job (§13.1) |
| 04 §4.1, 07 §7.3 | Study note blocks include `rich_text`/`key_facts`/`exam_tips` types | Real types are `text, quiz, video, image, code, assignment, case_study`; the rich-content feel doc 07 describes comes from `text` blocks' `content.markdown`, not a dedicated type |
| 02 §2.7 | "Question/notes HTML sanitized server-side" | Confirmed false (doc 09 §9.5 first flagged this; here confirmed exactly which fields and where the fix belongs) |
| 03 §3.6 | `/study-plan` "reuses `StudyPlanController`" as if real | Controller exists but returns only nulls/empty stubs — nothing to reuse yet |
