# Practice Pause + Continue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Practice quiz runner's close (×) button to actually pause the assessment (mirroring the Exam runner's confirm-dialog pattern), and make the Objectives screen's Continue affordance a real progress ring backed by data the backend already returns — so "Continue" appears immediately after pausing, with no manual refresh.

**Architecture:** Two small pure functions (elapsed-time computation, continue-ring progress fraction) live in `src/utils/practiceResume.ts` and are unit-tested in isolation. Everything else — the pause hook's cache invalidation, the confirm dialog, the ring UI — is a small, targeted edit to three existing files, verified manually against the real dev backend per this repo's established convention for stateful session flows.

**Tech Stack:** React Native + Expo Router, TanStack Query, `react-native-svg` (via the existing `ProgressRing` component), Jest (`jest-expo` preset, already configured).

## Global Constraints

- Confirm dialog copy, exact strings: title `"Pause Practice?"`, body `"Your progress is saved — you can continue from where you left off."`, buttons `Cancel` (style `cancel`) / `Pause` (style `destructive`).
- Elapsed-time formula: `sessionDelta = Math.max(0, Math.round((nowMs - startedAtMs) / 1000))`; `elapsedSeconds = (lastKnownElapsedSeconds ?? 0) + sessionDelta`. The `Math.max(0, ...)` clamp is required — it's the guard against a backward device clock regressing the server's recorded value.
- Continue ring: reuse the existing `ProgressRing` component (`src/components/ProgressRing.tsx`) — no new icon asset, no new dependency. Size `32`, `strokeWidth` `3`, `color={t.orange}`, `track={t.fill}`, containing a centered `Icon name="play" size={12} color="#fff" filled`. This matches the existing blue "Start" `playBtn` accessory's 32px footprint.
- Progress fraction: `total_questions > 0 ? responses.length / total_questions : 0`, clamped to `[0, 1]`. Never fabricate a decorative/fixed value — if data is missing, the ring shows empty (`0`), not a guess.
- No backend changes. `PracticeController.php` / `CurriculumController.php` live in the separate `/Users/saaz/Projects/zziippee` repo and are out of scope.
- No changes to `app/assessment/[id]/domain-quiz.tsx` (unreachable/orphaned — separate future work) or to building out Home's Continue card (already wired to enter the quiz runner via `router.push`, but currently dead since `/dashboard` never returns a `continue` key).
- Testing convention for this repo: stateful session flows (pause/resume) are verified against a real backend, never hand-mocked axios. Only the two pure calculation functions get Jest unit tests; everything else is manually verified end-to-end (Task 5).
- Full design context: `docs/superpowers/specs/2026-07-19-practice-pause-continue-design.md`.

---

### Task 1: Pure calculation functions — elapsed time and continue-ring progress

**Files:**
- Create: `src/utils/practiceResume.ts`
- Test: `src/utils/__tests__/practiceResume.test.ts`

**Interfaces:**
- Produces: `computeElapsedSeconds(lastKnownElapsedSeconds: number | undefined, startedAtMs: number, nowMs: number): number`
- Produces: `computeContinueProgress(answeredCount: number | undefined, totalQuestions: number): number` — always in `[0, 1]`

- [ ] **Step 1: Write the failing tests**

Create `src/utils/__tests__/practiceResume.test.ts`:

```ts
import { computeElapsedSeconds, computeContinueProgress } from '../practiceResume';

describe('computeElapsedSeconds', () => {
  it('adds wall-clock time spent this session to the last known server value', () => {
    expect(computeElapsedSeconds(120, 1_000_000, 1_065_000)).toBe(185);
  });

  it('treats a missing last-known value as 0', () => {
    expect(computeElapsedSeconds(undefined, 1_000_000, 1_010_000)).toBe(10);
  });

  it('clamps a backward clock (now before startedAt) to no session delta', () => {
    expect(computeElapsedSeconds(120, 1_000_000, 900_000)).toBe(120);
  });

  it('returns the last known value unchanged when no time has passed', () => {
    expect(computeElapsedSeconds(120, 1_000_000, 1_000_000)).toBe(120);
  });
});

describe('computeContinueProgress', () => {
  it('computes the answered/total fraction', () => {
    expect(computeContinueProgress(6, 10)).toBe(0.6);
  });

  it('treats a missing answered count as 0', () => {
    expect(computeContinueProgress(undefined, 10)).toBe(0);
  });

  it('returns 0 when total_questions is 0, avoiding division by zero', () => {
    expect(computeContinueProgress(5, 0)).toBe(0);
  });

  it('clamps to 1 if answered somehow exceeds total (stale/bad data)', () => {
    expect(computeContinueProgress(12, 10)).toBe(1);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/utils/__tests__/practiceResume.test.ts`
