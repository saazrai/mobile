# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

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

## Architecture

**Routing (Expo Router, file-based):** `app/_layout.tsx` is the auth gate — it
reads `useSession().authed` (Zustand, hydrated from SecureStore on cold start)
and redirects between the `(auth)` group (unauthenticated) and `(tabs)` group
(authenticated bottom-tab home). Screens outside those groups (`assessment/[id]/`,
`exam/[id]/`, `learn/[product]/`) are pushed on top of the tab stack.

**Session/auth:** the Sanctum bearer token lives *only* in `expo-secure-store`
(`src/stores/session.ts`) — never AsyncStorage. `src/api/client.ts`'s axios
request interceptor injects it as `Authorization: Bearer <token>` on every call;
its response interceptor clears the token and lets the auth gate reroute to
Login on any `401`.

**API layer pattern** — this is the shape every new feature should follow:
`src/api/client.ts` exposes `getData`/`postData`, which unwrap the backend's
`{data: ...}` envelope and normalize failures into `ApiRequestError` (`status`,
`code`, `fieldErrors`, and `stateVersion` for optimistic-lock conflicts). Each
feature domain gets one file under `src/api/hooks/` (`auth.ts`, `practice.ts`,
`exam.ts`) colocating its response/request TypeScript types with the TanStack
Query hooks that call `getData`/`postData`; mutations invalidate the relevant
query keys (e.g. `dashboard`) `onSuccess`.

**Server-authoritative state is the recurring design principle**, not just an
API convention: correctness, scoring, and timing are never computed
client-side — screens only render what a mutation response contains. In the
practice runner (`app/assessment/[id]/quiz.tsx`) this means `is_correct` /
`correct_options` only exist after `/answer` responds. In the exam runner
(`app/exam/[id]/runner.tsx`) it goes further: the countdown is seeded from a
server-issued `deadline_at`/`remaining_seconds` and periodically resynced via a
heartbeat mutation, and expiry is decided server-side (wall-clock, independent
of whether the client was paused/backgrounded) — the client-side timer is
cosmetic, not authoritative.

**Exam module is the most structurally complex feature.** Its UI is entirely
policy-driven: the backend returns an `ExamPolicy` per exam type
(`navigation_mode`, `allow_backtrack`, `allow_skip`, `allow_mark_for_review`,
`allow_review_before_submit`, `allow_review_after_submit`), and the runner
branches its whole interaction model off those flags rather than off the exam
type name — a locked/sequential exam hides the question palette and disables
back-nav entirely, while a navigable exam pre-loads the full question set (for
palette navigation) and inserts a review-gate screen ("End Review" → locked →
"End Exam") before finalizing. The exam session state machine relies on the
real backend's optimistic-locking (`state_version`, checked on every
mutation) and idempotency-key handling — preserve those semantics in any
change, since the client's 409-conflict handling and double-tap protection
depend on them. Full contract and the corrections it makes to the older
planning docs: `../docs/08-exam-spec.md`.

**Design system:** `src/theme/tokens.ts` defines light/dark iOS semantic color
tokens and the SF Pro type ramp; screens compose from `Text`, `List`
(`Section`/`Row`), `PressableScale` (spring scale-down press feedback, no
opacity fade — `dimWhenDisabled` opts back into a fade when needed), and `Icon`
(hand-drawn SF-Symbols-style SVGs) rather than raw RN primitives or ad hoc
colors. New screens should reuse these.

**Content rendering:** question/note content is markdown, sanitized
server-side, rendered via `react-native-markdown-display`.
`src/components/markdownRules.tsx` overrides the default fence/table renderers
with horizontal-scroll containers — without this, long code/log lines and wide
tables force-wrap and lose column alignment.

## Testing / TDD

There is no test suite yet: `jest` and `jest-expo` are installed as
devDependencies, but there is no `jest.config.*` and no `"jest"` key in
`package.json`, no `@testing-library/react-native`, and no `*.test.*` files —
`npm test` will not do anything useful until this is set up.

Before writing the first test: add a Jest config using the `jest-expo` preset
(either a `jest.config.js` or a `"jest"` block in `package.json`), and install
`@testing-library/react-native` if the test needs to render a component rather
than exercise a hook/pure function directly.

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
