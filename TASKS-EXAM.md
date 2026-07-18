# Exam Module Implementation Tasks

Based on [08-exam-spec.md](../docs/08-exam-spec.md) — stateless exam API + mobile screens.

## Status

Prototype built and running end-to-end against the mock server (list → start →
answer → pause/resume → review-gate → end → results → review), for both
`linear_navigable` and `linear_sequential` exam types. Two post-build bugs were
found via manual testing and fixed: the exams list had no error/empty state
(a failed or empty response rendered as a blank screen), and the runner's radio
buttons had no `borderWidth`, so unselected options showed no visible circle.
One scope gap remains open — see task 2/5 below and
[08-exam-spec.md §8.10](../docs/08-exam-spec.md#810-prototype-status-mock-only--no-real-backend-exists). Three post-build issues found via manual testing and fixed: the exams list had no error/empty state (a failed or empty response rendered as a blank screen), the runner's radio buttons had no `borderWidth`, so unselected options showed no visible circle, and the review screen had no guard against direct navigation when exam policy disallowed review access (the mock server returns 403 in that case; the error state now surfaces "Review isn't available for this exam" with a back-to-results CTA).

## Tasks

1. ✅ **Build stateless exam API hooks** (`src/api/hooks/exam.ts`)
   TanStack Query hooks: `useExamSettings`, `useExamStart`, `useExam`, `useExamAnswer`, `useExamHeartbeat`, `useExamPause`, `useExamEnd`, `useExamResults`, `useExamReview`. Cache policy: exam list short-staleTime, all in-attempt endpoints mutation-only. Follows `practice.ts` pattern.

2. ⚠️ **Implement mock server exam endpoints** (`mock/server.mjs`) — partial
   Done: start/resume/GET-state/submit-answer (forward + review-index edit)/pause/heartbeat/end/results/review, with `state_version` optimistic locking, idempotency-key dedup, review-gate state, timer expiry auto-finalize (wall-clock, ignores pause). Verified via a smoke-test script driving both exam types plus a 409 stale-version check.
   **Not done:** the results payload only implements `summary.domains.performance`. `summary.topics`, `summary.blooms`, `advanced_analytics` (time_analysis/confidence_signals), `action_plan`, and `historical_summary` are not implemented — the mock's question fixtures don't carry Bloom/topic/timing data to make them meaningful. This was a deliberate scope cut, not an oversight; §8.10 documents it so it isn't mistaken for the full contract.

3. ✅ **Build exam list screen** (`app/learn/[product]/exams/index.tsx`)
   Screen L: stat row (questions · duration · passing %; attempt count badge on card head), CTA (Resume/Start), policy-driven guidelines, attempts-exhausted banner, `can_take_exam` disabled state. Loading/error-with-retry/empty states added after the initial build (see Status above).

4. ✅ **Build exam runner screen** (`app/exam/[id]/runner.tsx`)
   Screen M: countdown timer (amber <5min, red <1min, heartbeat re-sync), locked-nav mode (hide palette, no Previous), navigable mode (question palette, backtrack), submit-answer advance, review-gate state (show all questions, edit prior answers, End Review → lock → End Exam), submit control disables on press. Radio-button border fix applied after the initial build (see Status above).

5. ⚠️ **Build exam results screen** (`app/exam/[id]/results.tsx`) — partial, matches mock scope
   Done: score ring vs passing_percentage, pass/fail coloring, domain performance bars, Review CTA gated by `can_review`.
   **Not done** (blocked on task 2's gap, same root cause): Bloom cognitive-profile bars, strengths/focus-area topic lists, Time Intelligence card, Action Plan checklist. The screen doesn't render placeholders for these — they simply don't exist yet, since there's no data to back them.

6. ✅ **Build exam review screen** (`app/exam/[id]/review.tsx`)
   Sequential viewer with correct_options/justifications, same OptionContent/rationale-panel pattern as Practice `review.tsx`, gated by `can_review`.

7. ✅ **Add exam types and shared utilities**
   Exam policy types, timer formatting, `submitEnabled`/`buttonLabel` functions, review-gate state machine logic, double-tap prevention (disable-on-press, not idempotency-key reliance — see spec §8.6), 409 conflict handling (`stateVersion` passthrough added to `src/api/client.ts`'s `ApiRequestError`).

8. ✅ **Typecheck, lint, and verify end-to-end**
   `npm run typecheck` passes. `npm run lint` is broken repo-wide (ESLint 9 installed, no `eslint.config.js` — pre-existing, unrelated to this work). Full exam flow verified via a Python smoke-test script against the running mock server (start → answer → pause/resume → review-gate edit → end → results → review, for both exam types, plus a stale-`state_version` 409 check) and manually in-app after fixing the two bugs above.

## Follow-up (not started)

9. **Full results analytics** — implement `summary.topics`, `summary.blooms`, `advanced_analytics`, `action_plan`, `historical_summary` in the mock (needs Bloom/topic/timing fields added to the question fixtures first) and the corresponding sections in `results.tsx` (Screen N). Depends on deciding whether the mock's question bank should carry this metadata or whether this should wait for the real backend.

## Dependencies

```
1 (hooks) ──┐
2 (mock) ───┼── 3, 4, 5, 6 (screens) ── 8 (verify)
7 (types/utils) ─┘

9 (follow-up) depends on 2 + 5
```

Tasks 3–6 can proceed in parallel once 1+2 are done. Task 7 feeds into all screens. Task 8 is final for the current scope.
