# 5 · UI/UX Specification

A visual mockup accompanies this spec (interactive HTML Artifact — see chat link /
`design/uiux-mockup.html`). This document is the written spec the design team turns
into Figma and the mobile team builds against.

## 5.1 Product principles

1. **Practice-first.** The fastest path from open-app to answering a question is the
   whole point. Home surfaces "Continue where you left off" and "Weakest objective".
2. **One-thumb ergonomics.** Primary actions (Submit, Next, options) sit in the lower
   two-thirds; large tap targets (≥44pt).
3. **Immediate, honest feedback.** Correct/incorrect + rationale right after submit —
   never hide the "why."
4. **Progress you can feel.** Mastery per objective, streaks, and score trends make
   effort visible.
5. **Calm focus during exams.** Timed exam mode strips chrome; no distractions.

## 5.2 Design system (mirror the web brand)

Pull tokens from the web `tailwind.config.js` so brand stays consistent.

| Token | Guidance |
|---|---|
| Color — primary | Brand indigo/blue (from web). Used for primary actions, active states. |
| Color — semantic | success (correct), danger (incorrect), warning (exam time low), muted (secondary) |
| Surface | Light + **dark mode** (respect system). Cards on subtle elevated surfaces. |
| Typography | System font stack; scale: Display / H1 / H2 / Body / Caption. Question text ≥17pt. |
| Spacing | 4pt base grid (4/8/12/16/24/32). |
| Radius | 12–16pt cards, 8pt inputs, pill for badges. |
| Elevation | Soft shadows on cards, sheets; avoid heavy borders. |
| Motion | 150–250ms ease; option-select and correct/incorrect reveal are animated. |

Reusable components: `Button`, `Card`, `OptionRow` (idle/selected/correct/incorrect),
`ProgressBar` (determinate + adaptive/indeterminate), `MasteryBadge`,
`DifficultyPips`, `Timer`, `EmptyState`, `Skeleton`, `Toast/Banner`, `Sheet`.

## 5.3 Screen inventory

| # | Screen | Purpose | Key elements |
|---|---|---|---|
| A | Splash / auth-gate | Route by token | logo, spinner |
| B | Login | Email/password + Google | fields, "Continue with Google", forgot link |
| C | Register | Create account | name/email/password, T&C |
| D | Verify email | Code entry | 6-digit code, resend timer |
| E | Home / Dashboard | Jump back in | Continue card, weakest objective, streak, mastery rollup |
| F | My Courses | Enrollments | course cards, progress ring, expiry, "Browse more" → web |
| G | Course Home | Course hub | nav tiles (Practice, Study notes, Flashcards, Videos, Exams) |
| H | Practice List | Pick what to practice | domains → objectives, per-objective mastery + question count |
| I | Objective Detail | Start/resume | best score, adaptive length, topics, big **Start / Resume** |
| J | **Quiz Runner** | Answer loop | question, options, submit, reveal + justification, adaptive progress |
| K | Quiz Review | Post-quiz | score, mastery, per-question correct/incorrect + rationale |
| L | Exams List | Choose sim | duration, #questions, passing %, last attempt |
| M | **Exam Runner** | Timed sim | countdown, question index, locked nav (sim mode) |
| N | Exam Results | Outcome | pass/fail, score, per-domain breakdown, review CTA |
| O | Study Notes | Read | topic list → block content (rich text) |
| P | Flashcards | Recall | flip card, know/don't-know, deck progress |
| Q | Videos | Watch | list + player |
| R | Progress | Trends | mastery by domain, score history, streak calendar |
| S | Profile / Settings | Account | profile, privacy settings, **delete account**, logout, dark mode |

Bold = highest-effort, highest-value screens.

## 5.4 Key flow annotations

**Quiz Runner (screen J) — the money screen**
- Header: objective name, close (×) → confirm pause/exit, adaptive progress bar
  ("Q 4 · adaptive").
- Body: scrollable question content (renders sanitized HTML/markdown, code blocks
  monospaced), then option rows.
- Options: single-select (radio) or multi-select (checkbox) per
  `expected_selection_count`; selected state highlighted.
- Footer: sticky **Submit** (disabled until valid selection count).
- After submit: options recolor to correct/incorrect, a **rationale panel** expands
  with justifications, Submit becomes **Next** (or **See results** when `is_done`).
- Timer per question runs silently; feeds analytics.

**Exam Runner (screen M)**
- Persistent countdown (turns amber < 5 min, red < 1 min).
- Question palette optional; in `linear_locked` sim mode, no back-nav, no answer
  changes after Next.
- Confirm dialog on early End; auto-submit on expiry.

**Home (screen E)**
- Top: **Continue** card (in-progress/paused assessment) → deep link into runner.
- **Weakest objective** suggestion (from proficiency) → one-tap start.
- Streak + today's goal; mastery rollup ring.

## 5.5 States every screen must handle

Loading (skeletons), empty (no enrollments / no questions yet), error (retry),
offline (banner + disabled writes), expired-enrollment (read-only + renew → web).

## 5.6 Accessibility

- WCAG AA contrast; support Dynamic Type / font scaling.
- All interactive elements labeled for screen readers (VoiceOver/TalkBack).
- Don't encode correctness by color alone — pair with icon + label.
- Timers announced politely; honor reduce-motion.

## 5.7 Deliverables for the design team

1. Figma file with the 19 screens above in light + dark.
2. Component library matching §5.2 tokens (pull from web Tailwind).
3. Prototype wiring the golden path: Login → Course → Objective → Quiz → Review.
4. Redlines/tokens exported for the mobile theme file.
