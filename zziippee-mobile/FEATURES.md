# zziippee Mobile — User-Facing Features

This file lists what users can actually **do** in the app, with honest status notes.
It is NOT a technical inventory — it describes user-facing capabilities only.

---

## Sign In & Account

| Feature | Status | Notes |
|---------|:------:|-------|
| Sign in with email + password | ✅ | Via mock server; real backend needs Sanctum scaffold |
| Create account | ✅ | Name, email, password → verification code sent to email |
| Email verification (4-digit code) | ✅ | Send → enter code flow; 10-min expiry, resend available |
| Sign in with Google | ⚠️ Stub | Button shows "Coming soon" — SDK API mismatched this build version |
| Forgot password | ✅ | Enter email → "check your inbox for signed link" (server sends link, not an in-app code) |
| Dark mode toggle | ✅ | Local switch on profile screen; server sync is a future improvement |
| Export my data (GDPR) | ✅ | Calls `GET /account/export` — returns JSON dump from mock |
| Anonymize account | ✅ | Replaces "Delete Account" copy per spec; clears session locally |

---

## Home & Courses

| Feature | Status | Notes |
|---------|:------:|-------|
| Dashboard with continue card | ✅ | Shows last practice assessment; pulls from `/dashboard` API |
| Browse enrolled courses | ✅ | Lists Security+, ISC2 CC, CySA+ with mastery % and expiry dates |
| Open a course home | ✅ | Shows tiles: Practice, Study Notes, Flashcards, Videos |

**Not available (intentional v1 cut):** Streak counter, continue card for exams, weakest-objective suggestion — backend doesn't produce these yet.

---

## Practice

| Feature | Status | Notes |
|---------|:------:|-------|
| Adaptive objective practice | ✅ | Picks questions by difficulty; reveals correct answer + justifications after each question |
| Post-quiz review | ✅ | See all questions with your answers, correct options, and rationale panels |
| Domain test (no-reveal) | ✅ | Linear blind runner — no per-question feedback until you submit the whole test |
| Browse domains by course | ✅ | Lists domains with question count; detail view is a placeholder ("coming soon") |

**Not available:** Performance-Based Questions (PBQs). All questions are multiple-choice (single or multi-select). The mock and real backend both serve MCQs only.

---

## Exams

| Feature | Status | Notes |
|---------|:------:|-------|
| View exam types | ✅ | Linear Navigable, Linear Sequential; CAT type is listed but `is_active: false` (no CAT engine exists on the real backend either) |
| Start / resume exam | ✅ | Resume picks up where you left off via server state |
| Timer with wall-clock expiry | ✅ | Heartbeat re-syncs every 30s; auto-submits when time runs out even if paused/backgrounded |
| Question palette (navigable exams) | ✅ | Swipe-up sheet showing answered/unanswered/flagged questions; tap to jump |
| Flag questions for review | ✅ | Orange flag icon on navigable exam types |
| Review before submit | ✅ | After last question, shows all answers in a list; you can edit prior answers or end review (locks further edits) |
| Results — score ring + pass/fail | ✅ | Compares your score against the exam's own passing % (never hardcoded) |
| Results — domain performance bars | ✅ | Per-domain accuracy vs passing threshold marker |
| Results — Bloom cognitive profile | ✅ | Bars for remember/understand/apply/analyze with accuracy |
| Results — strengths & focus areas | ✅ | Topics ≥75% shown as strengths; <55% flagged as focus areas |
| Results — Time Intelligence | ✅ | Avg correct vs incorrect answer time; fast-correct and slow-correct signals |
| Results — Action Plan | ✅ | Weak topics sorted by accuracy with high/medium priority badges |
| Exam review (post-submit) | ✅ | Sequential viewer with correct options + justifications; gated by `can_review` policy flag |

---

## Study Content

| Feature | Status | Notes |
|---------|:------:|-------|
| Study notes (vertical reel) | ✅ | Text, quiz, and image blocks rendered via react-native-markdown-display |
| Flashcards (swipe deck) | ✅ | Tinder-style swipe: right = "Got it", left = "Again", up = skip; grades are sent to the server for tracking |

**Not available:** Videos Reels feed — no screen file exists, backend has no content model yet. The Course Home tile taps `/learn/[product]/videos` which currently 404s.

---

## Progress

| Feature | Status | Notes |
|---------|:------:|-------|
| Overall proficiency score | ✅ | Weighted average from `GET /learner/proficiency/:slug` API |
| Per-domain mastery bars | ✅ | Sorted lowest-to-highest; color-coded (green ≥65%, orange ≥45%, red <45%) |
| Estimated exam scaled score | ⚠️ Placeholder | Rough 500–800 mapping since no conversion endpoint exists server-side yet |

---

## Offline & Accessibility

| Feature | Status | Notes |
|---------|:------:|-------|
| Offline banner | ✅ | Orange bar at top of every screen when network is unavailable |
| Screen reader labels | ✅ | `accessibilityLabel` on all form fields, buttons, and option rows in new screens |

---

## What's NOT in the App (by design)

- **Google Sign-In** — stub only; SDK version mismatch with this build
- **Videos feed** — deferred pending backend content model
- **PBQs / simulation questions** — not supported by either mock or real backend
- **Streak / continue-card for exams / weakest-objective suggestions** — v1 cut per spec §11.1 Option B (backend doesn't produce these)
- **Domain detail sub-view** (objectives list + "start practice" from within a domain card) — placeholder in code
- **Per-block completion tracking on study notes** — backend must add HTML sanitization + eager-loaded completion state first

---

## How to Use This File

Reference this file when:
- Writing release notes or changelogs (use the status column to set user expectations)
- Answering "what can users do?" questions from non-engineering stakeholders
- Deciding what NOT to build (the "not available" sections above are intentional v1 cuts)
- Onboarding new developers — this is a higher-level map than `TASKS-MOBILE.md` or `TASKS-EXAM.md`, which describe implementation tasks
