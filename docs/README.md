# zziippee Mobile — Docs Index

Planning and spec docs for the `zziippee-mobile` React Native app, which
consumes the Laravel backend at (sibling checkout) `../zziippee` — a
**separate git repo**, not a subdirectory of this one. If you're
implementing backend work from these specs, open a session rooted at that
repo directly; if you're implementing mobile work, use this directory.
See `TASKS-MOBILE.md` for the phased build plan tying everything below together.

## Reading order

**Start here if you're new to this initiative:**
1. [01-solution-recommendation.md](01-solution-recommendation.md) — why a native app, why this stack
2. [02-architecture.md](02-architecture.md) — system context, auth sequence, domain model slice
3. [06-roadmap.md](06-roadmap.md) — phased delivery plan (superseded in detail by `TASKS-MOBILE.md`, still useful for the high-level "why this order")

**Cross-cutting mobile design (apply to every screen):**
4. [04-mobile-app-design.md](04-mobile-app-design.md) — stack, project structure, caching, security
5. [05-uiux-spec.md](05-uiux-spec.md) — the 19-screen inventory, design tokens, key flows
6. [07-gesture-ux.md](07-gesture-ux.md) — gesture language for Study Notes/Flashcards/Videos, floating nav

**Backend contract — read 09 before trusting anything in 03:**
7. [03-api-contract.md](03-api-contract.md) — the proposed `/api/v1` route surface (now corrected inline per the verification passes below)
8. [09-backend-integration-risk-scan.md](09-backend-integration-risk-scan.md) — verification pass 1 (session-state risk only) — **read its 2026-07-18 update note before trusting the "verified-clean" ratings**

**Per-domain specs — the actual build contract, each verified against real backend code:**
9. [08-exam-spec.md](08-exam-spec.md) — Exam simulations. Has its own task file: `TASKS-EXAM.md`. **Prototype built** (mock-only).
10. [10-auth-account-spec.md](10-auth-account-spec.md) — Login/Register/Verify/Forgot-password, Profile/Settings account actions. Not started.
11. [11-home-courses-progress-spec.md](11-home-courses-progress-spec.md) — Home/Dashboard, My Courses, Course Home, Progress. Not started; flags that several assumed features don't exist backend-side.
12. [12-practice-spec.md](12-practice-spec.md) — Adaptive objective quizzes + domain tests. **Prototype partially built** (mock-only) — has a known backend security finding blocking real wiring.
13. [13-study-content-spec.md](13-study-content-spec.md) — Study Notes (buildable), Flashcards/Videos (backend content model doesn't exist yet — not a wrapping job).

## What "verified" means in these docs

Every doc from 08 onward is checked against real code in the backend repo
(file:line cited), not inferred from the earlier planning docs (01–07, which
predate any backend verification and contain some claims that turned out
wrong — each per-domain spec has a "Corrections to existing docs" table at
the end listing exactly which claims in 01–07 to distrust and why).

## Known open findings that affect build order

- **Practice has an answer-key leak** (doc 12 §12.1) — blocks real backend
  wiring until fixed, independent of anything mobile-side.
- **Exam's live-attempt state lives in the PHP session**, not a DB row (doc
  08 §8.1) — needs a real backend rework before the built prototype can talk
  to anything but the mock.
- **Flashcards and Videos have no backend content model at all** (doc 13
  §13.1) — don't schedule mobile UI work here until that changes.

`TASKS-MOBILE.md` sequences all of this into phases and tags each task
`[BACKEND]` (zziippee repo) or `[MOBILE]` (this repo).
