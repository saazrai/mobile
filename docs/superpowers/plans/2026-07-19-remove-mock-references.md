# Remove Mock References Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retire `mock/server.mjs` and every script/dependency that exists solely to support it, and rewrite every doc/comment that currently instructs someone to use the mock or describes current app/feature status in mock terms — so the only supported way to run this app is against a real zziippee `/api/v1` backend (local dev instance, UAT, or prod).

**Architecture:** This is a removal/rewrite pass, not new logic — no new abstractions, no new files. Each task either deletes dead code/config or edits prose in place. One exception requiring care: `src/api/hooks/practice.ts` has two comments that mention "mock" while documenting *real, still-needed* defensive normalization logic (handling response-shape variance) — only the comment wording changes there, never the logic.

**Tech Stack:** N/A (docs + config + comment edits; no new dependencies).

## Global Constraints

- Per the approved design (`docs/superpowers/specs/2026-07-19-remove-mock-references-design.md`), edits fall into three buckets — **do not deviate from this bucketing**:
  - **Delete outright:** `mock/` directory, `npm run mock`/`npm run api:mock` scripts, `@stoplight/prism-cli` devDependency.
  - **Rewrite fully** (no "mock" references remain): `CLAUDE.md`, `AGENTS.md`, `README.md`, `RUNBOOK.md`, `package.json`, `.env.example`, `app.config.ts`, `FEATURES.md`, `TASKS-MOBILE.md`, `docs/08-exam-spec.md`, `docs/12-practice-spec.md`, `docs/13-study-content-spec.md`, `docs/09-backend-integration-risk-scan.md`, `docs/README.md`, `src/api/hooks/practice.ts` (comments only).
  - **Leave untouched** (dated historical records — do NOT edit these): `TASKS-EXAM.md`, `docs/01-solution-recommendation.md`, `docs/03-api-contract.md`, `docs/06-roadmap.md`, `docs/superpowers/plans/2026-07-18-dashboard-courses-real-backend.md`.
