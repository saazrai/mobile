# 9 · Backend Integration Risk Scan

A fast pass across every domain doc 03 assumes, checking specifically for the
category of landmine Exam turned out to have (docs/08-exam-spec.md §8.1):
functional state stored in the PHP session rather than a DB row, which a
bearer-token mobile client can't participate in. This is **not** a full
Exam-style deep-dive per domain — it's a triage pass to find out where real
specs are still needed versus where the doc 03 sketch can be trusted. Verified
against `/Users/saaz/Projects/zziippee` directly.

**Update (2026-07-18):** this scan only checked for session-state landmines
(the specific thing that went wrong with Exam). Full per-domain specs written
afterward — `docs/10-auth-account-spec.md`, `docs/11-home-courses-progress-spec.md`,
`docs/12-practice-spec.md`, `docs/13-study-content-spec.md` — found real,
larger gaps this scan's narrower check didn't surface: Home/Dashboard's
"continue"/streak/weakest-objective concepts are mostly fictional (doc 11
§11.1), Flashcards/Videos have **no content model at all** (doc 13 §13.1, a
bigger gap than "needs a JSON wrapper"), and Practice has its own
answer-key-leakage issue similar to Exam's original one (doc 12 §12.1). "Verified-clean"
below means *no session-state landmine* — it does not mean *fully
ready to wrap*. Read the per-domain docs for the complete picture.

## Result: Exam was the exception, not the rule

Every other domain checked is **verified-clean** on the session-state
question — no `ExamSessionManager`-style landmine anywhere else. Two real,
previously-undocumented gaps turned up instead (§9.6, §9.7), neither of which
is a session-state problem.

## 9.1 Auth — verified-clean

`app/Http/Controllers/Auth/{AuthenticatedSessionController,RegisteredUserController,SocialAuthController,VerifyEmailController,EmailVerificationController,NewPasswordController,PasswordResetLinkController}.php`

Customized Breeze-style scaffold. Login is standard web-guard session auth
(`AuthenticatedSessionController.php:34,46-47`). **Sanctum is not installed**
anywhere — absent from `composer.json`/`composer.lock`, no `HasApiTokens` on
any model — confirms doc 03 §3.8's checklist item ("`composer require
laravel/sanctum`") is real, unstarted work, not already-there scaffolding.
Email verification is a 4-digit code backed by `Cache::put/get` keyed by email
(`EmailVerificationController.php:39-99`) — genuinely stateless, easy to wrap.
Password reset uses Laravel's standard signed-token flow. The only session
reads found are trivial Inertia flash-message reads (`session()->get('status')`)
and Laravel's password-confirmation re-auth gate — neither blocks a JSON wrap.

**Real gap (not session-related):** `SocialAuthController.php:19-86` is
server-side redirect/callback OAuth (Socialite). Doc 03 §3.2 assumes
`POST /auth/social/google {id_token}` — verifying a client-supplied
`id_token` from the native Google Sign-In SDK — but **no such verification
path exists in the real controller today**. This needs new backend code, not
just a route wrapper, same category of gap as Exam (assumed-thin-wrapper that
isn't) but much smaller in scope.

## 9.2 Dashboard + Enrollments — verified-clean

`app/Http/Controllers/DashboardController.php`, `app/Services/EnrollmentService.php`,
`app/Models/Enrollment.php`, `app/Http/Middleware/EnsureUserEnrolled.php`

Pure DB reads, zero session usage. **Good find:** `EnsureUserEnrolled`
(`:30-31`) already branches on `$request->expectsJson()` and returns a JSON
403 — this middleware is already half-ready for API use, more so than
anything else checked. `EnrollmentService` is plain DB-transaction logic.

## 9.3 Curriculum (course home, domains, objectives) — verified-clean

`app/Http/Controllers/Learn/{LearnController,DomainsController,ObjectivesController}.php`

All three are `Inertia::render`-only today (no JSON variants exist), but zero
session usage across any of them — confirmed by grep, zero hits. Building the
`/api/v1` equivalents doc 03 §3.3 describes is real work, but it's the
"expected scaffolding" kind, not a hidden-state kind.

## 9.4 Adaptive Practice — verified-clean, doc 03's "already stateless" claim holds

`app/Services/AdaptivePracticeService.php`, `app/Http/Controllers/Learn/ObjectivesController.php:254-600`,
`app/Http/Controllers/Learn/DomainsController.php:173-406`

This was the most important one to check, since docs/08's §8.1 finding
specifically warned that "assumed-clean" claims about other domains hadn't
been independently verified — and this is where Exam's engine also lives
(`ExamEngineFactory` wraps `LinearPracticeEngine`, which this reuses). The
claim holds: all adaptive state (`current_question_id`, `difficulty_history`,
`result_history`, `mastery_level`) lives in `assessments.metadata`, reloaded
fresh from the DB on every request via route-model-binding — no
session-array equivalent anywhere. **Bonus finding:** `saveAnswer`/`pause`
already return `JsonResponse`, not Inertia — those two endpoints are
effectively already thin JSON today.

**Correction to doc 3 §3.4's framing:** "one practice engine regardless of
whether the source was an objective or a domain" is only true at the
persistence layer (both use the shared `Assessment`/`AssessmentResponse`
tables, `type` column discriminated). It is **not** true at the
question-selection layer — domain tests are a fixed linear preset
(`DomainsController.php:175-180` shuffles and stores a fixed `question_ids`
array up front), while objective practice is genuinely adaptive via
`AdaptivePracticeService`. Minor doc correction, not a landmine.

## 9.5 Study content (notes, flashcards, videos) — verified-clean on session state; one real gap

`app/Http/Controllers/Learn/{StudyNotesController,FlashcardsController,VideosController}.php`,
`routes/api.php:195-198`

No session usage. The `track-interaction` endpoint doc 03 §3.6 describes
already exists (`routes/api.php:195-198`) and already returns JSON — but it's
still `web` middleware (cookie/session auth), so it needs the same
Sanctum-wrapping as everything else, not a rebuild.

**Real gap:** no HTML sanitizer (`Purify`, `HTMLPurifier`, `strip_tags`) exists
anywhere in the study-notes pipeline — `StudyNotesController::show` passes
block content straight through unsanitized. This directly contradicts doc 02
§2.7's cross-cutting-concerns table ("Question/notes HTML sanitized
server-side; app renders via vetted markdown/HTML view") and the assumption
baked into how the mobile app currently renders content
(`react-native-markdown-display`, trusting the input). If the real content
source allows arbitrary HTML, mobile needs either server-side sanitization
added before the API wrap, or its own sanitization step before rendering —
rendering unsanitized HTML as trusted markdown is a real XSS-shaped risk
against real backend content.

## 9.6 What this changes about next steps

- No domain needs an Exam-style forensic deep-dive — the hidden-state risk
  that justified that level of effort for Exam isn't present elsewhere.
- Two concrete, scoped gaps need real backend work before their mobile
  screens are safe against real data: **Google `id_token` verification** (§9.1) and
  **study-notes sanitization** (§9.5). Both are far smaller than Exam's
  session-vs-stateless gap.
- Doc 03's `/api/v1` sketch can be trusted as a *routing/shape* plan for Auth,
  Dashboard, Curriculum, Practice, and Study content — none of it needs the
  kind of wholesale correction Exam's §3.5 needed.