Expected: FAIL — `Cannot find module '../practiceResume'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/utils/practiceResume.ts`:

```ts
/**
 * Clamped so a backward device clock can't push elapsed time below what the
 * server already recorded (docs/superpowers/specs/2026-07-19-practice-pause-continue-design.md).
 */
export function computeElapsedSeconds(
  lastKnownElapsedSeconds: number | undefined,
  startedAtMs: number,
  nowMs: number,
): number {
  const sessionDelta = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
  return (lastKnownElapsedSeconds ?? 0) + sessionDelta;
}

/**
 * 0-1 fraction of an in-progress/paused objective attempt already answered,
 * for the Objectives screen's Continue ring. Never fabricates a value when
 * data is missing — degrades to an empty ring instead.
 */
export function computeContinueProgress(answeredCount: number | undefined, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  const answered = answeredCount ?? 0;
  return Math.min(1, Math.max(0, answered / totalQuestions));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/utils/__tests__/practiceResume.test.ts`
Expected: PASS — 8 tests total (4 per `describe` block)

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add src/utils/practiceResume.ts src/utils/__tests__/practiceResume.test.ts
git commit -m "$(cat <<'EOF'
Add pure elapsed-time and continue-progress calculations

Extracted so the clock-skew clamp (elapsed) and division-by-zero guard
(progress) are unit-testable in isolation, matching this repo's
formatDate.ts precedent for small deterministic utils.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `usePauseAssessment` cache invalidation + `responses` on `ObjectiveLatestAssessment`

**Files:**
- Modify: `src/api/hooks/practice.ts`

**Interfaces:**
- Consumes: none from Task 1.
- Produces: `ObjectiveLatestAssessment.responses: { id: number; questionable_id: number; is_correct: boolean }[]` (consumed by Task 3). `usePauseAssessment` now invalidates `['objectives', productSlug]` and `['dashboard']` on success (consumed functionally by Task 4/5, no signature change to the hook itself — still `(assessmentId: string, productSlug: string) => UseMutationResult<..., number>`).

- [ ] **Step 1: Add `responses` to `ObjectiveLatestAssessment`**

In `src/api/hooks/practice.ts`, find:

```ts
export interface ObjectiveLatestAssessment {
  id: string;
  status: 'in_progress' | 'paused' | 'completed';
  score: number;
  total_questions: number;
}
```

Replace with:

```ts
export interface ObjectiveLatestAssessment {
  id: string;
  status: 'in_progress' | 'paused' | 'completed';
  score: number;
  total_questions: number;
  responses: { id: number; questionable_id: number; is_correct: boolean }[];
}
```

- [ ] **Step 2: Add cache invalidation to `usePauseAssessment`**

In the same file, find:

```ts
export function usePauseAssessment(assessmentId: string, productSlug: string) {
  return useMutation({
    mutationFn: (elapsedSeconds: number) =>
      postData(`/learn/${productSlug}/assessments/${assessmentId}/pause`, { elapsed_seconds: elapsedSeconds }),
  });
}
```

Replace with:

```ts
export function usePauseAssessment(assessmentId: string, productSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (elapsedSeconds: number) =>
      postData(`/learn/${productSlug}/assessments/${assessmentId}/pause`, { elapsed_seconds: elapsedSeconds }),
    onSuccess: () => {
      // Lets the Objectives screen (and Home's Continue card, once it's
      // backed by real data) show Continue immediately on the next render,
      // without a manual pull-to-refresh.
      qc.invalidateQueries({ queryKey: ['objectives', productSlug] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

`useQueryClient` is already imported at the top of this file (used by `useAnswer`, `useDomainAnswer`, `useSubmitDomain`) — no new import needed.

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no new errors. (`ObjectiveScreen`'s current usage of `latestAssessments` won't yet reference `responses` — that's Task 3 — so this step alone should be a clean, isolated compile.)

- [ ] **Step 4: Commit**

```bash
git add src/api/hooks/practice.ts
git commit -m "$(cat <<'EOF'
Invalidate objectives/dashboard cache on pause; capture responses field

The objectives endpoint already returns a responses array (one row per
submitted answer) per latestAssessments entry — the type just wasn't
capturing it. usePauseAssessment previously had no onSuccess at all, so
pausing never refreshed the Objectives screen or Home's dashboard query.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Objectives screen — real progress ring for Continue

**Files:**
- Modify: `app/learn/[product]/domains/[domain]/index.tsx`

**Interfaces:**
- Consumes: `computeContinueProgress` from Task 1 (`src/utils/practiceResume`); `ObjectiveLatestAssessment.responses` from Task 2.
- Produces: no new exports — this is a leaf UI change.

- [ ] **Step 1: Add imports**