- `backend-stubs/` is explicitly out of scope (it's real-backend scaffold, not a mock) — do not touch it.
- Do not change `docs/openapi/mobile-v1.yaml` or `src/api/generated/schema.ts`.
- Do not change any normalization/defensive *logic* in `src/api/hooks/practice.ts` — only the two comments naming "mock."
- Do not "fix" unrelated staleness you notice while editing these files (e.g. `TASKS-MOBILE.md` item 1.2 or `FEATURES.md`'s Home & Courses table understating what's already shipped) — that's pre-existing drift, out of scope for this plan. Only touch text that references "mock."
- Every task's commit message should be scoped to that task's files only.

---

### Task 1: Delete the mock server, its npm scripts, and the Prism dependency

**Files:**
- Delete: `mock/server.mjs` (and the now-empty `mock/` directory)
- Modify: `package.json:6-16`

**Interfaces:** None — this task has no consumers in later tasks; later tasks just must not reference `npm run mock`/`npm run api:mock` anymore (enforced by their own grep checks).

- [ ] **Step 1: Remove the `mock` and `api:mock` scripts from `package.json`**

Replace:

```json
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "api:types": "openapi-typescript ../docs/openapi/mobile-v1.yaml -o src/api/generated/schema.ts",
    "api:mock": "prism mock ../docs/openapi/mobile-v1.yaml",
    "mock": "node mock/server.mjs"
  },
```

with:

```json
  "scripts": {
    "start": "expo start",
    "ios": "expo start --ios",
    "android": "expo start --android",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "api:types": "openapi-typescript ../docs/openapi/mobile-v1.yaml -o src/api/generated/schema.ts"
  },
```

- [ ] **Step 2: Uninstall the Prism devDependency**

Run: `npm uninstall @stoplight/prism-cli`
Expected: `package.json`'s `devDependencies` no longer lists `@stoplight/prism-cli`; `package-lock.json` updates accordingly.

- [ ] **Step 3: Delete the mock directory**

Run: `rm -rf mock/`
Expected: `mock/server.mjs` no longer exists.

- [ ] **Step 4: Verify**

Run: `npm run` (lists available scripts)
Expected: no `mock` or `api:mock` entries.

Run: `npm run typecheck`
Expected: passes (this task touches no app source, only removes a standalone script file).

- [ ] **Step 5: Commit**

```bash
git add -A mock package.json package-lock.json
git commit -m "Delete mock server and its npm scripts/dependency"
```

---

### Task 2: Point `.env.example` and `app.config.ts` at a real backend by default

**Files:**
- Modify: `.env.example`
- Modify: `app.config.ts:18-21`

**Interfaces:** None — config-only, no code consumes these beyond what already reads `API_BASE_URL`/`process.env.API_BASE_URL`.

- [ ] **Step 1: Rewrite `.env.example`**

Replace the full file contents:

```
# Copied into EAS secrets per channel. Never commit real values.
#
# Local dev against the bundled mock (npm run mock):
#   iOS simulator      → http://localhost:4010/api/v1
#   Android emulator   → http://10.0.2.2:4010/api/v1
#   Real device (Expo Go on your phone) → http://<YOUR-LAN-IP>:4010/api/v1
#
# UAT: https://zziippee.laravel.cloud/api/v1   ·   Prod: https://zziippee.com/api/v1
API_BASE_URL=http://localhost:4010/api/v1
GOOGLE_WEB_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
SENTRY_DSN=
```

with:

```
# Copied into EAS secrets per channel. Never commit real values.
#
# Point at a real backend — there is no bundled mock anymore:
#   UAT  → https://zziippee.laravel.cloud/api/v1  (default; works with no local setup)
#   Prod → https://zziippee.com/api/v1
#
# Running a local Laravel dev instance instead:
#   iOS simulator      → http://localhost:8000/api/v1
#   Android emulator   → http://10.0.2.2:8000/api/v1
#   Real device (Expo Go on your phone) → http://<YOUR-LAN-IP>:8000/api/v1
API_BASE_URL=https://zziippee.laravel.cloud/api/v1
GOOGLE_WEB_CLIENT_ID=
GOOGLE_IOS_CLIENT_ID=
SENTRY_DSN=
```

- [ ] **Step 2: Update `app.config.ts`'s default**

Replace lines 18-21:

```ts
  extra: {
    // Per-channel via EAS: production → zziippee.com, preview → laravel.cloud.
    // Default targets the bundled mock (npm run mock) so a fresh clone runs offline.
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4010/api/v1',
```

with:

```ts
  extra: {
    // Per-channel via EAS: production → zziippee.com, preview → laravel.cloud.
    // Default targets UAT so a fresh clone works with no local backend setup.
    apiBaseUrl: process.env.API_BASE_URL ?? 'https://zziippee.laravel.cloud/api/v1',
```

- [ ] **Step 3: Verify**

Run: `grep -in mock .env.example app.config.ts`
Expected: no output.

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add .env.example app.config.ts
git commit -m "Default API_BASE_URL to UAT now that the mock is gone"
```

---

### Task 3: Rewrite `CLAUDE.md` and `AGENTS.md`

**Files:**
- Modify: `CLAUDE.md:7-17,19-40,76-89,104-129`
- Modify: `AGENTS.md` (identical body to `CLAUDE.md` except line 1 title and line 3's tool name — apply the same four edits at the same relative locations)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Rewrite the "What this is" intro paragraph**

In `CLAUDE.md`, replace lines 7-17:

```markdown
React Native + Expo (TypeScript, strict) client for "SecureStart" — zziippee's
certification exam-prep app. The repo root holds the app code plus sibling
directories: `docs/` (architecture, API contract, UI/UX spec, exam spec),
`design/` (HTML mockup), and `backend-stubs/` (a drop-in Laravel API stub for
the backend, which does not exist yet). This repo currently runs entirely
against the bundled mock server, not a real backend.

Before adding any API-backed feature, check `docs/03-api-contract.md` (general
contract) and `docs/08-exam-spec.md` (exam module, verified against the real
zziippee backend's implementation) — they are the source of truth for endpoint
shapes, and `mock/server.mjs` is meant to track them.
```

with:

```markdown
React Native + Expo (TypeScript, strict) client for "SecureStart" — zziippee's
certification exam-prep app. The repo root holds the app code plus sibling
directories: `docs/` (architecture, API contract, UI/UX spec, exam spec),
`design/` (HTML mockup), and `backend-stubs/` (a drop-in Laravel API stub for
endpoints the real backend hasn't implemented yet). This repo runs only
against a real zziippee `/api/v1` backend — there is no bundled mock; see
`.env.example` for dev/UAT/prod URLs.

Before adding any API-backed feature, check `docs/03-api-contract.md` (general
contract) and `docs/08-exam-spec.md` (exam module, verified against the real
zziippee backend's implementation) — they are the source of truth for endpoint
shapes.
```

Apply the identical replacement at the same lines in `AGENTS.md`.

- [ ] **Step 2: Rewrite the Commands section**

In `CLAUDE.md`, replace lines 19-40:

````markdown
## Commands

```bash
npm install
npm start                 # Expo dev server; press i (iOS sim) or a (Android emu)
npm run ios / npm run android
npm run mock               # stateful mock API at http://localhost:4010/api/v1
npm run typecheck          # tsc --noEmit
npm test                   # jest (see Testing section — needs setup first)
```

- `npm run mock` must be running for the app to do anything beyond the login
  screen — `API_BASE_URL` in `.env` already defaults to it. iOS simulator uses
  `localhost`; Android emulator needs `10.0.2.2`; a real device needs your LAN IP
  (see `.env.example`).
- `npm run lint` is currently broken in this repo: ESLint 9 is installed but
  there's no `eslint.config.js`, so it errors immediately rather than linting.
- `npm run api:types` regenerates `src/api/generated/schema.ts` from
  `../docs/openapi/mobile-v1.yaml`. `npm run api:mock` is an alternative mock
  driven directly by that OpenAPI spec (Prism) — `mock/server.mjs` is the
  richer, stateful one actually used for day-to-day dev (practice/exam session
  state, resumable assessments, etc.).
````

with:

````markdown
## Commands

```bash
npm install
npm start                 # Expo dev server; press i (iOS sim) or a (Android emu)
npm run ios / npm run android
npm run typecheck          # tsc --noEmit
npm test                   # jest (see Testing section — needs setup first)
```

- The app needs a real backend to do anything beyond the login screen —
  `API_BASE_URL` in `.env` must point at one (dev/UAT/prod; see
  `.env.example`). iOS simulator uses `localhost`; Android emulator needs
  `10.0.2.2`; a real device needs your LAN IP.
- `npm run lint` is currently broken in this repo: ESLint 9 is installed but
  there's no `eslint.config.js`, so it errors immediately rather than linting.
- `npm run api:types` regenerates `src/api/generated/schema.ts` from
  `../docs/openapi/mobile-v1.yaml`.
````

Apply the identical replacement at the same lines in `AGENTS.md`.

- [ ] **Step 3: Fix the Architecture section's exam paragraph**

In `CLAUDE.md`, replace lines 76-89 (the "Exam module is the most structurally complex feature" paragraph):

```markdown
type name — a locked/sequential exam hides the question palette and disables
back-nav entirely, while a navigable exam pre-loads the full question set (for
palette navigation) and inserts a review-gate screen ("End Review" → locked →
"End Exam") before finalizing. `mock/server.mjs`'s exam session state machine
mirrors the real backend's optimistic-locking (`state_version`, checked on
every mutation) and idempotency-key handling — preserve those semantics in any
change, since the client's 409-conflict handling and double-tap protection
depend on them. Full contract and the corrections it makes to the older
planning docs: `../docs/08-exam-spec.md`.
```

with:

```markdown
type name — a locked/sequential exam hides the question palette and disables
back-nav entirely, while a navigable exam pre-loads the full question set (for
palette navigation) and inserts a review-gate screen ("End Review" → locked →
"End Exam") before finalizing. The exam session state machine relies on the
real backend's optimistic-locking (`state_version`, checked on every
mutation) and idempotency-key handling — preserve those semantics in any
change, since the client's 409-conflict handling and double-tap protection
depend on them. Full contract and the corrections it makes to the older
planning docs: `../docs/08-exam-spec.md`.
```

Apply the identical replacement at the same lines in `AGENTS.md`.

- [ ] **Step 4: Rewrite the Testing/TDD section's closing paragraph**

In `CLAUDE.md`, replace lines 116-129:

```markdown
Practice test-driven development for new logic in this codebase: write a
failing test first, then implement. Given the server-authoritative design
principle above, the highest-value units to test are the ones that decide
client-side behavior from server responses — policy-gating logic (e.g. the
exam runner's `submitEnabled`/`buttonLabel` functions), timer/duration
formatting, and API-hook request/response shaping — rather than full screen
rendering, which RNTL isn't set up for yet. For anything that exercises a
stateful flow (practice or exam session progression, pause/resume, review-gate
transitions), prefer driving it against the running mock server
(`npm run mock`) over hand-mocking axios, since `mock/server.mjs`'s session
state machine is deliberately built to mirror the real backend's semantics —
a test that mocks the transport layer instead can pass while the actual
integration is broken. Once a Jest config exists, run a single test file with
`npx jest path/to/file.test.ts`.
```

with:

```markdown
Practice test-driven development for new logic in this codebase: write a
failing test first, then implement. Given the server-authoritative design
principle above, the highest-value units to test are the ones that decide
client-side behavior from server responses — policy-gating logic (e.g. the
exam runner's `submitEnabled`/`buttonLabel` functions), timer/duration
formatting, and API-hook request/response shaping — rather than full screen
rendering, which RNTL isn't set up for yet. For anything that exercises a
stateful flow (practice or exam session progression, pause/resume, review-gate
transitions), drive it against a real backend instance (dev or UAT, with a
known test account) over hand-mocking axios — a test that mocks the transport
layer instead can pass while the actual integration is broken. Once a Jest
config exists, run a single test file with `npx jest path/to/file.test.ts`.
```

Apply the identical replacement at the same lines in `AGENTS.md`.

- [ ] **Step 5: Verify**

Run: `grep -in mock CLAUDE.md AGENTS.md`
Expected: no output.

Run: `diff <(tail -n +4 CLAUDE.md) <(tail -n +4 AGENTS.md)`
Expected: no output (the two files stay identical below their differing title/tool-name lines).

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "Remove mock references from CLAUDE.md/AGENTS.md, document real-backend-only workflow"
```

---

### Task 4: Rewrite `README.md` and `RUNBOOK.md`

**Files:**
- Modify: `README.md:24-35`
- Modify: `RUNBOOK.md` (full-file rewrite — its structure is built entirely around the mock)

**Interfaces:** None — documentation only.

- [ ] **Step 1: Rewrite README's "Getting started" section**

Replace lines 24-35:

````markdown
## Getting started

```bash
npm install
cp .env.example .env            # set API_BASE_URL + Google client ids
npm run api:mock                # (optional) mock server from the OpenAPI spec
npm run api:types               # generate src/api/generated/schema.ts from OpenAPI
npm start                       # then press i (iOS) or a (Android)
```

Point `API_BASE_URL` at the mock server (`npm run api:mock`) to build screens
before the real `/api/v1` exists — this is the contract-first flow from the roadmap.
````

with:

````markdown
## Getting started

```bash
npm install
cp .env.example .env            # set API_BASE_URL + Google client ids
npm run api:types               # generate src/api/generated/schema.ts from OpenAPI
npm start                       # then press i (iOS) or a (Android)
```

`API_BASE_URL` must point at a real zziippee `/api/v1` backend — dev, UAT, or
prod (see `.env.example`); there is no bundled mock.
````

- [ ] **Step 2: Rewrite `RUNBOOK.md` in full**

Replace the entire file contents:

```markdown
# RUNBOOK — get SecureStart running on a simulator

Goal: see the real app — SF type, grouped lists, cinematic Home, swipe gestures —
running against a real zziippee `/api/v1` backend.

## Prerequisites (one-time)

- **Node 20+** and npm.
- **iOS**: Xcode + a simulator (macOS). **Android**: Android Studio + an emulator.
- **Expo Go** app (from the App Store / Play Store) if you'd rather run on your
  physical phone. All native modules used here (secure-store, gesture-handler,
  reanimated, svg, blur, haptics, linear-gradient) ship in Expo Go — no custom dev
  build needed for v1.
- A reachable zziippee backend: the UAT instance (`https://zziippee.laravel.cloud/api/v1`,
  no setup required) or a local Laravel dev instance.

## Run it

```bash
npm install                      # pulls Expo SDK 52, RN 0.76, and all deps
cp .env.example .env             # defaults to UAT — edit API_BASE_URL if pointing elsewhere
npx expo start                   # then press  i (iOS)  or  a (Android)
```

Log in with a real account on the backend you're pointed at. Then: Home → tap
a course → **Practice** → answer a few questions (watch the adaptive loop +
reveal), back out → **Flashcards** (swipe → / ← ) and **Study notes** (swipe ↕).

## Pointing the app at the API

`app.config.ts` reads `API_BASE_URL` (Expo auto-loads `.env`). Default is UAT.
Override per environment:

| Target | `API_BASE_URL` |
|---|---|
| UAT backend | `https://zziippee.laravel.cloud/api/v1` (default) |
| Production | `https://zziippee.com/api/v1` |
| Local Laravel dev, iOS simulator | `http://localhost:8000/api/v1` |
| Local Laravel dev, Android emulator | `http://10.0.2.2:8000/api/v1` |
| Local Laravel dev, physical phone (Expo Go) | `http://<YOUR-LAN-IP>:8000/api/v1` |

```bash
cp .env.example .env             # then edit API_BASE_URL for your setup
```

Find your LAN IP: `ipconfig getifaddr en0` (macOS). Phone and Mac must share Wi-Fi.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App can't reach a local backend on Android emulator | Use `10.0.2.2`, not `localhost` |
| App can't reach a local backend on a real device | Use your Mac's LAN IP; same Wi-Fi; firewall allows the port |
| Reanimated / worklets error on start | Ensure `react-native-worklets/plugin` is **last** in `babel.config.js` (it is) and `react-native-worklets` is installed, then `npx expo start -c` |
| Blank screen after login | Check the backend's logs for a failed/missing route |
| Type errors | `npm run typecheck` — version pins are current-stable; bump any that drift |
```

- [ ] **Step 3: Verify**

Run: `grep -in mock README.md RUNBOOK.md`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add README.md RUNBOOK.md
git commit -m "Rewrite README/RUNBOOK quickstart for real-backend-only workflow"
```

---

### Task 5: Rewrite `FEATURES.md` and `TASKS-MOBILE.md`

**Files:**
- Modify: `FEATURES.md:12,19,45,103`
- Modify: `TASKS-MOBILE.md:19-28,30-50,76-80,106-109,145-148`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Fix `FEATURES.md`'s four mock mentions**

Replace line 12:

```markdown
| Sign in with email + password | ✅ | Via mock server; real backend needs Sanctum scaffold |
```

with:

```markdown
| Sign in with email + password | ✅ | Standard email/password sign-in flow |
```

Replace line 19:

```markdown
| Export my data (GDPR) | ✅ | Calls `GET /account/export` — returns JSON dump from mock |
```

with:

```markdown
| Export my data (GDPR) | ✅ | Calls `GET /account/export` — returns a JSON dump of account data |
```

Replace line 45:

```markdown
**Not available:** Performance-Based Questions (PBQs). All questions are multiple-choice (single or multi-select). The mock and real backend both serve MCQs only.
```

with:

```markdown
**Not available:** Performance-Based Questions (PBQs). All questions are multiple-choice (single or multi-select) — the real backend serves MCQs only.
```

Replace line 103:

```markdown
- **PBQs / simulation questions** — not supported by either mock or real backend
```

with:

```markdown
- **PBQs / simulation questions** — not supported by the real backend
```

- [ ] **Step 2: Fix `TASKS-MOBILE.md`'s "Backend URL is already fully configurable" paragraph**

Replace lines 19-28:

```markdown
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
```

with:

```markdown
**Backend URL is already fully configurable — no code changes needed to
switch it.** `API_BASE_URL` (`.env`) → `app.config.ts`'s `extra.apiBaseUrl` →
read in `src/api/client.ts`. Point it at the real backend's dev, UAT, or
production URL per environment — see `.env.example`. **Switching
environments is a config change (or an EAS per-channel secret), not a
mobile code change.** If a real endpoint's response shape doesn't match its
spec doc, that's a backend bug to report, not something to work around
client-side.
```

- [ ] **Step 3: Fix the `## Status` section's mock references**

Replace lines 30-50:

```markdown
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
```

with:

```markdown
## Status

- **Exam**: mobile prototype built (doc 08 is the contract) — see
  [TASKS-EXAM.md](TASKS-EXAM.md). Before pointing this domain at the real
  backend, confirm the state-persistence rework in doc 08 §8.1/§8.4 has
  actually landed there — if the real backend still stores live-attempt
  state in the PHP session, a bearer-token client can't use it regardless
  of URL config.
- **Practice**: mobile prototype partially built
  (`app/assessment/[id]/quiz.tsx`, `review.tsx`, `src/api/hooks/practice.ts`).
  Before cutover, confirm doc 12 §12.1's fix (answer-key leak in the
  current-question payload) has landed — this is a correctness/security
  property of the contract itself, not a timing issue.
- **Everything else** (Auth, Home/Courses/Progress, Study Content): mobile
  screens not started. Build against the documented contract now (docs
  10/11/13) against a real backend environment, same as Exam/Practice were.
- **Study Content caveat**: Study Notes is buildable against a spec:
  Flashcards/Videos have no backend content model *by design of the current
  spec* (doc 13 §13.1) — if the backend track has since added one, confirm
  the actual shape against doc 13 before building; don't assume the doc's
  "not buildable" note is still accurate without checking.
```

- [ ] **Step 4: Drop the "leave mock routes in place" note from item 1.5**

Replace lines 76-80:

```markdown
- **1.5** `[MOBILE]` Once the backend track confirms this domain is live:
  point `.env`'s `API_BASE_URL` at it for local testing, verify each screen
  against real responses, then update the relevant EAS channel secret.
  Leave `mock/server.mjs`'s routes for this domain in place until then —
  they're still useful for offline dev even after cutover.
```

with:

```markdown
- **1.5** `[MOBILE]` Once the backend track confirms this domain is live:
  point `.env`'s `API_BASE_URL` at it for local testing, verify each screen
  against real responses, then update the relevant EAS channel secret.
```

- [ ] **Step 5: Fix item 3.1's "tested against the mock" wording**

Replace lines 106-109:

```markdown
- **3.1** `[MOBILE]` Exam prototype (list/runner/results/review) is built
  and tested against the mock. No further mobile work needed until cutover,
  beyond TASKS-EXAM.md's task 9 follow-up (full results analytics) if
  product wants it.
```

with:

```markdown
- **3.1** `[MOBILE]` Exam prototype (list/runner/results/review) is built
  and tested. No further mobile work needed until cutover, beyond
  TASKS-EXAM.md's task 9 follow-up (full results analytics) if product
  wants it.
```

- [ ] **Step 6: Mark item 5.3 (mock retirement) done**

Replace lines 145-148:

```markdown
- **5.3** `[MOBILE]` Once every domain above has cut over to the real
  backend and been verified, retire `mock/server.mjs` and the `npm run mock`
  script. Not before — it's still the fastest way to develop/demo any
  not-yet-cut-over screen.
```

with:

```markdown
- **5.3** `[MOBILE]` **Done, 2026-07-19.** `mock/server.mjs` and the
  `npm run mock`/`npm run api:mock` scripts have been retired — the app now
  only runs against a real backend (dev/UAT/prod, per `.env`). Any
  not-yet-cut-over screen must be developed/demoed directly against a real
  backend environment instead.
```

- [ ] **Step 7: Verify**

Run: `grep -in mock FEATURES.md TASKS-MOBILE.md`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
git add FEATURES.md TASKS-MOBILE.md
git commit -m "Remove mock references from FEATURES.md and TASKS-MOBILE.md"
```

---

### Task 6: Reword `docs/08-exam-spec.md` and `docs/12-practice-spec.md`

**Files:**
- Modify: `docs/08-exam-spec.md:3-15,334-363`
- Modify: `docs/12-practice-spec.md:1-9,24-31`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Fix `docs/08-exam-spec.md`'s top Status block**

Replace lines 3-15:

```markdown
**Status:** A client-side prototype now exists in `zziippee-mobile` — mock
`/exams/*` routes (`mock/server.mjs`), API hooks (`src/api/hooks/exam.ts`), and
screens (`app/learn/[product]/exams/index.tsx`, `app/exam/[id]/runner.tsx`,
`results.tsx`, `review.tsx`) implementing the design below against the mock
server only. **No real backend work has started** — the session-vs-stateless
gap in §8.1 is still open, and the prototype's `/results` implements only the
domain-breakdown portion of §8.4/§8.7's contract (see §8.10 for the exact
delta). This doc supersedes the Exam fragments scattered across doc 2 §2.5,
doc 3 §3.5, doc 4 §4.6, and doc 5 screens L/M/N, which sketch a *stateless
REST* contract that **does not match the real backend**. Everything here is
verified against the actual implementation in `/Users/saaz/Projects/zziippee`
(file:line cited throughout) rather than inferred from the planning sketch.
Where the old docs are simply wrong, that's called out under §8.9.
```

with:

```markdown
**Status:** A client-side prototype exists in `zziippee-mobile` — `/exams/*`
API hooks (`src/api/hooks/exam.ts`) and screens
(`app/learn/[product]/exams/index.tsx`, `app/exam/[id]/runner.tsx`,
`results.tsx`, `review.tsx`) implementing the design below. It was originally
built and run against an in-memory stand-in server, since retired — the app
now only runs against a real backend, and this module cannot function against
one yet. **No real backend work has started** — the session-vs-stateless gap
in §8.1 is still open, and the prototype's `/results` implements only the
domain-breakdown portion of §8.4/§8.7's contract (see §8.10 for the exact
delta). This doc supersedes the Exam fragments scattered across doc 2 §2.5,
doc 3 §3.5, doc 4 §4.6, and doc 5 screens L/M/N, which sketch a *stateless
REST* contract that **does not match the real backend**. Everything here is
verified against the actual implementation in `/Users/saaz/Projects/zziippee`
(file:line cited throughout) rather than inferred from the planning sketch.
Where the old docs are simply wrong, that's called out under §8.9.
```

- [ ] **Step 2: Fix `docs/08-exam-spec.md` §8.10**

Replace lines 334-363:

```markdown
## 8.10 Prototype status (mock-only — no real backend exists)

A full client-side implementation of §8.4–§8.7 runs against a mock, not the
real backend described in §8.1:

- `mock/server.mjs` — in-memory session state machine for `/exams/*`, covering
  start/resume/GET-state/submit-answer (forward + review-index edit)/pause/
  heartbeat/end/results/review, with `state_version` optimistic locking and
  idempotency-key deduplication matching §8.6.
- `src/api/hooks/exam.ts` — the TanStack Query hook surface from §8.8.
- `app/learn/[product]/exams/index.tsx`, `app/exam/[id]/runner.tsx`,
  `results.tsx`, `review.tsx` — Screens L/M/N + Review from §8.7, including the
  review-before-submit gate and locked vs. navigable policy branching.

**Known gap — this does *not* mean the real backend can be built by mirroring
the prototype's `/results` shape.** The mock's results response implements
only `summary.domains.performance` (per-domain accuracy bars). It does **not**
implement `summary.topics`, `summary.blooms`, `advanced_analytics.time_analysis`
/`confidence_signals`, `historical_summary`, or `action_plan` — all of which
§8.4 and §8.7 (Screen N) document as part of the real contract, sourced from
`ExamsController::buildPerformanceSummaries()`/`buildActionPlan()`/
`buildAdvancedAnalytics()` on the web side. These were deliberately scoped out
of the prototype (no Bloom/topic/timing data exists in the mock's question
fixtures to make them meaningful) — the real backend work in §8.4 should still
implement the full contract, not the narrowed prototype subset.

Everything else in §8.1–§8.9 (the session-vs-stateless architectural gap, the
proposed endpoint contract, the security/integrity behaviors) remains a design
spec for backend work that has not started — the prototype only proves out the
mobile-side contract and UX against a stand-in.
```

with:

```markdown
## 8.10 Prototype status (no real backend exists yet)

A full client-side implementation of §8.4–§8.7 was built and run against an
in-memory stand-in server, not the real backend described in §8.1. That
stand-in has since been retired along with the rest of the app's mock
tooling — this module currently has nothing to run against locally until the
real backend implements it:

- `src/api/hooks/exam.ts` — the TanStack Query hook surface from §8.8.
- `app/learn/[product]/exams/index.tsx`, `app/exam/[id]/runner.tsx`,
  `results.tsx`, `review.tsx` — Screens L/M/N + Review from §8.7, including the
  review-before-submit gate and locked vs. navigable policy branching.

**Known gap — this does *not* mean the real backend can be built by mirroring
the retired stand-in's `/results` shape.** Its results response implemented
only `summary.domains.performance` (per-domain accuracy bars). It did **not**
implement `summary.topics`, `summary.blooms`, `advanced_analytics.time_analysis`
/`confidence_signals`, `historical_summary`, or `action_plan` — all of which
§8.4 and §8.7 (Screen N) document as part of the real contract, sourced from
`ExamsController::buildPerformanceSummaries()`/`buildActionPlan()`/
`buildAdvancedAnalytics()` on the web side. These were deliberately scoped out
of the prototype (no Bloom/topic/timing data existed in its question fixtures
to make them meaningful) — the real backend work in §8.4 should still
implement the full contract, not the narrowed prototype subset.

Everything else in §8.1–§8.9 (the session-vs-stateless architectural gap, the
proposed endpoint contract, the security/integrity behaviors) remains a design
spec for backend work that has not started — the prototype only proved out the
mobile-side contract and UX against a stand-in that no longer exists.
```

- [ ] **Step 3: Fix `docs/12-practice-spec.md`'s intro paragraph**

Replace lines 1-9:

```markdown
# 12 · Practice Spec (Adaptive Objective Quizzes + Domain Tests)

Covers doc 05's screens H (Practice List), I (Objective Detail), J (Quiz
Runner), K (Quiz Review). Verified against `/Users/saaz/Projects/zziippee`.
Practice already has a **mobile-side prototype** (`app/assessment/[id]/quiz.tsx`,
`review.tsx`, `src/api/hooks/practice.ts`) built against `mock/server.mjs` —
this doc specs the real contract that mock should converge toward, and flags
where the real backend's actual behavior differs from what the prototype
(reasonably) assumed.
```

with:

```markdown
# 12 · Practice Spec (Adaptive Objective Quizzes + Domain Tests)

