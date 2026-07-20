# 12 · Practice Spec (Adaptive Objective Quizzes + Domain Tests)

Covers doc 05's screens H (Practice List), I (Objective Detail), J (Quiz
Runner), K (Quiz Review). Verified against `/Users/saaz/Projects/zziippee`.
Practice already has a **mobile-side prototype** (`app/assessment/[id]/quiz.tsx`,
`review.tsx`, `src/api/hooks/practice.ts`) — this doc specs the real
contract, and flags where the real backend's actual behavior differs from
what the prototype (reasonably) assumed.

## 12.1 A real security-shaped finding — flag before wiring to production

`ObjectivesController::quiz()`'s adaptive branch
(`app/Http/Controllers/Learn/ObjectivesController.php:316-347`,
`formatAdaptiveQuestion()` at `:582-600`) **includes `correct_options` and
`justifications` in the current-question payload — before the learner
answers it.** This is the exact class of leak the Exam module had and fixed
(`docs/08-exam-spec.md` §8.6); here it's still present. The web Vue frontend
presumably just doesn't render those fields until after submit (client-side
discipline, not a server-side guarantee) — "the server trusts the client not
to peek." A mobile client (or anyone inspecting network traffic) can read the
answer key for every question before answering.

**This needs a backend fix — strip `correct_options`/`justifications` from
`quiz()`'s and `saveAnswer()`'s `next_question` payload, matching how
`submitAnswer` already withholds them in Exam — before the real backend is
safe to point mobile at.** Don't work around it client-side (e.g. "just don't
render the field") — that's not a fix, the data is already on the device.
Flag this gap to whoever builds the real `/api/v1` wrapper so the wrapper
doesn't just pass the leak through.

## 12.2 Other verified findings

- **Adaptive algorithm** (`app/Services/AdaptivePracticeService.php`, full
  file read): question-count bounds `max = clamp(ceil((topics + floor(concepts/2))*1.5), 8, 20)`,
  `min = max(4, ceil(max/2))`. Difficulty steps ±1 (1-5 scale) per
  correct/incorrect answer. Done when `answered >= max`, or `answered >= min`
  AND convergence (last 2 answers both correct-at-5 or incorrect-at-1, or
  last 3 all-same-outcome at any difficulty). Mastery: if the last 3 answers
  share one difficulty and are all correct, that level's label; else the
  highest difficulty with ≥66% accuracy; else one level down from the
  highest level with any correct answer. Levels: 5 Expert / 4 Advanced / 3
  Proficient / 2 Developing / 1 Needs Foundation.
- **Scoring is exact-match, no partial credit** — `saveAnswer()`
  (`:448-451`): `selected` must equal `correct` as sets exactly (unlike
  Exam's `ExamScoringService`, which does support partial credit for
  multi-select). Don't build multi-select partial-credit UI for Practice.
- **Response key naming is inconsistent between endpoints** — `quiz()`'s
  Inertia props use `adaptiveProgress` (camelCase); `saveAnswer()`'s JSON
  response uses `adaptive_progress` (snake_case) for the same shape
  (`{answered, estimatedTotal, currentDifficulty, minQuestions}`, itself a
  mix of cases). **Normalize to one convention in the API wrapper** — don't
  propagate this inconsistency into the mobile contract.
- **"Done" response used to omit the answer key — fixed 2026-07-20, no longer
  true.** `Api\V1\PracticeController::saveAnswer()`'s adaptive `$isDone`
  branch previously returned only `{saved:true, is_correct, is_done:true,
  mastery, score}` — no `correct_options`, `justifications`, or
  `adaptive_progress` for the final question. That broke the mobile Quiz
  Runner's reveal state for the last question specifically: no rationale
  text, and (since `adaptive_progress` was also missing) the header's
  question counter fell back to 1. The branch now mirrors the non-done
  branch below and additionally returns `correct_options`, `justifications`,
  and `adaptive_progress` on completion — see
  `tests/Feature/Api/PracticeControllerTest.php` ("saveAnswer reveals
  correct_options and justifications for the final question too").
- **Options are shuffled deterministically per-question, not per-user.**
  `OptionShuffler::shuffle()` (`app/Exam/Support/OptionShuffler.php:18-40`)
  seeds `mt_srand(crc32($questionId))` — every learner sees the identical
  option order for a given question (confirmed by a comment in that file).
  Doc 02 §2.4's "prevents pattern memorisation" framing overstates this
  slightly (it prevents *position*-based guessing across different
  questions, not per-user unpredictability) — doesn't change the mobile
  contract (still just render whatever order arrives), just a documentation
  correction.
- **Domain tests reveal nothing mid-quiz — a real UX-shaping difference from
  objective practice, not a bug.** `DomainsController::saveAnswer()`
  (`:296-342`) returns only `{saved: true}` — no `is_correct`,
  `correct_options`, or `justifications`, unlike Objectives' equivalent. This
  means **the reveal-after-submit pattern the Quiz Runner (screen J) uses for
  objective practice cannot work for domain tests** — a domain test is
  linear-blind, more like a real exam (all questions, then one final score),
  not a per-question feedback loop. The mobile app needs a second, simpler UX
  for domain tests (or route them through the same "no reveal" pattern the
  Exam runner already has, which is a closer behavioral match than Practice's
  own reveal-per-question UI).
- **`Assessment` fields on completion**: `status=completed,
  answered_questions, correct_answers, score (round(correct/total*100,2)),
  completed_at`. Adaptive completion additionally sets
  `mastery_level`/`mastery_label`/clears `current_question_id`, and calls
  `LearnerProficiencyService::recomputeForObjective()` — this is what feeds
  the Progress screen (doc 11 §11.3), so Practice completions and Progress
  data are linked as expected.

## 12.3 Proposed API surface

Supersedes doc 03 §3.4. Assumes §12.1's fix is applied server-side (i.e. this
table describes the *corrected* behavior, not the current leaky one).