In `app/learn/[product]/domains/[domain]/index.tsx`, find:

```tsx
import { useObjectives, useStartObjective } from '../../../../../src/api/hooks/practice';
import { useTheme, spacing, radius, continuousCurve } from '../../../../../src/theme/tokens';
```

Replace with:

```tsx
import { useObjectives, useStartObjective } from '../../../../../src/api/hooks/practice';
import { ProgressRing } from '../../../../../src/components/ProgressRing';
import { computeContinueProgress } from '../../../../../src/utils/practiceResume';
import { useTheme, spacing, radius, continuousCurve } from '../../../../../src/theme/tokens';
```

- [ ] **Step 2: Replace the `continueBtn` pill with the progress ring**

Find:

```tsx
                    {isUnfinished ? (
                      <View style={[styles.continueBtn, { backgroundColor: t.orange }, continuousCurve]}>
                        <Text variant="footnote" color="onColor" style={{ fontWeight: '700' }}>Continue</Text>
                      </View>
                    ) : (
```

Replace with:

```tsx
                    {isUnfinished ? (
                      <ProgressRing
                        progress={computeContinueProgress(lastAssessment.responses?.length, lastAssessment.total_questions)}
                        size={32}
                        strokeWidth={3}
                        color={t.orange}
                        track={t.fill}
                      >
                        <Icon name="play" size={12} color="#fff" filled />
                      </ProgressRing>
                    ) : (
```

(The `) : (` on the last line is intentionally the existing line that follows — do not duplicate it, this is a find/replace of the block above it only.)

- [ ] **Step 3: Remove the now-unused `continueBtn` style**

Find, in the `StyleSheet.create` block at the bottom of the file:

```ts
  reviewBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginLeft: spacing.sm },
  continueBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginLeft: spacing.sm },
});
```

Replace with:

```ts
  reviewBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginLeft: spacing.sm },
});
```

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add "app/learn/[product]/domains/[domain]/index.tsx"
git commit -m "$(cat <<'EOF'
Replace Continue text pill with a real progress ring

Uses the answered/total fraction from the backend's responses array
(via computeContinueProgress) instead of a static text badge — reuses
the existing ProgressRing component, no new icon asset.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Quiz runner — pause on close, with confirm dialog

**Files:**
- Modify: `app/assessment/[id]/quiz.tsx`

**Interfaces:**
- Consumes: `computeElapsedSeconds` from Task 1 (`src/utils/practiceResume`); `usePauseAssessment` from Task 2 (`src/api/hooks/practice`).
- Produces: no new exports — this is the runner's own close-button behavior.

- [ ] **Step 1: Update imports**

Find:

```tsx
import { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { useAssessment, useAnswer, type Question, type AnswerResult } from '../../../src/api/hooks/practice';
import { OptionContent } from '../../../src/components/OptionContent';
import { questionMarkdownStyle } from '../../../src/components/markdownStyles';
import { scrollableMarkdownRules } from '../../../src/components/markdownRules';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../../src/theme/tokens';
```

Replace with:

```tsx
import { useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { ApiRequestError } from '../../../src/api/client';
import { useAssessment, useAnswer, usePauseAssessment, type Question, type AnswerResult } from '../../../src/api/hooks/practice';
import { computeElapsedSeconds } from '../../../src/utils/practiceResume';
import { OptionContent } from '../../../src/components/OptionContent';
import { questionMarkdownStyle } from '../../../src/components/markdownStyles';
import { scrollableMarkdownRules } from '../../../src/components/markdownRules';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../../src/theme/tokens';
```

- [ ] **Step 2: Add the pause mutation and a mount-time ref**

Find:

```tsx
  const { data: state, isLoading } = useAssessment(id, product);
  const answer = useAnswer(id!, product!);

  const [selected, setSelected] = useState<string[]>([]);
```

Replace with:

```tsx
  const { data: state, isLoading } = useAssessment(id, product);
  const answer = useAnswer(id!, product!);
  const pauseMutation = usePauseAssessment(id!, product!);
  const startedAtRef = useRef(Date.now());

  const [selected, setSelected] = useState<string[]>([]);
```

- [ ] **Step 3: Add `confirmPause`/`doPause`**

Find:

```tsx
  const onNext = () => {
    if (!result) return;
    if (result.is_done) {
      const reviewParams = new URLSearchParams({ product: product ?? '' });
      if (domain) reviewParams.set('domain', domain);
      return router.replace(`/assessment/${id}/review?${reviewParams.toString()}`);
    }
    setQuestion(result.next_question); setSelected([]); setResult(null);
  };
```

Replace with:

