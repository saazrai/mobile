# 3 · Mobile API Contract (`/api/v1`)

This is the **shared source of truth** between backend and mobile. Turn it into an
**OpenAPI 3.1** document and stand up a mock server so the mobile team is never
blocked on the backend.

**Verification status:** every domain below except Exams has been risk-scanned
against the real backend (`docs/09-backend-integration-risk-scan.md`) and is
**verified-clean** — no hidden session-state, no structural rework needed, the
"thin wrapper over existing controllers/services" premise holds. Two real gaps
turned up and are called out inline where they apply (§3.1 Google sign-in,
§3.6 content sanitization) — both are scoped new-backend-work items, not
premise-breaking surprises. **Exams is the one exception**: it needs a
different architecture entirely — see `docs/08-exam-spec.md` §8.1, which
supersedes §3.5 below.

Conventions:
- Base URL: `https://zziippee.com/api/v1` (UAT: `https://zziippee.laravel.cloud/api/v1`).
- Auth: `Authorization: Bearer <sanctum_token>` on everything except the public auth
  endpoints.
- Envelope: reuse the existing `App\Http\Responses\ApiResponse`:
  `{ "data": ..., "message": "...", "meta": {...} }`; errors:
  `{ "message": "...", "errors": {field:[...]}, "code": "..." }` with proper HTTP status.
- All list endpoints are cursor/paginated where large.
- **Reuses** column: the existing Service/Controller the endpoint should delegate to.

## 3.1 Auth & account

| Method | Path | Body / notes | Reuses |
|---|---|---|---|
| POST | `/auth/register` | `{name,email,password,device_name}` → `{token,user}` | `RegisteredUserController` logic |
| POST | `/auth/login` | `{email,password,device_name}` → `{token,user,enrollments[]}` | `AuthenticatedSessionController` (new token issue) |
| POST | `/auth/social/google` | `{id_token,device_name}` → `{token,user}` | **New code required** — see note below |
| POST | `/auth/email/send-code` | `{email}` (throttled) | `EmailVerificationController@sendVerificationCodeToEmail` |
| POST | `/auth/email/verify-code` | `{email,code}` | `EmailVerificationController@verifyCode` |
| POST | `/auth/forgot-password` | `{email}` | `PasswordResetLinkController` |
| GET | `/auth/me` | → current `{user, roles, verified}` | `auth()->user()` |
| POST | `/auth/logout` | revokes current token | Sanctum `currentAccessToken()->delete()` |
| DELETE | `/account` | GDPR delete (mirror web) | `PrivacyController@deleteAccount` |

**Google sign-in note:** `SocialAuthController` today only implements
server-side redirect/callback OAuth — there is no existing code path that
verifies a client-supplied `id_token` from the native Google Sign-In SDK
(docs/09-backend-integration-risk-scan.md §9.1). Scope this row as new backend
work, not a route wrapper around existing logic.

## 3.2 Enrollments & course home (learner-owned)

| Method | Path | Returns | Reuses |
|---|---|---|---|
| GET | `/enrollments` | my active/expired courses w/ progress summary | `Enrollment` + `LearnerProficiencyService::summaryForProduct` |
| GET | `/dashboard` | overview: enrollments, recent assessments, streak, mastery rollup | `DashboardController` logic |
| GET | `/learn/{product}` | course home: product types (nav tiles), course meta, exam settings | `LearnController@show` |
| GET | `/products/{product}` | catalog detail (for "buy" upsell → opens web) | `CatalogController@show` |

`{product}` is the product **slug** (route-key binding as in web).

**Head start on `EnsureEnrolledApi`:** the real `EnsureUserEnrolled` middleware
already branches on `$request->expectsJson()` and returns a JSON 403 —
more API-ready than anything else checked in docs/09 §9.2. The mobile-facing
middleware in §3.8's checklist can likely delegate straight to it rather than
reimplementing the enrollment check.

## 3.3 Curriculum & practice structure

| Method | Path | Returns | Reuses |
|---|---|---|---|
| GET | `/learn/{product}/domains` | domains → objectives, question counts, per-objective proficiency + latest assessment status | `ObjectivesController@index` |
| GET | `/learn/{product}/objectives/{objective}` | objective detail: total questions, best score, adaptive bounds, topics, resumable assessment | `ObjectivesController@show` |
| GET | `/learn/{product}/domains/{domain}` | domain detail + resumable assessment | `DomainsController@show` |

## 3.4 Adaptive practice (objective) & domain tests

Objective (adaptive) — mirrors `ObjectivesController`:

| Method | Path | Body → Returns |
|---|---|---|
| POST | `/practice/objectives/{objective}/start` | → `{assessment_id, question, progress}` |
| GET | `/assessments/{assessment}` | → current `{question, progress, elapsed_seconds, status}` (resume-aware) |
| POST | `/assessments/{assessment}/answer` | `{question_id, selected_options[], question_elapsed_seconds}` → `{is_correct, correct_options, justifications, is_done, next_question?, mastery?, progress}` |
| POST | `/assessments/{assessment}/pause` | `{elapsed_seconds}` → `{paused:true}` |
| GET | `/assessments/{assessment}/review` | → `{assessment{score,mastery,difficulty_history}, questions[]{options,correct,justifications,selected,is_correct}}` |

Domain tests reuse the **same assessment endpoints**; only the start differs:

