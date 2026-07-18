# Dashboard & Courses — Real Backend Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Home and My Courses screens against the real zziippee backend's actual `/dashboard` and `/enrollments` response shapes (per `docs/11-home-courses-progress-spec.md` §11.1's Option B), instead of the richer-but-fictional shape the bundled mock invented, so the app renders correctly once `API_BASE_URL` points at the real backend.

**Architecture:** Two screens (`app/(tabs)/index.tsx`, `app/(tabs)/courses.tsx`) currently type their API responses against mock-only fields (`mastery`, `art`, `vendor`, `expires`, a `continue` resume card) that `CurriculumController` (zziippee) never returns. `art`/`vendor` become a small client-side lookup keyed by product slug (there's no server concept of "poster art"); the fictional "Continue" resume card is replaced with a "recent activity" summary built from the real `recentResults` field, since the real backend has no in-progress-assessment concept to resume into. `mock/server.mjs` is updated to match the same corrected contract so it stays useful for offline dev per `TASKS-MOBILE.md`'s existing note.

**Tech Stack:** React Native (Expo Router), TypeScript strict, TanStack Query, Jest + jest-expo (new — no config exists yet).

## Global Constraints

- `getData<T>('/path')` unwraps the backend's `{data: ...}` envelope already — screen code works with the unwrapped shape directly (`src/api/client.ts:63-66`).
- No test infra exists yet (`jest`/`jest-expo` are installed but there's no `jest.config.*` — CLAUDE.md, "Testing / TDD"). TDD pure logic (lookups, formatting) per CLAUDE.md's guidance; don't attempt RNTL screen-rendering tests — not set up.
- Real backend fields confirmed directly from `zziippee/app/Http/Controllers/Api/V1/CurriculumController.php` (not from the docs — the docs' §11.4 sketch uses `recent_results` snake_case, but the actual controller returns `recentResults` camelCase; trust the controller source).
- Real `enrollments`/`dashboard` responses do **not** include `expires_at` (even though the `Enrollment` model has the column) — don't render an "Expires" field; there's nothing to show yet.
- Keep `mock/server.mjs`'s `COURSES` fixture array as-is (still used by `/learn/:product` and quiz/question fixtures) — only change what the `/dashboard` and `/enrollments` handlers project from it.

---

### Task 1: Shared utilities — course metadata & date formatting (TDD)

**Files:**
- Create: `jest.config.js`
- Create: `src/theme/courseArt.ts`
- Test: `src/theme/__tests__/courseArt.test.ts`
- Create: `src/utils/formatDate.ts`
- Test: `src/utils/__tests__/formatDate.test.ts`

**Interfaces:**
- Produces: `courseMetaFor(slug: string | null | undefined): { art: 'security' | 'cc' | 'cysa'; vendor: string }` — used by Task 2 (Courses screen) and Task 3 (Home screen) to derive poster art + vendor label from a `product.slug` the real backend returns.
- Produces: `formatShortDate(iso: string | null | undefined): string` — returns `"D Mon"` (e.g. `"14 Mar"`) or `""` for missing/invalid input. Used by Task 2 (enrolled date) and Task 3 (recent-result date).

- [ ] **Step 1: Add the Jest config**

```js
// jest.config.js
module.exports = {
  preset: 'jest-expo',
};
```

- [ ] **Step 2: Write the failing tests for `courseMetaFor`**

```ts
// src/theme/__tests__/courseArt.test.ts
import { courseMetaFor } from '../courseArt';

describe('courseMetaFor', () => {
  it('returns the mapped art and vendor for a known product slug', () => {
    expect(courseMetaFor('isc2-cc')).toEqual({ art: 'cc', vendor: 'ISC2' });
    expect(courseMetaFor('comptia-security-plus')).toEqual({ art: 'security', vendor: 'CompTIA' });
    expect(courseMetaFor('comptia-cysa-plus')).toEqual({ art: 'cysa', vendor: 'CompTIA' });
  });

  it('falls back to security art with no vendor for an unknown slug', () => {
    expect(courseMetaFor('some-future-course')).toEqual({ art: 'security', vendor: '' });
  });

  it('falls back to the default for a null or undefined slug', () => {
    expect(courseMetaFor(null)).toEqual({ art: 'security', vendor: '' });
    expect(courseMetaFor(undefined)).toEqual({ art: 'security', vendor: '' });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/theme/__tests__/courseArt.test.ts`
Expected: FAIL — `Cannot find module '../courseArt'`

- [ ] **Step 4: Implement `courseMetaFor`**

```ts
// src/theme/courseArt.ts
export type CourseArt = 'security' | 'cc' | 'cysa';

export interface CourseMeta {
  art: CourseArt;
  vendor: string;
}

// The real backend has no concept of poster art or a vendor label — both are
// presentation-only, so they're a client-side lookup keyed by product slug
// rather than something the API returns.
const COURSE_META: Record<string, CourseMeta> = {
  'comptia-security-plus': { art: 'security', vendor: 'CompTIA' },
  'isc2-cc': { art: 'cc', vendor: 'ISC2' },
  'comptia-cysa-plus': { art: 'cysa', vendor: 'CompTIA' },
};

const DEFAULT_META: CourseMeta = { art: 'security', vendor: '' };

export function courseMetaFor(slug: string | null | undefined): CourseMeta {
  if (!slug) return DEFAULT_META;
  return COURSE_META[slug] ?? DEFAULT_META;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/theme/__tests__/courseArt.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Write the failing tests for `formatShortDate`**

```ts
// src/utils/__tests__/formatDate.test.ts
import { formatShortDate } from '../formatDate';

describe('formatShortDate', () => {
  it('formats an ISO date string as "D Mon" in UTC', () => {
    expect(formatShortDate('2026-03-14T10:00:00Z')).toBe('14 Mar');
    expect(formatShortDate('2026-12-02T00:00:00Z')).toBe('2 Dec');
  });

  it('returns an empty string for null or undefined', () => {
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate(undefined)).toBe('');
  });

  it('returns an empty string for an invalid date string', () => {
    expect(formatShortDate('not-a-date')).toBe('');
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npx jest src/utils/__tests__/formatDate.test.ts`
Expected: FAIL — `Cannot find module '../formatDate'`

- [ ] **Step 8: Implement `formatShortDate`**

```ts
// src/utils/formatDate.ts
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  // UTC getters — deterministic regardless of the device/CI timezone.
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `npx jest src/utils/__tests__/formatDate.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 10: Commit**

```bash
git add jest.config.js src/theme/courseArt.ts src/theme/__tests__/courseArt.test.ts src/utils/formatDate.ts src/utils/__tests__/formatDate.test.ts
git commit -m "Add Jest config and course-metadata/date-formatting utilities"
```

---

### Task 2: Update `mock/server.mjs` to serve the real backend's `/dashboard` and `/enrollments` contract

**Files:**
- Modify: `mock/server.mjs:805-807`

**Interfaces:**
- Consumes: none (plain data transform of the existing `COURSES` fixture, `mock/server.mjs:10-14`).
- Produces: `/dashboard` → `{ enrollments, stats, recentResults }`; `/enrollments` → `Enrollment[]` — the same shape Tasks 3 and 4 build the screens against.

- [ ] **Step 1: Replace the `/dashboard` and `/enrollments` handlers**

Replace lines 805-807:

```js
    // home / courses
    if (path === '/dashboard') return ok(res, { continue: { assessment_id: firstOrNewSession(), label: '1.4 Professional ethics', course: 'ISC2 CC', progress_percent: 44 }, courses: COURSES });
    if (path === '/enrollments') return ok(res, COURSES);
```

with:

```js
    // home / courses — shape matches the real CurriculumController::dashboard/enrollments
    // response (docs/09 §9.2, docs/11 §11.1's Option B): no continue/mastery/art/vendor —
    // those are either fictional (continue) or client-side-only presentation (art/vendor).
    if (path === '/dashboard') {
      return ok(res, {
        enrollments: COURSES.map(toEnrollment),
        stats: { enrolledCourses: COURSES.length, examsCompleted: 2, bestScore: 82, averageScore: 71 },
        recentResults: [
          { id: 501, type: 'objective', label: 'Professional ethics', product: 'ISC2 CC', score: 80, correct: 4, total: 5, completed_at: '2026-07-10T09:00:00Z' },
          { id: 500, type: 'exam', label: 'Practice Exam', product: 'Security+', score: 71, correct: 62, total: 87, completed_at: '2026-07-02T14:30:00Z' },
        ],
      });
    }
    if (path === '/enrollments') return ok(res, COURSES.map(toEnrollment));
```

- [ ] **Step 2: Add the `toEnrollment` projection helper**

Add just above the `// home / courses` block (before line 805):

```js
// Projects the COURSES fixture into the real Enrollment shape (id, course, product,
// enrolled_at) — mastery/art/vendor/expires are NOT part of the real API response.
function toEnrollment(c, i) {
  return {
    id: i + 1,
    course: { name: c.name, code: c.code },
    product: { name: c.name, slug: c.slug },
    enrolled_at: '2026-01-01T00:00:00Z',
  };
}

```

- [ ] **Step 3: Verify the mock still boots and serves the new shape**

Run: `npm run mock`
In another terminal: `curl -s http://localhost:4010/api/v1/dashboard -H "Authorization: Bearer anything" | head -c 400`
Expected: JSON containing `"enrollments"`, `"stats"`, `"recentResults"` keys — no `"continue"` or `"courses"` key. Stop the mock server (Ctrl-C) after checking.

- [ ] **Step 4: Commit**

```bash
git add mock/server.mjs
git commit -m "Match mock /dashboard and /enrollments to the real backend's response shape"
```

---

### Task 3: Rebuild the Courses screen against the real `Enrollment[]` contract

**Files:**
- Modify: `app/(tabs)/courses.tsx`

**Interfaces:**
- Consumes: `courseMetaFor` from `src/theme/courseArt.ts` (Task 1), `formatShortDate` from `src/utils/formatDate.ts` (Task 1).
- Produces: no exports consumed elsewhere — this is a leaf screen.

- [ ] **Step 1: Replace the file contents**

```tsx
// app/(tabs)/courses.tsx
import { ScrollView, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getData } from '../../src/api/client';
import { Text } from '../../src/components/Text';
import { Poster } from '../../src/components/Poster';
import { useTheme, spacing, radius } from '../../src/theme/tokens';
import { courseMetaFor } from '../../src/theme/courseArt';
import { formatShortDate } from '../../src/utils/formatDate';

interface Enrollment {
  id: number;
  course: { name: string; code: string } | null;
  product: { name: string; slug: string } | null;
  enrolled_at: string | null;
}

export default function CoursesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['enrollments'], queryFn: () => getData<Enrollment[]>('/enrollments'), staleTime: 120_000 });
  const list = data ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={{ marginBottom: spacing.xs }}>Courses</Text>
        {isLoading ? <View style={styles.status}><ActivityIndicator color={t.blue} /></View> : isError ? (
          <View style={[styles.status, { backgroundColor: t.cell }]}>
            <Text variant="body" color="label2">Couldn't load your courses.</Text>
            <Pressable onPress={() => refetch()} accessibilityLabel="Retry loading courses"><Text variant="headline" color="blue">Retry</Text></Pressable>
          </View>
        ) : list.map((e) => {
          const slug = e.product?.slug;
          const meta = courseMetaFor(slug);
          const name = e.course?.name ?? e.product?.name ?? 'Course';
          const code = e.course?.code ?? '';
          const enrolledLabel = formatShortDate(e.enrolled_at);
          return (
            <Pressable key={e.id} onPress={() => slug && router.push(`/learn/${slug}`)}>
              <Poster art={meta.art} style={styles.card}>
                <Text style={styles.code}>{code}</Text>
                <View>
                  {meta.vendor ? <Text variant="caption" style={styles.kicker}>{meta.vendor.toUpperCase()}</Text> : null}
                  <Text variant="title2" color="onColor">{name}</Text>
                  {enrolledLabel ? <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Enrolled {enrolledLabel}</Text> : null}
                </View>
              </Poster>
            </Pressable>
          );
        })}
        {!isLoading && !isError && list.length === 0 && <Text variant="body" color="label2">You don't have any enrolled courses yet.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  card: { borderRadius: radius.card, aspectRatio: 16 / 9, padding: spacing.xl },
  code: { position: 'absolute', top: 10, right: 18, fontSize: 60, fontWeight: '800', letterSpacing: -2, color: 'rgba(255,255,255,0.16)' },
  kicker: { letterSpacing: 1.2, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  status: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.card, gap: spacing.md },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors referencing `app/(tabs)/courses.tsx`.

- [ ] **Step 3: Manually verify against the mock**

Run: `npm run mock` (separate terminal), then `npm start` and open the Courses tab.
Expected: three course cards (Security+, ISC2 CC, CySA+) each showing vendor kicker, name, and "Enrolled 1 Jan". No JS error, no blank mastery/expiry text.

- [ ] **Step 4: Commit**

```bash
git add "app/(tabs)/courses.tsx"
git commit -m "Rebuild Courses screen against the real Enrollment[] contract"
```

---

### Task 4: Rebuild the Home screen against the real `Dashboard` contract

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Interfaces:**
- Consumes: `courseMetaFor` from `src/theme/courseArt.ts` (Task 1), `formatShortDate` from `src/utils/formatDate.ts` (Task 1).
- Produces: no exports consumed elsewhere — this is a leaf screen.

- [ ] **Step 1: Replace the file contents**

```tsx
// app/(tabs)/index.tsx
import { View, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getData } from '../../src/api/client';
import { Text } from '../../src/components/Text';
import { Poster } from '../../src/components/Poster';
import { useTheme, spacing, radius } from '../../src/theme/tokens';
import { courseMetaFor } from '../../src/theme/courseArt';
import { formatShortDate } from '../../src/utils/formatDate';

interface Enrollment {
  id: number;
  course: { name: string; code: string } | null;
  product: { name: string; slug: string } | null;
  enrolled_at: string | null;
}

interface RecentResult {
  id: number;
  type: string;
  label: string;
  product: string | null;
  score: number;
  correct: number | null;
  total: number | null;
  completed_at: string | null;
}

interface Dashboard {
  enrollments: Enrollment[];
  stats: { enrolledCourses: number; examsCompleted: number; bestScore: number | null; averageScore: number | null };
  recentResults: RecentResult[];
}

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: () => getData<Dashboard>('/dashboard'), staleTime: 120_000 });

  const courses = data?.enrollments ?? [];
  const latest = data?.recentResults?.[0] ?? null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={styles.title}>Study</Text>
        <Text variant="subhead" color="label2" style={styles.sub}>Tuesday, 17 July</Text>

        {isLoading ? <View style={styles.status}><ActivityIndicator color={t.blue} /></View> : isError ? (
          <View style={[styles.status, { backgroundColor: t.cell }]}>
            <Text variant="body" color="label2">Couldn't load your study data.</Text>
            <Pressable onPress={() => refetch()} accessibilityLabel="Retry loading study data"><Text variant="headline" color="blue">Retry</Text></Pressable>
          </View>
        ) : <>
        {/* Recent activity — real backend has no in-progress assessment to resume into,
            so this shows the most recent completed result instead of a fictional
            "continue where you left off" card (docs/11 §11.1). */}
        <View style={[styles.recent, { backgroundColor: t.cell }]}>
          <Text variant="caption" style={[styles.kickerDark, { color: t.label2 }]}>
            {latest ? `RECENT · ${(latest.product ?? '').toUpperCase()}` : 'ALL CAUGHT UP'}
          </Text>
          <Text variant="title3" style={{ marginTop: 2 }}>
            {latest ? `${latest.label} · ${latest.score}%` : 'Start practicing to see your progress here.'}
          </Text>
          {latest?.completed_at ? <Text variant="footnote" color="label2" style={{ marginTop: 2 }}>{formatShortDate(latest.completed_at)}</Text> : null}
        </View>

        <Text variant="footnote" color="label2" style={styles.shelfHead}>YOUR COURSES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
          {courses.map((c) => {
            const meta = courseMetaFor(c.product?.slug);
            return (
              <Pressable key={c.id} style={styles.pcard} onPress={() => c.product?.slug && router.push(`/learn/${c.product.slug}`)}>
                <Poster art={meta.art} style={styles.poster}>
                  <Text style={styles.posterCode}>{c.course?.code ?? ''}</Text>
                  <View style={{ padding: spacing.md }}>
                    {meta.vendor ? <Text variant="caption" style={styles.kicker}>{meta.vendor.toUpperCase()}</Text> : null}
                    <Text variant="headline" color="onColor">{c.course?.name ?? c.product?.name ?? 'Course'}</Text>
                  </View>
                </Poster>
              </Pressable>
            );
          })}
        </ScrollView>
        {courses.length === 0 && <Text variant="body" color="label2" style={styles.empty}>No enrolled courses yet.</Text>}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  sub: { paddingHorizontal: spacing.xl, marginTop: -2 },
  recent: { marginHorizontal: spacing.xl, marginTop: spacing.lg, borderRadius: radius.card, padding: spacing.lg },
  kickerDark: { letterSpacing: 1.4, fontWeight: '700' },
  shelfHead: { marginHorizontal: spacing.xl, marginTop: spacing.xxl, letterSpacing: 0.4 },
  shelf: { paddingHorizontal: spacing.xl, gap: 14, paddingTop: spacing.sm },
  pcard: { width: 150 },
  poster: { borderRadius: 14, aspectRatio: 2 / 3 },
  posterCode: { position: 'absolute', top: 8, right: 14, fontSize: 44, fontWeight: '800', letterSpacing: -1, color: 'rgba(255,255,255,0.16)' },
  kicker: { letterSpacing: 1.4, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  status: { margin: spacing.xl, padding: spacing.xl, borderRadius: radius.card, alignItems: 'center', gap: spacing.md },
  empty: { marginHorizontal: spacing.xl, marginTop: spacing.md },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: no errors referencing `app/(tabs)/index.tsx`.

- [ ] **Step 3: Manually verify against the mock**

Run: `npm run mock` (separate terminal), then `npm start` and open the Home tab.
Expected: "RECENT · ISC2 CC" card showing "Professional ethics · 80%" and a date, course shelf below with three posters, no crash, no reference to the old `continue`/`mastery` fields.

- [ ] **Step 4: Manually verify against the real backend**

With `.env`'s `API_BASE_URL=http://192.168.68.68:8000/api/v1` (already set this session) and the zziippee server running, restart the Expo dev server (`npm start` — required so the new env var is picked up), log in, and open Home + Courses.
Expected: real enrollments render with correct course names/codes and no runtime error; recent-activity card reflects real completed assessments (or "ALL CAUGHT UP" if the test account has none).

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/index.tsx"
git commit -m "Rebuild Home screen against the real Dashboard contract"
```

---

### Task 5: Correct the docs that claimed this was already done against the real backend

**Files:**
- Modify: `FEATURES.md`
- Modify: `TASKS-MOBILE.md:61-65`

**Interfaces:** none (documentation only).

- [ ] **Step 1: Update `FEATURES.md`'s Home & Courses table**

Replace:

```markdown
| Feature | Status | Notes |
|---------|:------:|-------|
| Dashboard with continue card | ✅ | Shows last practice assessment; pulls from `/dashboard` API |
| Browse enrolled courses | ✅ | Lists Security+, ISC2 CC, CySA+ with mastery % and expiry dates |
| Open a course home | ✅ | Shows tiles: Practice, Study Notes, Flashcards, Videos |

**Not available (intentional v1 cut):** Streak counter, continue card for exams, weakest-objective suggestion — backend doesn't produce these yet.
```

with:

```markdown
| Feature | Status | Notes |
|---------|:------:|-------|
| Dashboard recent-activity card | ✅ | Shows most recent completed assessment; pulls from `/dashboard` API (`recentResults[0]`) — real backend has no in-progress assessment to resume into, so there's no "continue" card (doc 11 §11.1) |
| Browse enrolled courses | ✅ | Lists enrolled courses by name/code; poster art + vendor label are a client-side lookup keyed by product slug (`src/theme/courseArt.ts`), not server data |
| Open a course home | ✅ | Shows tiles: Practice, Study Notes, Flashcards, Videos |

**Not available (intentional v1 cut):** Streak counter, continue-where-you-left-off card, weakest-objective suggestion, per-course mastery %, enrollment expiry date — none of these exist in the real backend's `/dashboard`/`/enrollments` response yet (doc 11 §11.1/§11.4).
```

- [ ] **Step 2: Update `TASKS-MOBILE.md`'s task 1.2**

Replace lines 61-65:

```markdown
- **1.2** `[MOBILE]` Home/My Courses/Course Home screens (doc 05 screens
  E–G) — scope to doc 11 §11.1's Option B (enrollments/stats/recent-results
  only) unless the backend track confirms it built Option A's
  continue-card/streak/weakest-objective features — check before assuming
  those fields exist in a real response.
```

with:

```markdown
- **1.2** `[MOBILE]` Home/My Courses screens (doc 05 screens E–F) — scoped to
  doc 11 §11.1's Option B (enrollments/stats/recentResults only). **Done.**
  Confirmed directly against `CurriculumController::dashboard`/`enrollments`
  (zziippee, `uat` branch) that Option A's continue-card/streak/weakest-objective
  fields still don't exist server-side — rebuilt both screens around
  `enrollments`/`recentResults`, with poster art/vendor as a client-side lookup
  (`src/theme/courseArt.ts`). Real response also omits `expires_at` even though
  the `Enrollment` model has the column — nothing to render there yet; flag as
  a backend follow-up if the expiry badge is wanted. Course Home (screen G) is
  unchanged in this pass.
```

- [ ] **Step 3: Commit**

```bash
git add FEATURES.md TASKS-MOBILE.md
git commit -m "Correct Home/Courses docs to match the real backend's verified response shape"
```
