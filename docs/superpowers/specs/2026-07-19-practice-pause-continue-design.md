# Practice Pause + Continue — Design

## Problem

Web's Practice Test screen has a Pause action. Mobile's equivalent (the
Objective adaptive-practice runner, `app/assessment/[id]/quiz.tsx`) only has a
close (×) button that calls `router.back()` — it never calls the backend's
pause endpoint, and there's no confirmation. The `usePauseAssessment` hook
already exists in `src/api/hooks/practice.ts` but is unused anywhere in the
app.

Separately, a Continue affordance on the Objectives screen
(`app/learn/[product]/domains/[domain]/index.tsx`) needs to appear
immediately after pausing/closing, without a manual pull-to-refresh.

## Already shipped (out of scope here)

While this was being scoped, commit `2e9294d` landed on `main` and already
built the core of the Objectives-screen Continue behavior:

- A new `useObjectives` hook (`GET /learn/{product}/objectives`) that returns
  `{domains, latestAssessments}`, where `latestAssessments` is keyed by
  objective id and includes `{id, status, score, total_questions}` for each
  objective's most recent attempt.
- The Objectives screen rows already branch on `latestAssessments[objectiveId]`:
  `status: 'completed'` shows a "Last score" + Review link; `status:
  'in_progress' | 'paused'` resumes that assessment by id (`continuePractice`)
  instead of starting a new one via `startPractice`.
- `useAnswer`'s `onSuccess` already invalidates `['objectives', productSlug]`
  when `res.is_done`, so a *completed* run refreshes the Objectives screen
  correctly today.

This design covers what's still missing: the quiz runner's close button never
pauses, and there's no cache invalidation for the pause path — so even after
wiring up the pause call, the Objectives screen wouldn't show Continue without
navigating away and back (or a manual refresh).

## Explicitly out of scope

- **Domain tests** (`app/assessment/[id]/domain-quiz.tsx`): unreachable today
  (no nav entry point pushes to it, and it starts a hardcoded domain slug
  instead of the current domain's). Fixing that wiring is separate,
  larger-scoped work.
- Home screen's "Continue card" (docs/05-uiux-spec.md §5.4) — not touched.

## Behavior

**Quiz runner close button** (`app/assessment/[id]/quiz.tsx`):

- Tapping × shows a confirm dialog — **"Pause Practice?"** / "Your progress
  is saved — you can continue from where you left off." — with **Cancel**
  and **Pause** (destructive) actions. This mirrors the Exam runner's
  existing `confirmPause`/`doPause` pattern
  (`app/exam/[id]/runner.tsx:184-199`) and matches the intended UX already
  documented in docs/05-uiux-spec.md §5.4 ("close (×) → confirm pause/exit").
- On **Pause**: call `POST /assessments/{id}/pause` via the existing
  `usePauseAssessment` hook, then `router.back()` to the Objectives screen
  already beneath it on the stack.
- Any local selection on the current, not-yet-submitted question is
  discarded — only already-submitted answers are saved server-side (same as
  Exam).
- While the pause request is in flight, the × button is disabled (no spinner
  swap, matching the Exam runner's own minimal treatment of its pause
  button).
- On failure, show `Alert.alert('Something went wrong', err?.message ||
  'Please try again.')` and stay on the quiz screen — no partial navigation.
  Practice has no optimistic-locking/`state_version` concept (that's
  exam-only), so there's no 409-specific branch to handle.

**Elapsed time for the pause call:** the quiz runner doesn't track a running
timer today. Add a mount-time ref (`startedAtRef = useRef(Date.now())`) and
compute `elapsedSeconds = (state?.elapsed_seconds ?? 0) +
Math.round((Date.now() - startedAtRef.current) / 1000)` when pausing — the
server-provided `elapsed_seconds` from the last `GET` plus wall-clock time
spent in this runner session.

**Objectives screen Continue accessory**
(`app/learn/[product]/domains/[domain]/index.tsx`): replace the current
orange "Continue" text pill with a small `ProgressRing` (the same component
already used in the quiz header and review screen), colored `t.orange`, sized
to match the existing blue "Start" play-button accessory (32px), containing a
centered white `play` icon. The ring's fill reflects real progress — no new
icon asset, no backend change, and no decorative/fake percentage:

- The real backend (`CurriculumController::objectives`,
  confirmed by reading `/Users/saaz/Projects/zziippee`) already returns a
  `responses` array per `latestAssessments` entry — one row per submitted
  answer. `answered = responses.length` is real, already-available data.
- `progress = total_questions > 0 ? (responses?.length ?? 0) / total_questions
  : 0`, with `responses` defaulting to `[]` if ever absent — this degrades to
  an empty ring rather than crashing, it does not fabricate a fixed arc.

## Technical implementation

**`src/api/hooks/practice.ts`**

- `ObjectiveLatestAssessment`: add `responses: { id: number; questionable_id:
  number; is_correct: boolean }[]`.
- `usePauseAssessment`: add `useQueryClient` and an `onSuccess` that
  invalidates `['objectives', productSlug]` and `['dashboard']` — this is the
  actual fix for "Continue appears immediately, no manual refresh," mirroring
  the invalidation pattern `useAnswer` and `useExamEnd` already use elsewhere
  in this file/`exam.ts`.

**`app/learn/[product]/domains/[domain]/index.tsx`**

- Swap the `continueBtn` `View`+`Text` pill for a `ProgressRing` + centered
  `Icon name="play" filled color="#fff"`, fed the real fraction described
  above.

**`app/assessment/[id]/quiz.tsx`**

- Import `Alert` from `react-native` and `usePauseAssessment` from
  `src/api/hooks/practice`.
- Add `startedAtRef`, `pauseMutation = usePauseAssessment(id!, product!)`,
  `confirmPause()`, and `doPause()` per the Behavior section above.
- Close button: `onPress={confirmPause}`, `disabled={pauseMutation.isPending}`.

## Testing

Per this repo's testing convention (no mock transport layer; stateful
session flows — practice/exam progression, pause/resume — are verified
against a real backend, not hand-mocked axios), this is verified manually
against the dev backend rather than with a unit test:

1. Start an objective practice, answer a question or two, tap × → Pause.
2. Confirm the Objectives screen (already mounted beneath, not remounted)
   shows the ring + "Continue" on that row immediately, no manual refresh.
3. Tap Continue → confirm it resumes the same assessment id (not a fresh
   one) at the correct question/progress.
4. Tap × → Cancel → confirm nothing is paused and the quiz continues
   uninterrupted.
5. Repeat with airplane mode on during Pause → confirm the error alert shows
   and the quiz screen doesn't navigate away.