```tsx
  const onNext = () => {
    if (!result) return;
    if (result.is_done) {
      const reviewParams = new URLSearchParams({ product: product ?? '' });
      if (domain) reviewParams.set('domain', domain);
      return router.replace(`/assessment/${id}/review?${reviewParams.toString()}`);
    }
    setQuestion(result.next_question); setSelected([]); setResult(null);
  };

  function confirmPause() {
    Alert.alert(
      'Pause Practice?',
      'Your progress is saved — you can continue from where you left off.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Pause', style: 'destructive', onPress: doPause }],
    );
  }

  async function doPause() {
    try {
      const elapsedSeconds = computeElapsedSeconds(state?.elapsed_seconds, startedAtRef.current, Date.now());
      await pauseMutation.mutateAsync(elapsedSeconds);
      router.back();
    } catch (e) {
      const err = e as ApiRequestError;
      Alert.alert('Something went wrong', err?.message || 'Please try again.');
    }
  }
```

- [ ] **Step 4: Wire the close button**

Find:

```tsx
        <PressableScale onPress={() => router.back()} hitSlop={12} style={[styles.navBtn, { backgroundColor: t.fill }]}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
```

Replace with:

```tsx
        <PressableScale onPress={confirmPause} disabled={pauseMutation.isPending} hitSlop={12} style={[styles.navBtn, { backgroundColor: t.fill }]}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no new errors.

- [ ] **Step 6: Commit**

```bash
git add "app/assessment/[id]/quiz.tsx"
git commit -m "$(cat <<'EOF'
Pause the assessment on quiz runner close, with a confirm dialog

Close (x) previously just called router.back() with no server call and
no confirmation. Mirrors the Exam runner's existing confirmPause/doPause
pattern. Elapsed time is computed via computeElapsedSeconds, clamped so a
backward device clock can't regress the server's last known value.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: End-to-end verification against the real dev backend

**Files:** none (manual verification — no code changes).

**Interfaces:** none.

Per this repo's testing convention, stateful session flows are verified against a real backend rather than mocked. This task exercises Tasks 1-4 together. Requires `API_BASE_URL` in `.env` pointed at a reachable dev/UAT backend (see `.env.example`) and a test account enrolled in at least one product with objective practice questions available.

- [ ] **Step 1: Start the app**

Run: `npm start`, then press `i` (iOS simulator) or `a` (Android emulator).

- [ ] **Step 2: Pause from the Objectives screen and confirm immediate Continue**

1. Log in, navigate to a course → Domains → a domain → Objectives.
2. Tap an objective with no prior attempt (shows the blue Start button) to begin practice.
3. Answer one or two questions (tap an option, Submit, Next).
4. Tap × in the quiz header → confirm the "Pause Practice?" dialog appears with the exact copy from Global Constraints.
5. Tap **Pause**.
6. Expected: navigates back to the Objectives screen (already mounted, not remounted), and that objective's row now shows the orange progress ring (partially filled, reflecting questions answered / total) instead of the blue Start button — **immediately, no manual pull-to-refresh**.

- [ ] **Step 3: Confirm Continue resumes the same assessment**

1. Tap that same objective row (now showing the ring).
2. Expected: resumes at the correct question/progress (does not start a fresh assessment — no progress reset, no duplicate `Assessment` row created for this objective).

- [ ] **Step 4: Confirm Cancel doesn't pause**

1. From inside the quiz runner, tap × → **Cancel** in the dialog.
2. Expected: dialog dismisses, quiz continues uninterrupted, no network call was made (no visible loading state on the × button).

- [ ] **Step 5: Confirm pause failure handling**

1. Enable airplane mode (or otherwise cut network) while inside the quiz runner.
2. Tap × → Pause.
3. Expected: an "Something went wrong" alert appears; the app stays on the quiz screen (no navigation). Disable airplane mode afterward.

- [ ] **Step 6: Verify `duration_seconds` server-side**

From the `zziippee` backend repo (`/Users/saaz/Projects/zziippee`), after Step 2's pause:

```bash
php artisan tinker --execute="echo App\Models\Assessment::latest()->where('status', 'paused')->first()->duration_seconds;"
```

Expected: a positive integer reflecting real elapsed seconds (not `0`, not obviously wrong — e.g. not thousands of seconds for a 30-second test run).

- [ ] **Step 7: Note the Home-entry path is not yet testable**

Confirm Home's Continue card is still disabled/unpressable (expected — `/dashboard` doesn't return a `continue` key on the real backend today, per the design doc). No action needed; this is documented as a known gap, not a regression to chase down in this task.

- [ ] **Step 8: Final full test suite + typecheck sanity pass**

```bash
npx jest
npm run typecheck
```

Expected: all Jest tests pass (including Task 1's new tests and the pre-existing `formatDate` tests); typecheck clean.
