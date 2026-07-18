# Mobile App Implementation Tasks (Phased)

The master build plan for this repo, tying together [docs/08-13](../docs/README.md)
(per-domain specs, each verified against real backend code) and
[docs/03](../docs/03-api-contract.md)/[09](../docs/09-backend-integration-risk-scan.md)
(contract/risk-scan). Exam has its own detailed task breakdown —
[TASKS-EXAM.md](TASKS-EXAM.md) — referenced from Phase 3 rather than
duplicated here.

**Backend is a parallel track, not a blocker.** The `zziippee` backend is
being built independently (a separate AI session, a separate repo, rooted
at `/Users/saaz/Projects/zziippee`) against these same specs — it has its
own spec doc mirroring doc 08's contract
(`zziippee` repo: `docs/superpowers/specs/2026-07-18-mobile-api-sanctum-design.md`).
This file's actionable scope is `[MOBILE]` work only. `[BACKEND]` items are
listed for context/dependency-tracking — they're someone else's task list,
not this repo's.

**Backend URL is already fully configurable — no code changes needed to
switch it.** `API_BASE_URL` (`.env`) → `app.config.ts`'s `extra.apiBaseUrl` →
read in `src/api/client.ts`. Point it at the bundled mock
(`http://localhost:4010/api/v1`, the default), the real backend's dev/UAT
URL, or production, per environment — see `.env.example`. **Cutting over a
domain from mock to real backend is a config change (or an EAS per-channel
secret), not a mobile code change**, as long as the real backend matches the
spec the mock was built from. If a real endpoint's response shape doesn't
match its spec doc, that's a backend bug to report, not something to work
around client-side.

## Status

- **Exam**: mobile prototype built and verified against the mock (doc 08
  is the contract) — see [TASKS-EXAM.md](TASKS-EXAM.md). Before pointing
  this domain at the real backend, confirm the state-persistence rework in
  doc 08 §8.1/§8.4 has actually landed there — if the real backend still
  stores live-attempt state in the PHP session, a bearer-token client
  can't use it regardless of URL config.
- **Practice**: mobile prototype partially built against the mock
  (`app/assessment/[id]/quiz.tsx`, `review.tsx`, `src/api/hooks/practice.ts`).
  Before cutover, confirm doc 12 §12.1's fix (answer-key leak in the
  current-question payload) has landed — this is a correctness/security
  property of the contract itself, not a timing issue.
- **Everything else** (Auth, Home/Courses/Progress, Study Content): mobile
  screens not started. Build against the documented contract now (docs
  10/11/13), pointed at the mock, same as Exam/Practice were.
- **Study Content caveat**: Study Notes is buildable against a spec:
  Flashcards/Videos have no backend content model *by design of the current
  spec* (doc 13 §13.1) — if the backend track has since added one, confirm
  the actual shape against doc 13 before building; don't assume the doc's
  "not buildable" note is still accurate without checking.

## Phase 1 — Auth + Courses (docs 10, 11)

- **1.1** `[MOBILE]` Login/Register/Verify-email/Forgot-password screens (doc
  05 screens B–D) — build the verify-then-register flow order per doc 10
  §10.3 (verification must succeed *before* the register call, not after).
  **Done.** Forgot-password: email input → `POST /auth/forgot-password` (202);
  reset-password screen handles `zziippee://reset?...` deep link with token+email,
  collects new password + confirmation, POSTs to `/auth/reset-password`. See
  commit `2a20e10`.
- **1.2** `[MOBILE]` Home/My Courses/Course Home screens (doc 05 screens
  E–G) — scope to doc 11 §11.1's Option B (enrollments/stats/recent-results
  only) unless the backend track confirms it built Option A's
  continue-card/streak/weakest-objective features — check before assuming
  those fields exist in a real response.
- **1.3** `[MOBILE]` Profile/Settings screen — server-synced dark mode
  (`ui_preferences.theme`, not just local `useColorScheme()`), GDPR export
  action, accurate "anonymize" (not "delete") account copy (doc 10 §10.3).
  **Done.** Dark mode now loads from `/account/preferences` on mount and syncs
  changes via POST; server value is source of truth with system-scheme fallback.
  See commit `7ac53ef`.
- **1.4** `[BACKEND, tracked elsewhere]` Sanctum scaffold, Auth/Account/
  Dashboard/Curriculum wrapper endpoints, Google `id_token` verification,
  enrollment-gating fix (order-paid check, not `Enrollment.status`) — docs
  10 §10.2, 11 §11.2/§11.4.
- **1.5** `[MOBILE]` Once the backend track confirms this domain is live:
  point `.env`'s `API_BASE_URL` at it for local testing, verify each screen
  against real responses, then update the relevant EAS channel secret.
  Leave `mock/server.mjs`'s routes for this domain in place until then —
  they're still useful for offline dev even after cutover.

## Phase 2 — Practice (doc 12) — "the value core"

