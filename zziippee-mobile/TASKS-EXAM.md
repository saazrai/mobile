# Exam Module Implementation Tasks

Based on [08-exam-spec.md](../docs/08-exam-spec.md) — stateless exam API + mobile screens.

## Tasks

1. **Build stateless exam API hooks** (`src/api/hooks/exam.ts`)
   TanStack Query hooks: `useExamSettings`, `useExamStart`, `useExam`, `useExamAnswer`, `useExamHeartbeat`, `useExamPause`, `useExamEnd`, `useExamResults`, `useExamReview`. Cache policy: exam list short-staleTime, all in-attempt endpoints mutation-only. Follow `practice.ts` pattern.

2. **Implement mock server exam endpoints** (`mock/server.mjs`)
   Complete `/exams/*` routes: start/resume/GET-state/submit-answer (forward + review-index edit)/pause/heartbeat/end/results/review, with `state_version` optimistic locking, idempotency-key dedup, review-gate state, timer expiry auto-finalize, full results payload (summary.domains, summary.topics, summary.blooms, advanced_analytics, action_plan, historical_summary).

3. **Build exam list screen** (`app/learn/[product]/exams/index.tsx`)
   Screen L: stat row (questions · duration · passing % · attempts), CTA (Resume/Start), policy-driven guidelines, cooldown/attempts-exhausted banner, `can_take_exam` disabled state.

4. **Build exam runner screen** (`app/exam/[id]/runner.tsx`)
   Screen M: countdown timer (amber <5min, red <1min, heartbeat re-sync), locked-nav mode (hide palette, no Previous), navigable mode (question palette, backtrack), submit-answer advance, review-gate state (show all questions, edit prior answers, End Review → lock → End Exam), submit control disables on press.

5. **Build exam results screen** (`app/exam/[id]/results.tsx`)
   Screen N: score ring vs passing_percentage, pass/fail coloring, domain performance bars, Bloom cognitive-profile bars, strengths/focus-area topic lists, Time Intelligence card (avg correct/incorrect answer time, confidence signals), Action Plan checklist, Review CTA gated by `can_review`.

6. **Build exam review screen** (`app/exam/[id]/review.tsx`)
   Sequential viewer with correct_options/justifications, same OptionContent/rationale-panel pattern as Practice `review.tsx`, gated by `can_review`.

7. **Add exam types and shared utilities**
   Exam policy types, timer formatting, `submitEnabled`/`buttonLabel` functions, review-gate state machine logic, double-tap prevention, 409 conflict handling.

8. **Typecheck, lint, and verify end-to-end**
   Run `npm run typecheck`, start mock server, verify full exam flow (start → answer → review-gate → end → results → review) in app.

## Dependencies

```
1 (hooks) ──┐
2 (mock) ───┼── 3, 4, 5, 6 (screens) ── 8 (verify)
7 (types/utils) ─┘
```

Tasks 3–6 can proceed in parallel once 1+2 are done. Task 7 feeds into all screens. Task 8 is final.