| Method | Path |
|---|---|
| POST | `/practice/domains/{domain}/start` → `{assessment_id, questions?/question, progress}` |

> Because `/assessments/{assessment}/*` is generic, the app has **one practice
> engine** regardless of whether the source was an objective or a domain.
>
> **Correction (docs/09 §9.4):** this is true at the persistence layer only —
> both share the `Assessment`/`AssessmentResponse` tables (`type` column
> discriminated) and, unlike Exams, that state is genuinely reloaded fresh
> from the DB per-request with no session-array equivalent, so the endpoints
> above are accurate. It is **not** true at the question-selection layer:
> objective practice is adaptive (`AdaptivePracticeService`), domain tests are
> a fixed linear preset shuffled once at start. The app can still treat them
> as one client-side engine (both drive the same UI loop), just don't expect
> difficulty to adapt during a domain test. Bonus: `saveAnswer`/`pause` in the
> real controllers already return `JsonResponse`, not Inertia — a head start
> on this pair of endpoints specifically.

**Question payload shape** (what the app renders):
```json
{
  "id": 1234,
  "content": "<sanitized html/markdown>",
  "type": { "id": 1, "name": "multiple_choice" },
  "options": ["...", "...", "...", "..."],
  "expected_selection_count": 1,
  "difficulty_id": 3
}
```
On the answer response, the server adds `correct_options`, `justifications`, and
`is_correct` (reveal-after-submit rule, exactly as web).

## 3.5 Exam simulations — superseded, see docs/08-exam-spec.md

This section previously sketched Exams as a thin `ExamsController` mirror,
same as Practice. That's wrong: Exam's live-attempt state lives in the PHP
session, not a DB row a bearer-token client can address, so it can't be
wrapped the way every other domain in this doc can (docs/08-exam-spec.md
§8.1). The full corrected endpoint contract, lifecycle, and security
requirements are in `docs/08-exam-spec.md` §8.4–§8.6 — treat that doc as the
source of truth for Exams, not this section.

## 3.6 Study content

**Sanitization gap (docs/09 §9.5):** no HTML sanitizer exists anywhere in the
study-notes pipeline today — `StudyNotesController::show` passes block content
straight through. The "note blocks (sanitized)" column below describes the
*required* behavior, not the current one; add server-side sanitization before
wiring this up for real, or the mobile app's `react-native-markdown-display`
renderer is trusting unsanitized content (an XSS-shaped risk once this is real
content instead of mock fixtures).

| Method | Path | Returns | Reuses |
|---|---|---|---|
| GET | `/learn/{product}/study-notes` | topic list | `StudyNotesController@index` |
| GET | `/learn/{product}/study-notes/{topicSlug}` | note blocks (**needs sanitization added** — see above) | `StudyNotesController@show` |
| POST | `/learn/{product}/study-notes/blocks/{block}/track-interaction` | fire-and-forget analytics | existing JSON route (`routes/api.php:195-198`), currently `web`-guard session auth — needs Sanctum like everything else |
| GET | `/learn/{product}/flashcards` | flashcard deck(s) | `FlashcardsController@index` |
| GET | `/learn/{product}/videos` | video resources (URLs/metadata) | `VideosController@index` |
| GET | `/learn/{product}/study-plan` | study plan | `StudyPlanController@index` |

## 3.7 PBQ (fast-follow — API already JSON)

Wrap the existing PBQ endpoints under `/api/v1/pbqs*` with `auth:sanctum` instead of
session middleware. Already returns JSON, so this is the cheapest addition:
`GET /pbqs`, `GET /pbqs/{id}`, `POST /pbqs/{id}/submit`, `POST /pbq-sessions`,
`PATCH /pbq-sessions/{id}/progress`, `POST /pbq-sessions/{id}/submit`.

## 3.8 Backend build checklist

- [ ] `composer require laravel/sanctum`; configure token abilities; `HasApiTokens` on `User`. **Confirmed from-scratch** — Sanctum is absent from `composer.json`/`composer.lock` today (docs/09 §9.1), this is not partially done anywhere.
- [ ] `routes/api_v1.php`, registered with prefix `api/v1`, group `auth:sanctum` + `throttle:api`.
- [ ] `EnsureEnrolledApi` middleware — can likely delegate straight to the existing `EnsureUserEnrolled`, which already has a JSON-response branch (§3.2 note, docs/09 §9.2).
- [ ] Build Google `id_token` verification (§3.1 note) — no existing code path does this today.
- [ ] Add server-side HTML sanitization to the study-notes content pipeline (§3.6 note) before exposing it via API.
- [ ] `App\Http\Controllers\Api\V1\*` — thin controllers delegating to existing Services.
- [ ] `App\Http\Resources\V1\*` (QuestionResource, AssessmentResource, EnrollmentResource, ...).
- [ ] Reuse the existing `ApiResponse` envelope; standardize error shape.
- [ ] Pest **feature tests** asserting API scoring/adaptive parity with web controllers.
- [ ] Publish **OpenAPI 3.1** (`docs/openapi/mobile-v1.yaml`) + host a mock (Prism/Stoplight).
- [ ] CORS not needed (native), but keep tokens out of logs; run gateway/PII through `PIIRedaction`.
- [ ] **Exams is excluded from this checklist** — it needs the separate architecture in `docs/08-exam-spec.md` §8.4, not a thin wrapper.