- **2.1** `[MOBILE]` Practice List + Objective Detail screens (doc 05
  screens H–I). **Done.** Tapping a domain in the course home now opens an
  objective list with mastery %, question counts, and "Start practice" per row
  → navigates to `app/assessment/[id]/quiz`. See commit `7ac53ef`.
- **2.2** `[MOBILE]` The existing Quiz Runner/Review
  (`app/assessment/[id]/quiz.tsx`, `review.tsx`) already implements the
  correct reveal-after-submit contract — no changes needed for objective
  practice once the backend track confirms doc 12 §12.1's fix has landed.
- **2.3** `[MOBILE]` Build a **separate no-reveal runner for Domain Tests**
  (doc 12 §12.2/§12.4) — the existing Quiz Runner assumes per-question
  `is_correct` always comes back; domain tests never return it mid-quiz, only
  a final score. Don't try to reuse the reveal UI here.
- **2.4** `[BACKEND, tracked elsewhere]` Answer-key-leak fix, Practice
  wrapper API, `adaptive_progress`/`adaptiveProgress` key-casing
  normalization — doc 12 §12.1/§12.3.
- **2.5** `[MOBILE]` Cut over once confirmed live — same pattern as 1.5.
  **Explicitly verify the leak fix (§12.1) landed before flipping this
  domain's URL** — check that a real question payload omits
  `correct_options`/`justifications` until after submit.

## Phase 3 — Exam (doc 08) — see TASKS-EXAM.md for the screen-level breakdown

- **3.1** `[MOBILE]` Exam prototype (list/runner/results/review) is built
  and tested against the mock. No further mobile work needed until cutover,
  beyond TASKS-EXAM.md's task 9 follow-up (full results analytics) if
  product wants it.
- **3.2** `[BACKEND, tracked elsewhere]` State-persistence rework (doc 08
  §8.1/§8.4) — the largest single backend task in the whole plan. Full
  results analytics (§8.4, TASKS-EXAM.md task 9) if wanted.
- **3.3** `[MOBILE]` Cut over once confirmed live. **Explicitly verify the
  state-persistence rework landed** — a session-based Exam backend cannot
  serve this prototype at all, regardless of URL config; this isn't a "not
  ready yet" check, it's a "is this even the right architecture" check.

## Phase 4 — Study Content (doc 13)

- **4.1** `[MOBILE]` Study Notes vertical-Reel screen (doc 05 screen O, doc
  07 §7.3) — buildable against doc 13's spec now. Renderer needs a
  per-block-type switch (`text/quiz/image/code/assignment/case_study`), not
  a single markdown component.
- **4.2** `[BACKEND, tracked elsewhere]` Server-side sanitization + per-block
  completion state on `StudyNotesController::show()` (doc 13 §13.2).
  **Verify sanitization landed before cutover** — no client-side sanitizer
  is realistic for `react-native-markdown-display` content, so an
  unsanitized real response is a real risk, not a cosmetic gap.
- **4.3** `[MOBILE]` Flashcards swipe-deck + Videos Reels feed (doc 05
  screens P–Q, doc 07 §7.3) — **check with the backend track first** whether
  a content model now exists (doc 13 §13.1 says it didn't as of this spec).
  If it still doesn't, don't build against invented content — wait for the
  model to exist, then build against its real shape.
- **4.4** `[MOBILE]` Cut over Study Notes once confirmed live and sanitized
  (§4.2). Flashcards/Videos cut over once §4.3's precondition is met.

## Phase 5 — Harden + Ship (doc 06 §6.2 Phase 4)

- **5.1** `[MOBILE]` Progress screen (doc 05 screen R) — build against
  `LearnerProficiencyService`'s mastery-by-domain data (real, doc 11 §11.3)
  now; add score-history/streak UI only if the backend track confirms it
  built that support (doc 11 §11.3 — not present as of that spec).
- **5.2** `[MOBILE]` Offline states, accessibility labels, dark-mode QA
  across all screens, Maestro E2E flows (doc 06 §6.5's definition of done).
- **5.3** `[MOBILE]` Once every domain above has cut over to the real
  backend and been verified, retire `mock/server.mjs` and the `npm run mock`
  script. Not before — it's still the fastest way to develop/demo any
  not-yet-cut-over screen.
- **5.4** Store submission prep (doc 04 §4.8) — EAS build/submit,
  TestFlight/Play internal beta.
- **5.5** `[BACKEND, tracked elsewhere]` Pest parity tests per wrapped
  endpoint (same input, same outcome as the existing web controller) —
  worth confirming these exist before fully trusting any domain's cutover.

## Where each task runs

`[MOBILE]` tasks: this repo, this repo's `CLAUDE.md`. `[BACKEND, tracked
elsewhere]` items are informational — they're being worked in a session
rooted at `/Users/saaz/Projects/zziippee` (separate git remote,
`github.com/saazrai/zziippee.git`, its own `CLAUDE.md`/`AGENTS.md`) against
the spec doc referenced at the top of this file. Don't start backend work
from this repo/session — if a `[BACKEND, tracked elsewhere]` item looks
stalled or wrong, flag it, don't silently pick it up here.