Covers doc 05's screens H (Practice List), I (Objective Detail), J (Quiz
Runner), K (Quiz Review). Verified against `/Users/saaz/Projects/zziippee`.
Practice already has a **mobile-side prototype** (`app/assessment/[id]/quiz.tsx`,
`review.tsx`, `src/api/hooks/practice.ts`) — this doc specs the real
contract, and flags where the real backend's actual behavior differs from
what the prototype (reasonably) assumed.
```

- [ ] **Step 4: Fix the §12.1 finding's closing paragraph**

Replace lines 24-31:

```markdown
**This needs a backend fix — strip `correct_options`/`justifications` from
`quiz()`'s and `saveAnswer()`'s `next_question` payload, matching how
`submitAnswer` already withholds them in Exam — before the real backend is
safe to point mobile at.** Don't work around it client-side (e.g. "just don't
render the field") — that's not a fix, the data is already on the device.
The current mobile prototype's mock server does this correctly (withholds
until after submit); flag this gap to whoever builds the real `/api/v1`
wrapper so the wrapper doesn't just pass the leak through.
```

with:

```markdown
**This needs a backend fix — strip `correct_options`/`justifications` from
`quiz()`'s and `saveAnswer()`'s `next_question` payload, matching how
`submitAnswer` already withholds them in Exam — before the real backend is
safe to point mobile at.** Don't work around it client-side (e.g. "just don't
render the field") — that's not a fix, the data is already on the device.
Flag this gap to whoever builds the real `/api/v1` wrapper so the wrapper
doesn't just pass the leak through.
```

- [ ] **Step 5: Verify**

Run: `grep -in mock docs/08-exam-spec.md docs/12-practice-spec.md`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add docs/08-exam-spec.md docs/12-practice-spec.md
git commit -m "Remove mock references from exam and practice spec docs"
```

