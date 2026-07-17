# 3 · Mobile API Contract (`/api/v1`)

This is the **shared source of truth** between backend and mobile. Turn it into an
**OpenAPI 3.1** document and stand up a mock server so the mobile team is never
blocked on the backend.

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
| POST | `/auth/social/google` | `{id_token,device_name}` → `{token,user}` | `SocialAuthController` + Socialite `userFromToken` |
| POST | `/auth/email/send-code` | `{email}` (throttled) | `EmailVerificationController@sendVerificationCodeToEmail` |
| POST | `/auth/email/verify-code` | `{email,code}` | `EmailVerificationController@verifyCode` |
| POST | `/auth/forgot-password` | `{email}` | `PasswordResetLinkController` |
| GET | `/auth/me` | → current `{user, roles, verified}` | `auth()->user()` |
| POST | `/auth/logout` | revokes current token | Sanctum `currentAccessToken()->delete()` |
| DELETE | `/account` | GDPR delete (mirror web) | `PrivacyController@deleteAccount` |

## 3.2 Enrollments & course home (learner-owned)

| Method | Path | Returns | Reuses |
|---|---|---|---|
| GET | `/enrollments` | my active/expired courses w/ progress summary | `Enrollment` + `LearnerProficiencyService::summaryForProduct` |
| GET | `/dashboard` | overview: enrollments, recent assessments, streak, mastery rollup | `DashboardController` logic |
| GET | `/learn/{product}` | course home: product types (nav tiles), course meta, exam settings | `LearnController@show` |
| GET | `/products/{product}` | catalog detail (for "buy" upsell → opens web) | `CatalogController@show` |

`{product}` is the product **slug** (route-key binding as in web).

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

## 3.5 Exam simulations

Mirrors `ExamsController` + `ExamEngineFactory`. Exam assessments use **UUIDs**.

| Method | Path | Notes |
|---|---|---|
| GET | `/learn/{product}/exams` | available exam settings (duration, question_count, passing %) |
| POST | `/exams/{examSetting}/start` | → `{assessment_id, first_question, deadline_at}` |
| GET | `/exams/{assessment}` | current state (resume): question, index, remaining_seconds |
| POST | `/exams/{assessment}/submit-answer` | `{question_id, selected_options[]}` (throttled) |
| POST | `/exams/{assessment}/pause` | timed pause |
| POST | `/exams/{assessment}/heartbeat` | keepalive; returns server `remaining_seconds` |
| POST | `/exams/{assessment}/end` | finalize (or auto on expiry) |
| GET | `/exams/{assessment}/results` | score, pass/fail, per-domain breakdown |
| GET | `/exams/{assessment}/review` | full answer review |

## 3.6 Study content

| Method | Path | Returns | Reuses |
|---|---|---|---|
| GET | `/learn/{product}/study-notes` | topic list | `StudyNotesController@index` |
| GET | `/learn/{product}/study-notes/{topicSlug}` | note blocks (sanitized) | `StudyNotesController@show` |
| POST | `/learn/{product}/study-notes/blocks/{block}/track-interaction` | fire-and-forget analytics | existing JSON route |
| GET | `/learn/{product}/flashcards` | flashcard deck(s) | `FlashcardsController@index` |
| GET | `/learn/{product}/videos` | video resources (URLs/metadata) | `VideosController@index` |
| GET | `/learn/{product}/study-plan` | study plan | `StudyPlanController@index` |

## 3.7 PBQ (fast-follow — API already JSON)

Wrap the existing PBQ endpoints under `/api/v1/pbqs*` with `auth:sanctum` instead of
session middleware. Already returns JSON, so this is the cheapest addition:
`GET /pbqs`, `GET /pbqs/{id}`, `POST /pbqs/{id}/submit`, `POST /pbq-sessions`,
`PATCH /pbq-sessions/{id}/progress`, `POST /pbq-sessions/{id}/submit`.

## 3.8 Backend build checklist

- [ ] `composer require laravel/sanctum`; configure token abilities; `HasApiTokens` on `User`.
- [ ] `routes/api_v1.php`, registered with prefix `api/v1`, group `auth:sanctum` + `throttle:api`.
- [ ] `EnsureEnrolledApi` middleware (reuse `EnrollmentService`) for `/learn/*`, `/practice/*`, `/exams/*`.
- [ ] `App\Http\Controllers\Api\V1\*` — thin controllers delegating to existing Services.
- [ ] `App\Http\Resources\V1\*` (QuestionResource, AssessmentResource, EnrollmentResource, ...).
- [ ] Reuse the existing `ApiResponse` envelope; standardize error shape.
- [ ] Pest **feature tests** asserting API scoring/adaptive parity with web controllers.
- [ ] Publish **OpenAPI 3.1** (`docs/openapi/mobile-v1.yaml`) + host a mock (Prism/Stoplight).
- [ ] CORS not needed (native), but keep tokens out of logs; run gateway/PII through `PIIRedaction`.
