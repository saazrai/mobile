# 11 · Home, Courses & Progress Spec

Covers doc 05's screens E (Home/Dashboard), F (My Courses), G (Course Home),
R (Progress). Verified against `/Users/saaz/Projects/zziippee`. Builds on and
**substantially corrects** doc 03 §3.2/§3.3 and doc 09 §9.2/§9.3 — the
original risk-scan only checked for session-state landmines, not whether the
data these screens assume actually exists. It mostly doesn't.

## 11.1 The headline finding: Home and Progress are largely aspirational

Doc 04 §4.3 and doc 05 §5.4 describe a Home screen built around a "Continue
where you left off" card, a "weakest objective" suggestion, a streak, and a
mastery rollup ring. **None of these exist in the real backend.**
`DashboardController::index` (`app/Http/Controllers/DashboardController.php:14-88`)
returns only: `enrollments[]`, `stats` (`enrolledCourses, examsCompleted,
bestScore, averageScore`), and `recentResults[]` (last 5 completed
assessments). There is no in-progress-assessment lookup, no streak
computation anywhere in the codebase (`grep -rn "streak" app/` returns
exactly one hit: a hardcoded `'study_streak' => 0` in a **dead, unrouted**
controller, `app/Http/Controllers/Api/CourseController.php:275`), and no
"weakest objective" logic anywhere.

This is a bigger gap than a thin-wrapper job. Two paths:

| Option | What it means |
|---|---|
| **A. Build the missing logic** | Add continue-card (query the most recent `in_progress`/`paused` `Assessment`), weakest-objective (query `LearnerProficiencyService::summaryForProduct`'s lowest-scoring objective), and streak (new tracking, doesn't exist today) as real backend features |
| **B. Redesign Home around what's real** | Ship a v1 Home built from `recentResults`/`stats`/`enrollments` only — a "recent activity + your courses" screen instead of the "continue + weakest + streak" concept doc 05 sketched |

Recommend **B for v1** (nothing to build, ships immediately) with **A as a
fast-follow** once product decides the continue-card/streak/weakest-objective
features are worth the new backend logic — don't block the mobile build on
them.

## 11.2 Enrollment gating — real correction to how access actually works

Doc 03 and doc 09 both assumed `Enrollment.status === 'active'` (plus
`expires_at`) is what gates access. **It is not.**
`User::hasAccessToProduct()` (`app/Models/User.php:121-130`) checks
`OrderItem` + `Order::STATUS_PAID` directly — it does not query `Enrollment`
at all. `Enrollment` rows exist (`status` enum:
`active|completed|revoked|expired|suspended` — not `active|expired` as doc 03
assumed) and `expires_at` is set on creation, but **nothing automatically
flips `status` based on `expires_at`** except a manual `Enrollment::markAsExpired()`
helper with no scheduled job calling it. This means:

- `EnsureUserEnrolled`/`EnsureEnrolledApi` gating decisions should be based on
  the same order-paid check the web app actually uses, not on `Enrollment.status`,
  or mobile and web will disagree about who has access.
- The mobile "My Courses" screen's `expires_at` badge (doc 05 screen F) is
  reading a field that isn't reliably kept in sync with actual access — treat
  it as informational, not authoritative, until a real expiry job exists.

## 11.3 Verified findings, per screen

**Screen F — My Courses / Enrollments:** `Enrollment` model fields
(`app/Models/Enrollment.php:11-22`): `user_id, course_id, product_id,
product_price_id, order_id, status, purchased_at, completed_at, revoked_at,
expires_at`. No mastery/progress percentage on the model itself — that comes
separately from `LearnerProficiencyService`.

**Screen G — Course Home:** `LearnController::show`
(`app/Http/Controllers/Learn/LearnController.php:19-83`, outline builder at
`:90-179`) returns `course` (full domain→lesson→topic tree),
`product.types[]` (nav tiles, each with a `route` mapped via
`productTypeRouteMap()`: `study-notes, lesson, practice-quiz, exam,
flashcards, videos, resources, activities`), `progress` (`completed_lessons`
is **hardcoded to 0** — not real), `stats` (counts only). **Exam settings are
NOT in this payload** — contrary to doc 03 §3.2's assumption
("course meta, exam settings"). They live in `CatalogController::show`
(`app/Http/Controllers/Catalog/CatalogController.php:40-53`) instead, which
eager-loads `course.examSetting:{duration_minutes,passing_percentage,question_count}`.
If the mobile Course Home needs exam stats up front, call catalog's show
endpoint too, or move that eager-load into `LearnController` server-side.

**Domains list** (`DomainsController::index`,
`app/Http/Controllers/Learn/DomainsController.php:20-92`): per-domain fields
are `{id, number, name, slug, description, questions_count, lessons[]}` — **no
`mastery_percent` field**, contrary to doc 03 §3.3's assumption. A sibling
`latestAssessments` prop (keyed by `domain_id`) carries
`{id,status,score,total_questions,responses}` for in-progress/completed/paused
domain tests — it's a top-level sibling prop, not nested per-domain the way
doc 03 sketched.