---

### Task 7: Reword `docs/13-study-content-spec.md`, `docs/09-backend-integration-risk-scan.md`, `docs/README.md`

**Files:**
- Modify: `docs/13-study-content-spec.md:28,119`
- Modify: `docs/09-backend-integration-risk-scan.md:117,124`
- Modify: `docs/README.md:27,30,47`

**Interfaces:** None — documentation only.

- [ ] **Step 1: Fix `docs/13-study-content-spec.md`'s two "invented mock shape" mentions**

Replace line 28:

```markdown
there's no way to build against real data, and building against invented
mock shapes risks the same kind of contract drift Exam had.
```

with:

```markdown
there's no way to build against real data, and building against an invented
shape risks the same kind of contract drift Exam had.
```

Replace line 119:

```markdown
  underlying content model — building against an invented mock shape
  risks the exact kind of contract drift Exam had, except worse, since here
```

with:

```markdown
  underlying content model — building against an invented shape
  risks the exact kind of contract drift Exam had, except worse, since here
```

- [ ] **Step 2: Fix `docs/09-backend-integration-risk-scan.md`'s two mock mentions**

Replace line 117:

```markdown
rendering unsanitized HTML as trusted markdown is a real XSS-shaped risk once
this is wired to real content instead of the mock's fixtures.
```