| Method | Path | Body → Returns | Notes |
|---|---|---|---|
| POST | `/practice/objectives/{objective}/start` | → `{assessment_id, question, progress}` | `question` **must not** include `correct_options`/`justifications` — see §12.1 |
| GET | `/assessments/{assessment}` | → `{question, progress, status}` (resume-aware) | Same withholding rule applies on resume |
| POST | `/assessments/{assessment}/answer` | `{question_id, selected_options[], question_elapsed_seconds}` → not-done: `{is_correct, correct_options, justifications, is_done:false, next_question (answer-key withheld), progress}`; done: `{is_correct, correct_options, justifications, is_done:true, mastery, score, progress}` | `correct_options`/`justifications` for the *just-answered* question are fine to include (reveal-after-submit, same rule as Exam's `/review`) — only the *next* question's key must stay withheld. This now applies identically whether or not the assessment just completed (fixed 2026-07-20 — see §12.2) |
| GET | `/assessments/{assessment}/review` | → `{assessment{score,mastery,difficulty_history}, questions[]}` | Matches doc 03 |
| POST | `/practice/domains/{domain}/start` | → `{assessment_id, questions[], progress}` | Domain tests: send the **full question set** up front (fixed preset, doc 03's "pre-selected" framing was actually right for this one) since there's no adaptive selection to hide |
| POST | `/assessments/{assessment}/answer` (domain variant) | `{question_id, selected_options[]}` → `{saved:true, progress}` only | **No per-answer feedback** — reflects `DomainsController::saveAnswer`'s real behavior (§12.2). Don't build a reveal UI for this path. |
| POST | `/assessments/{assessment}/submit` (domain variant) | → `{score, correct_answers, total_questions}` | Final score only, after all questions submitted |

## 12.4 Reconciling with the existing mobile prototype

`app/assessment/[id]/quiz.tsx`/`review.tsx` and `src/api/hooks/practice.ts`
already implement the reveal-after-submit pattern correctly for objective
practice — that part transfers to a real backend once §12.1 is fixed
server-side, no mobile code changes needed. What **does** need new mobile
work once this is real: a distinct, no-reveal runner UX for domain tests
(§12.2) — the existing `quiz.tsx` assumes per-question `is_correct` always
comes back, which domain tests will never provide.

`quiz.tsx` also carries a defensive fallback (`useReview` merged in when the
just-answered question comes back with an empty `correct_options`) for
whatever backend deployment hasn't picked up the §12.2 "done" response fix
yet — `/review` independently returns full per-question detail (including
the final question) from stored records, so it can backfill the reveal even
if a given `/answer` response is still the old shape. Once every environment
is running the fixed controller this fallback is dead code and can be
removed, but it's cheap insurance in the meantime and also warms the
`/review` cache before the learner taps "See results."

## 12.5 Corrections to existing docs

| Doc | Claim | Reality |
|---|---|---|
| 02 §2.4 | "app renders the returned `correct_options` + `justifications` *after* submit" | True for the just-answered question, but the *next* question's answer key is already leaked earlier in the real backend (§12.1) — needs a backend fix before this claim is actually true end-to-end |
| 03 §3.4 | Domain tests "reuse the same assessment endpoints" implying identical behavior to objective practice | Persistence layer is shared, but `saveAnswer` behavior differs completely — domain tests get no per-answer feedback at all (§12.2) |
| 02 §2.4 | Option shuffling "prevents pattern memorisation" (implies per-user) | Deterministic per-question via `crc32`, identical order for every user (§12.2) — minor correction, no mobile-contract impact |
