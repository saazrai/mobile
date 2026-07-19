# Remove mock references — cut over to real-backend-only

**Date:** 2026-07-19
**Status:** Approved, ready for implementation plan

## Context

The mobile app was originally built entirely against a bundled stateful mock
API (`mock/server.mjs`) while the real zziippee backend didn't exist yet. That
premise is now stale: `.env`'s `API_BASE_URL` already points at a real
zziippee dev instance (`http://192.168.68.68:8000/api/v1`), and the last
several weeks of commits (`Merge branch 'worktree-dashboard-courses-real-backend'`,
"Fix practice counter...", "Normalize ... payloads for backend parity", "Thread
domain param through practice flow...") are all real-backend integration
work. The mock has served its purpose; per direct instruction, this project
retires it from the supported workflow: docs, scripts, and dependencies
should no longer reference it, and the app should only ever be run against a
real backend (local dev instance, UAT, or prod).

## Goal

- `mock/server.mjs` and everything that exists solely to support it
  (`npm run mock`, `npm run api:mock`, the `@stoplight/prism-cli`
  devDependency) are deleted.
- Every doc/comment that currently instructs a contributor to use the mock,
  or currently describes *current* app/feature status in terms of "mock,"
  is rewritten to describe the real-backend-only workflow instead.
- Dated, point-in-time historical records (completed task logs, original
  planning docs) are left untouched — they are accurate records of what was
  true when written, and rewriting them would misrepresent project history.
- `backend-stubs/` (the Laravel API-stub scaffold for the real zziippee app)
  is explicitly out of scope — it is not a mock, it's unbuilt real-backend
  scaffold, and stays as-is.
- No behavior change to any normalization/defensive logic that happens to be
  documented with a comment mentioning "mock" — only the comment wording
  changes.

## Non-goals

- Not changing `docs/openapi/mobile-v1.yaml` or
  `src/api/generated/schema.ts`.
- Not building out the unimplemented backend-stubs controllers
  (`CurriculumController`, `StudyController`, `ExamController`).
- Not changing any runtime request/response handling logic in
  `src/api/hooks/*` beyond comment wording.
- Not standing up a replacement local mock/test-double of any kind.

## Scope: file-by-file disposition

### Delete outright

- `mock/` directory (`mock/server.mjs`).
- `package.json`: remove the `"mock"` and `"api:mock"` scripts; remove the
  `@stoplight/prism-cli` devDependency via `npm uninstall
  @stoplight/prism-cli` (so `package-lock.json` updates correctly rather
  than being hand-edited).

### Rewrite fully (no "mock" references remain)

- **`CLAUDE.md` / `AGENTS.md`** — "What this is" section currently claims the
  repo "runs entirely against the bundled mock server, not a real backend"
  and describes `backend-stubs/` as a stub "for the backend, which does not
  exist yet." Both are false today. Rewrite to state: the app talks to the
  real zziippee `/api/v1` backend; `backend-stubs/` is scaffold for endpoints
  the real backend hasn't implemented yet. `## Commands` section drops
  `npm run mock` / `npm run api:mock` lines and their bullet notes.
  `## Testing / TDD` section: replace the guidance to "prefer driving it
  against the running mock server (`npm run mock`) ... since
  `mock/server.mjs`'s session state machine is deliberately built to mirror
  the real backend's semantics" with guidance to run stateful-flow tests
  (practice/exam session progression, pause/resume, review-gate transitions)
  against a real backend instance directly (dev or UAT), using a known test
  account — call out that this requires that backend to be reachable and
  seeded appropriately.
- **`README.md`, `RUNBOOK.md`** — quickstart/setup instructions rewritten
  around pointing `.env`'s `API_BASE_URL` at a real backend (local Laravel
  dev instance / UAT / prod); remove the "terminal 1 — mock API" step and
  the platform-specific mock-URL table (`RUNBOOK.md` login-with-any-password
  note, mock coverage list, etc.).
- **`.env.example`** — default `API_BASE_URL` changes to
  `https://zziippee.laravel.cloud/api/v1` (UAT). Comment block rewritten to
  document real dev/UAT/prod URLs (keeping the per-platform localhost/LAN-IP
  guidance where it's still relevant for a *local real backend*, not the
  mock), dropping the `localhost:4010`/"bundled mock" framing.
- **`app.config.ts:20`** — comment reworded ("Default targets the bundled
  mock..." → something reflecting the new `.env.example` default); no code
  behavior change.
- **`FEATURES.md`** — drop "Via mock server" / "returns JSON dump from mock"
  / "mock and real backend both serve..." framing; state capabilities
  plainly against the real backend, keeping any genuine backend-gap caveats.
- **`TASKS-MOBILE.md`** — this is the live, forward-looking punch-list (not a
  historical log). Update its mock references, including the explicit
  "once real backend and been verified, retire `mock/server.mjs` and
  `npm run mock`" line, to reflect that this is now done.
- **`docs/08-exam-spec.md` §8.10** ("Prototype status (mock-only — no real
  backend exists)"), **`docs/12-practice-spec.md`**,
  **`docs/13-study-content-spec.md`**, **`docs/09-backend-integration-risk-scan.md`**,
  **`docs/README.md`**'s "Prototype built/partially built (mock-only)" status
  lines — these describe *current* feature/prototype status in mock terms;
  reword to describe current real-backend integration status instead.
- **`src/api/hooks/practice.ts`** — comments only, at `normalizeProgress`
  (~line 39: "The stateful mock exposes `progress`...") and
  `normalizeReview` (~line 202: "production review endpoint is flat;
  older/mock responses nest `assessment`"). Reword to describe the shape
  variance without naming "mock" (e.g. "an older/alternate response shape").
  **The normalization logic itself does not change** — it's real defensive
  code handling response-shape variance, independent of whether a mock
  server exists.

### Leave untouched (dated historical records)

- `TASKS-EXAM.md` — a completed-work log narrating what was built/tested
  against the mock at the time; true when written.
- `docs/01-solution-recommendation.md` — dated risk register from original
  planning.
- `docs/03-api-contract.md` — describes the original phased plan (mock as
  interim stopgap while backend was built), accurate for its time.
- `docs/06-roadmap.md` — dated roadmap with specific calendar milestones.
- `docs/superpowers/plans/2026-07-18-dashboard-courses-real-backend.md` —
  a completed implementation plan; a historical record of what that pass
  did to `mock/server.mjs`, which was true at the time.

### Explicitly out of scope

- `backend-stubs/` — confirmed to be real-backend scaffold (Laravel stub
  meant to be copied into the real zziippee app), not a mock. Stays as-is.
- Files where "mock" only appears as a substring of "mockup" (the HTML
  design reference) — `app/learn/[product]/index.tsx`, `src/components/Icon.tsx`,
  `src/components/List.tsx`, `src/components/Poster.tsx`,
  `src/theme/tokens.ts`, `docs/05-uiux-spec.md`. No change.
- `docs/openapi/mobile-v1.yaml`, `src/api/generated/schema.ts`.

## Verification

- `npm run typecheck` passes.
- App boots and functions end-to-end against a real backend (current
  `.env` value or UAT) — login, dashboard, practice session, exam session.
- Final sweep: `grep -ril mock` across the repo (excluding `node_modules`,
  the historical-bucket files listed above, and genuine "mockup" hits)
  returns nothing.

## Risks / open questions

- None blocking. The one behavior-adjacent risk (removing the
  `normalizeProgress`/`normalizeReview` dual-shape handling) is explicitly
  avoided — only prose changes there.