with:

```markdown
rendering unsanitized HTML as trusted markdown is a real XSS-shaped risk
against real backend content.
```

Replace line 124:

```markdown
- Two concrete, scoped gaps need real backend work before their mobile
  screens can go past the mock: **Google `id_token` verification** (§9.1) and
```

with:

```markdown
- Two concrete, scoped gaps need real backend work before their mobile
  screens are safe against real data: **Google `id_token` verification** (§9.1) and
```

- [ ] **Step 3: Fix `docs/README.md`'s three mock mentions**

Replace line 27:

```markdown
9. [08-exam-spec.md](08-exam-spec.md) — Exam simulations. Has its own task file: `TASKS-EXAM.md`. **Prototype built** (mock-only).
```

with:

```markdown
9. [08-exam-spec.md](08-exam-spec.md) — Exam simulations. Has its own task file: `TASKS-EXAM.md`. **Prototype built**; not yet wired to a real backend.
```

Replace line 30:

```markdown
12. [12-practice-spec.md](12-practice-spec.md) — Adaptive objective quizzes + domain tests. **Prototype partially built** (mock-only) — has a known backend security finding blocking real wiring.
```

with:

```markdown
12. [12-practice-spec.md](12-practice-spec.md) — Adaptive objective quizzes + domain tests. **Prototype partially built** — has a known backend security finding blocking full real-backend wiring.
```

