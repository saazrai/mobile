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
- Building out Home screen's "Continue card" (docs/05-uiux-spec.md §5.4) is
  not touched — but it's already wired to *enter* the quiz runner
  (`app/(tabs)/index.tsx:57`, `router.push` straight into
  `/assessment/{id}/quiz`, bypassing the Objectives screen entirely), so the
  pause flow below has to behave correctly from that entry point too, not
  just from Objectives. See "Two entry points" under Behavior.

  This card is currently dead code in practice: the real backend's
  `/dashboard` (`CurriculumController::dashboard()`, verified against
  `/Users/saaz/Projects/zziippee`) never populates a `continue` key, so
  `cont` is always falsy and the card's `onPress` is a no-op
  (`disabled={!cont}`). docs/11-home-courses-progress-spec.md already tracks
  this as known missing backend work. Not a blocker for this design, but the
  pause flow shouldn't hard-code an assumption that breaks the moment that
  backend gap closes.

## Behavior

**Two entry points.** There are exactly two places that navigate into
`/assessment/{id}/quiz` (verified by grepping every `router.push`/`replace`
into that route): the Objectives screen (`continuePractice`/`startPractice`,
both `router.push`) and Home's Continue card (`router.push`, no `domain`
param, currently unreachable per the note above). Both use `push`, never
`replace`, and nothing deep-links into the quiz screen as an app's initial
route — so there's always a real screen beneath it, and `router.back()`
always lands on whichever of the two actually launched it. It does **not**
always land on the Objectives screen specifically, so the pause flow can't
assume that screen is what's underneath.

**Quiz runner close button** (`app/assessment/[id]/quiz.tsx`):

- Tapping × shows a confirm dialog — **"Pause Practice?"** / "Your progress
  is saved — you can continue from where you left off." — with **Cancel**
  and **Pause** (destructive) actions. This mirrors the Exam runner's
  existing `confirmPause`/`doPause` pattern
  (`app/exam/[id]/runner.tsx:184-199`) and matches the intended UX already
  documented in docs/05-uiux-spec.md §5.4 ("close (×) → confirm pause/exit").
- On **Pause**: call `POST /assessments/{id}/pause` via the existing
  `usePauseAssessment` hook, then `router.back()` — this returns to whichever
  screen actually launched the quiz (Objectives today; Home once its
  Continue card is backed by real data). No explicit return-destination
  param is needed: `router.back()` is already correct for both cases, and
  both cases already get their cache invalidated (see Technical
  implementation) so whichever screen it lands on refreshes immediately.
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
compute:

```
sessionDelta = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000))
elapsedSeconds = (state?.elapsed_seconds ?? 0) + sessionDelta
```

`Math.max(0, ...)` on the delta specifically guards against a backward device
clock producing a negative delta — without it, `elapsedSeconds` could come
out *below* `state.elapsed_seconds`, which is the exact failure mode flagged
below.

**Known backend gap — `pause` doesn't cross-check the client's value.**
Verified against `/Users/saaz/Projects/zziippee/app/Http/Controllers/Api/V1/PracticeController.php`:
`pause()` (line 452-456) does `$elapsed = max(0, (int) $request->input('elapsed_seconds', 0))`
and writes it straight to `duration_seconds` — it never derives elapsed time
from `started_at` itself, even though `resume()` (line 188-196) shows the
backend already has and uses that capability elsewhere. Two consequences:

- A client that omits `elapsed_seconds` entirely zeroes out the recorded
  duration (defaults to `0`).
- Two devices open on the same assessment (or a stale local cache) can race:
  whichever `pause` call lands last wins, even if it's carrying an older
  elapsed value than what's already stored.

This mobile repo can't fix `pause()` itself (`PracticeController.php` lives
in the separate backend repo, out of scope here). The `Math.max(0, ...)`
delta guard above prevents *this client* from ever regressing its own last
known value, but it can't prevent a genuinely stale cross-device write — that
requires `pause()` deriving elapsed from `started_at` server-side, mirroring
what `resume()` already does. Flagging this here (matching this repo's
existing convention of calling out real backend gaps inline, e.g. docs/03
§3.1, §3.6) as a backend follow-up rather than something this design closes.
`duration_seconds` isn't surfaced anywhere in the mobile UI today, so this is
a data-integrity risk, not a user-visible one, for now.

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
  `confirmPause()`, and `doPause()` per the Behavior section above (including
  the clamped `sessionDelta` computation).
- Close button: `onPress={confirmPause}`, `disabled={pauseMutation.isPending}`.

## Testing

Per this repo's testing convention (no mock transport layer; stateful
session flows — practice/exam progression, pause/resume — are verified
against a real backend, not hand-mocked axios), this is verified manually
against the dev backend rather than with a unit test:

1. From the Objectives screen: start an objective practice, answer a
   question or two, tap × → Pause. Confirm the Objectives screen (already
   mounted beneath, not remounted) shows the ring + "Continue" on that row
   immediately, no manual refresh.
2. Tap Continue → confirm it resumes the same assessment id (not a fresh
   one) at the correct question/progress.
3. Tap × → Cancel → confirm nothing is paused and the quiz continues
   uninterrupted.
4. Repeat with airplane mode on during Pause → confirm the error alert shows
   and the quiz screen doesn't navigate away.
5. Inspect the paused `Assessment` row's `duration_seconds` directly (DB or
   an admin view) after step 1 and confirm it reflects real elapsed time, not
   `0` — this exercises the client's `elapsedSeconds` computation end to end.
6. Home-entry path: not testable today (`/dashboard` never returns `continue`
   on the real backend, so the card is disabled) — skip until that backend
   gap closes. Once it does, re-run steps 1-2 launching from Home's Continue
   card instead, confirming `router.back()` lands on Home and the card
   refreshes via the `['dashboard']` invalidation.