**Screen R — Progress:** the only real data source is
`LearnerProficiencyService::summaryForProduct(userId, productId)`
(`app/Services/LearnerProficiencyService.php:204`), returning a flat map
keyed `"{scope_type}:{scope_id}"` (`scope_type` = `objective|domain|course`)
of `{proficiency_score, proficiency_level (1-6), proficiency_label, proficiency_color,
best_level, attempts_count, coverage, last_assessed_at}` — usable for a "mastery by
domain" view. **Fixed 2026-07-20 — no longer a separate call.** This map is
now embedded directly under `data.proficiency` on both `CurriculumController::courseHome`
(`GET /learn/{product}`, course-scope entry keyed `"course:{$course->id}"`) and
`CurriculumController::objectives` (`GET /learn/{product}/objectives`,
objective-scope entries keyed `"objective:{$objective->id}"`) — mobile's Course
and Objectives screens render a `ProficiencyBadge` from these directly, no
extra fetch needed. `bandForScore()` (`LearnerProficiencyService.php:281`) is
the canonical score→level/label mapping — never duplicate its thresholds
client-side.

**Color is API data too, as of 2026-07-21 — don't hand-roll it.**
`LearnerProficiencyService::colorsForLevel()` (`:311`) is the single source of
truth for the hex palette (4 CVD-safe hue anchors × light/dark ×
text/bg/border/dot), folded into `bandForScore()`'s `color` key and into every
`proficiency_color` field `summaryForProduct()` emits. Mobile's
`ProficiencyBadge` (`src/components/ProficiencyBadge.tsx`) reads
`entry.proficiency_color.light`/`.dark` directly rather than computing its own
red/amber/green mapping from `proficiency_level` — mirrors the web frontend's
`Index.vue`/`Review.vue` switch from Tailwind `:class` utilities to `:style`
hex for the same reason (the color is response data now, not something a
build-time class scanner can see coming). **Score history (a chartable time
series) and a streak calendar have no backend support at all** —
`Assessment.completed_at`/`score` rows exist and could be aggregated, but
there's no existing service that does it;
this is new backend work, not a wrapper.

## 11.4 Proposed API surface

Supersedes doc 03 §3.2/§3.3's affected rows.

| Method | Path | Returns | Notes |
|---|---|---|---|
| GET | `/dashboard` | `{enrollments[], stats, recent_results[]}` | Matches what's real — **no** `continue`, `streak`, or `weakest_objective` keys unless §11.1 Option A is built |
| GET | `/enrollments` | `Enrollment[]` (mirrors `Enrollment` fields) | Access gating uses the Order-paid check (§11.2), not `Enrollment.status`, regardless of what this list displays |
| GET | `/learn/{product}` | `{course, product{types[]}, progress, stats, proficiency}` | `progress.completed_lessons` is always `0` today — don't build a progress bar on it until that's real. `proficiency` added 2026-07-20 (§11.3) |
| GET | `/products/{product}` | Catalog detail incl. `exam_setting{duration_minutes,passing_percentage,question_count}` | Call this (not `/learn/{product}`) if Course Home needs exam stats |
| GET | `/learn/{product}/domains` | `Domain[]` (no `mastery_percent`) + sibling `latest_assessments` keyed by domain_id | Corrects doc 03 §3.3 — still no proficiency on *this* endpoint; use `/learn/{product}/objectives` (below) for that |
| GET | `/learn/{product}/objectives` | `{domains[], latestAssessments, latestCompletedAssessments, proficiency}` | `proficiency` is the same `LearnerProficiencyService::summaryForProduct` map as `/learn/{product}` above, all scopes included (§11.3) |

## 11.5 Corrections to existing docs

| Doc | Claim | Reality |
|---|---|---|
| 04 §4.3, 05 §5.4 (screen E) | Home shows "Continue" card, weakest-objective suggestion, streak, mastery rollup | None of this exists server-side; only enrollments/stats/recent-results are real (§11.1) |
| 02 §2.6, 03 §3.2 | Access gated by `Enrollment.status === 'active'` + `expires_at` | Gated by `Order`/`OrderItem` paid status; `Enrollment` isn't the source of truth and `expires_at` isn't auto-enforced (§11.2) |
| 03 §3.2 | `GET /learn/{product}` returns "course meta, exam settings" | Exam settings aren't in this payload — they're in `CatalogController::show` (§11.3) |
| 03 §3.3 | Domains list includes "per-objective proficiency" | Still not on `/learn/{product}/domains` specifically — proficiency lives on `/learn/{product}` (course scope) and `/learn/{product}/objectives` (objective scope), fixed 2026-07-20 (§11.3) |
| This doc, §11.4 (earlier revision) | Proposed a new `GET /progress/{product}` route for proficiency | Shipped differently — embedded as `data.proficiency` directly on the existing `courseHome`/`objectives` endpoints instead of a new route (§11.3) |
| 05 §5.3 (screen R) | Progress screen shows "score trends" and "streak calendar" | Neither has backend support today — new work, not a wrapper (§11.3) |