Replace line 47:

```markdown
- **Exam's live-attempt state lives in the PHP session**, not a DB row (doc
  08 §8.1) — needs a real backend rework before the built prototype can talk
  to anything but the mock.
```

with:

```markdown
- **Exam's live-attempt state lives in the PHP session**, not a DB row (doc
  08 §8.1) — needs a real backend rework before the built prototype can talk
  to a real backend at all.
```

- [ ] **Step 4: Verify**

Run: `grep -in mock docs/13-study-content-spec.md docs/09-backend-integration-risk-scan.md docs/README.md`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add docs/13-study-content-spec.md docs/09-backend-integration-risk-scan.md docs/README.md
git commit -m "Remove mock references from remaining spec/index docs"
```

---

### Task 8: Reword `src/api/hooks/practice.ts` comments (logic unchanged)

**Files:**
- Modify: `src/api/hooks/practice.ts:38-42,202`

**Interfaces:** None — comment-only edit; `normalizeProgress`/`normalizeReview`'s signatures and bodies are byte-for-byte unchanged.

- [ ] **Step 1: Reword the `normalizeProgress` doc comment**

Replace lines 38-42:

```ts
/**
 * The stateful mock exposes `progress`, while the production controller returns
 * adaptive-progress fields separately (and uses snake_case for resume data).
 * Normalize both at the API boundary so runners only ever consume one shape.
 */
