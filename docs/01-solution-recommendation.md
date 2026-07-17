# 1 · Solution Recommendation

## 1.1 What zziippee is today (the constraint that drives everything)

zziippee is a **Laravel 13 + Vue 3 + Inertia.js monolith**:

- **Inertia.js** means the "frontend" is not a standalone SPA/API client. Controllers
  return `Inertia::render('page', props)`; the server drives navigation and ships
  props for Vue to render. There is **no general-purpose JSON API** for the app's
  own screens.
- **Auth is session + cookie + CSRF** (Laravel session guard), plus Google via
  Socialite and a custom email-verification-code flow. Native apps cannot hold a
  web session cookie cleanly, and there is **no token issuance** for third parties.
- The **practice flows we care about** — `practice-quiz` (adaptive objective
  quizzes), `domains` (domain tests), and `exams` (simulations) — are Inertia pages
  gated by the `enrolled` middleware. Only a few write actions (`saveAnswer`,
  `pause`, `submit-answer`, `heartbeat`) return JSON, and they still ride on the
  **web/session middleware**.
- The **domain logic is already well-factored into Services** we can reuse without
  rewriting: `AdaptivePracticeService`, `LearnerProficiencyService`, the Exam engine
  subsystem (`ExamEngineFactory` → `LinearPracticeEngine` / `SimulationEngine`),
  `EnrollmentService`, `OrderService`.
- Only the **PBQ** subsystem already exposes real `/api/*` JSON endpoints.

**Conclusion:** the mobile app cannot reuse the existing web endpoints. It needs a
**purpose-built JSON API**. The good news: the hard part — the assessment/adaptive/
scoring logic — already lives in reusable Services, so the new API is a **thin
controller + resource layer over existing business logic**, not a rewrite.

## 1.2 Recommended solution

> **Add a versioned, token-authenticated mobile API (`/api/v1`, Laravel Sanctum)
> to the existing zziippee backend, reusing its domain Services, and build one
> React Native + Expo (TypeScript) app for iOS and Android against that API.**

Three components:

1. **Backend — new `/api/v1` layer** (same Laravel app, new route file + controllers)
   - **Sanctum personal access tokens** for stateless auth (issued on login /
     social / email-verify). No cookies, no CSRF for these routes.
   - `routes/api_v1.php` with an `auth:sanctum` middleware group and a new
     `EnsureEnrolledApi` guard mirroring today's `enrolled` middleware.
   - Thin `App\Http\Controllers\Api\V1\*` controllers that call the **same Services**
     the Inertia controllers call, returning **JSON Resources** (not Inertia).
   - **`ApiResponse` envelope** already exists in the codebase — standardize on it.
   - Publish an **OpenAPI 3.1** spec as the contract (doc 3).

2. **Mobile — React Native + Expo (TypeScript)**
   - One codebase → iOS + Android. Reuses the team's existing TypeScript fluency and
     lets us share DTO types with the backend contract.
   - **Expo** managed workflow for fast iteration, OTA updates (EAS Update), and
     painless native module access (secure storage, Google Sign-In, notifications).
   - **TanStack Query** for server-state + caching (online-first), **Zustand** for
     light UI state, **Expo Router** for navigation.

3. **Purchases stay on the web** (deliberate product decision)
   - Selling course access **in-app would trigger Apple/Google's ~30% commission**
     and their digital-goods rules. Instead, the app shows a user's **enrollments**
     and links out to the web storefront/checkout for buying. Standard, compliant
     pattern for education apps.

## 1.3 Why React Native + Expo over the alternatives

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **React Native + Expo (TS)** | One codebase; team already writes TS; shared types with backend; huge ecosystem; OTA updates; fast hiring | Very heavy custom native UI can need bare workflow | **Chosen** — best velocity/skill fit |
| Flutter (Dart) | Superb UI perf & consistency; single codebase | New language + toolchain for a TS/PHP team; can't share types with backend | Strong tech, worse team fit |
| Native Swift + Kotlin | Best platform fidelity & device APIs | **Two** codebases, ~2× cost, slower for a small team; overkill for a quiz app | Not justified for v1 |
| PWA / wrap the Inertia site | Cheapest | Poor UX; still session-auth bound; not a real "app"; no store presence value | Rejected |

For a content/quiz learning app with a small team and existing TS skills, RN+Expo is
the clear velocity winner and the result is fully native-feeling.

## 1.4 Why NOT a separate BFF service

We considered a standalone Backend-for-Frontend. Rejected because it would
**duplicate the adaptive/scoring/proficiency logic** that already lives in the
Laravel Services (or force cross-service calls with its own auth), adding a moving
part and a second source of truth. Since we can edit the backend, putting `/api/v1`
**inside the monolith next to the Services it reuses** is simpler, cheaper, and
keeps one source of truth. If the API later needs independent scaling, it can be
extracted — the versioned boundary makes that a clean future step.

## 1.5 Scope for v1 (agreed)

**In:** email/password + Google login, email verification, my enrollments/courses,
course home, adaptive practice quiz (objective), domain tests, exam simulation with
timer/pause/resume, answer review, learner proficiency/mastery dashboard, study
notes, flashcards, videos.

**Out (v1):** in-app purchasing (web only), admin/content-authoring, crypto tools,
PBQ authoring, real-time collaboration, full offline mode.

**Fast-follow candidates:** PBQ practice (API already JSON), push notifications
(study reminders / streaks), full offline practice packs, tablet-optimized layouts.

## 1.6 Top risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| API layer underestimated | Schedule slip | Logic already in Services; scope is controllers+resources+auth. Contract-first with OpenAPI + mock server so mobile isn't blocked. |
| Adaptive/exam state drift between web & API | Wrong scores | Both call the **same Services**; add API feature tests asserting parity with web behavior. |
| App-store rejection (purchases) | Launch delay | Keep purchases on web; app only reads entitlements. Follow Apple 3.1.1 reader-app guidance. |
| Auth: Google Sign-In on native | Login friction | Use native Google Sign-In → send `id_token` to a new `/api/v1/auth/social/google` that verifies and issues a Sanctum token. |
| Session-based `enrolled` gate | 401/403 on mobile | New `auth:sanctum` + `EnsureEnrolledApi` guard reusing `EnrollmentService`. |
| Content HTML (question/notes) rendering | XSS / layout bugs | Sanitize server-side; render via a vetted RN markdown/HTML component; mirror web's DOMPurify posture. |