```

with:

```ts
/**
 * Some endpoints return `progress` directly, while others (the production
 * controller's adaptive-progress fields) return it separately and use
 * snake_case for resume data. Normalize both at the API boundary so runners
 * only ever consume one shape.
 */
```

- [ ] **Step 2: Reword the `normalizeReview` doc comment**

Replace line 202:

```ts
/** The production review endpoint is flat; older/mock responses nest `assessment`. */
```

with:

```ts
/** The production review endpoint is flat; some responses nest `assessment` instead. */
```

- [ ] **Step 3: Verify no logic changed**

Run: `git diff src/api/hooks/practice.ts`
Expected: the diff touches only the two comment blocks above — no changes to `normalizeProgress`, `normalizeAssessmentState`, `normalizeAnswerResult`, `normalizeReview`, or `normalizeReviewQuestion`'s bodies.

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/api/hooks/practice.ts
git commit -m "Reword mock-referencing comments in practice.ts (no logic change)"
```

---

### Task 9: Final verification sweep

**Files:** None modified — read-only verification.

**Interfaces:** None.

- [ ] **Step 1: Repo-wide grep for stray mock mentions**

Run (matches at the content level, not filename, so "mockup"-only files are
correctly excluded even though their filename doesn't contain "mockup"):

```bash
grep -rniH 'mock' . --exclude-dir=node_modules --exclude-dir='.*' \
  | grep -vi 'mockup' \
  | cut -d: -f1 | sort -u
```

Expected: only these remain —
- The historical bucket (untouched by design):
  `TASKS-EXAM.md`, `docs/01-solution-recommendation.md`,
  `docs/03-api-contract.md`, `docs/06-roadmap.md`,
  `docs/superpowers/plans/2026-07-18-dashboard-courses-real-backend.md`.
- `docs/openapi/mobile-v1.yaml` — explicitly out of scope per the design doc
  (describes the original contract-first plan; not touched by this plan).
- `docs/superpowers/specs/2026-07-19-remove-mock-references-design.md` and
  `docs/superpowers/plans/2026-07-19-remove-mock-references.md` — this
  change's own spec/plan, which necessarily discuss "mock" while documenting
  the removal.
- `package-lock.json` — matches are `jest-mock` (a real, unrelated Jest
  transitive dependency), not this project's mock server.

If any file outside that list appears, go back and fix it before proceeding.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: passes.

- [ ] **Step 3: Confirm `npm install` is clean post-uninstall**

Run: `npm install`
Expected: completes with no errors; `@stoplight/prism-cli` does not reappear.

- [ ] **Step 4: Manual smoke test against the real backend**

With `.env`'s `API_BASE_URL` pointing at a reachable real backend (the
already-configured dev instance or UAT), run `npx expo start` and manually
verify: login succeeds, Home/Courses render, a practice session can be
started and answered. (Exam is expected to still be non-functional per Task
6's §8.10 update — that's a real, pre-existing backend gap, not a regression
from this plan.)

- [ ] **Step 5: Report**

No commit for this task (verification only). If Step 1 or Step 2 found
issues that required fixes in earlier tasks' files, amend those tasks'
commits are already made — make a small follow-up commit instead:

```bash
git add -A
git commit -m "Fix stray mock references found in final sweep"
```

(Only run this if Step 1/2 actually required changes.)
