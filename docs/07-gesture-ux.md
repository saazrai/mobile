# 7 · Gesture-First UX (Instagram-grade)

This addendum upgrades the interaction model in doc 5 from "tap through screens" to
an **immersive, gesture-driven** experience for the content-consumption surfaces —
Study Notes, Flashcards, and Videos — inspired by Instagram Stories/Reels and
Tinder-style card decks. It supersedes the relevant parts of doc 5 §5.4.

## 7.1 Principles

1. **Content is full-bleed.** Study/flashcard/video surfaces go edge-to-edge, chrome
   fades away; the material is the interface.
2. **The thumb drives everything.** Primary progression is a vertical swipe; grading
   and navigation are horizontal swipes. Buttons remain as an accessible fallback,
   never the only path.
3. **Every gesture has a physical response.** Spring physics + haptics on each commit
   so actions feel tactile, not digital.
4. **Progress is always visible but quiet.** Story-style segment bars, not counters.
5. **60fps, always.** Gestures run on the UI thread (Reanimated worklets); no JS-bridge
   jank mid-swipe.

## 7.2 Gesture language (consistent across the app)

| Gesture | Flashcards | Study Notes (Reel) | Videos | Practice quiz |
|---|---|---|---|---|
| **Swipe up** | Skip card (no grade) | **Next** concept/block | Next video | Next question (after reveal) |
| **Swipe down** | — | **Previous** block | Previous video | — |
| **Swipe right →** | **Got it** (know) → green | Bookmark topic | Like | — |
| **Swipe left ←** | **Again** (don't know) → red | Next topic | Skip | — |
| **Tap** | **Flip** front/back | Pause auto-advance / toggle chrome | Play/pause | Select option |
| **Double-tap** | Star/bookmark | Bookmark (heart burst) | Like (heart burst) | — |
| **Tap left/right edge** | — | Prev/next block (Stories-style) | Seek ±10s | — |
| **Long-press** | Peek answer | Hold to pause auto-advance | Speed menu | Peek explanation (after reveal) |

**Consistency rule:** vertical = *move through the set*, horizontal = *act on the
current item*. Learned once, it transfers everywhere.

## 7.3 Signature interactions

**Flashcards — swipe-to-grade deck** (Tinder × Reels)
- A stack of cards; the top card follows the finger with rotation proportional to
  horizontal drag.
- Crossing a horizontal threshold reveals a **"GOT IT" / "AGAIN"** stamp, commits on
  release with a spring fling off-screen + success/warning haptic, and posts the grade.
- Tap flips (3D `rotateY`); vertical fling skips.
- Story segments at top fill as the deck advances; a subtle next-card peek behind.

**Study Notes — vertical Reel**
- Each *concept/block* is a full-screen page in a vertical pager (snap paging).
- Swipe up/down moves between blocks within a topic; horizontal swipes bookmark /
  jump topics. Double-tap = heart-burst bookmark.
- Rich content (headings, key-facts, exam tips, code) rendered immersively with big
  type and generous spacing; a top segment bar shows position in the topic.

**Videos — vertical feed**
- Reels-style autoplay feed of lesson clips; swipe up for next. Same double-tap-like
  and edge-seek vocabulary.

## 7.4 Motion & haptics spec

| Element | Spec |
|---|---|
| Card follow | 1:1 with finger; `rotateZ` = `interpolate(dx, [-w/2, w/2], [-8deg, 8deg])` |
| Commit fling | `withSpring` (damping ~18, stiffness ~180); off-screen in ~250ms |
| Page snap (Reel) | Native paging or `withSpring`; overscroll rubber-band |
| Flip | `withTiming` 350ms, ease-in-out; back face `rotateY:180` |
| Haptics (`expo-haptics`) | Selection tick on option tap; `notificationAsync(Success)` on "Got it" / correct; `Warning` on "Again" / wrong; light impact on page snap |
| Heart burst | Scale 0→1.2→1 spring + fade, ~600ms |
| Reduced motion | Respect `AccessibilityInfo.isReduceMotionEnabled` → cross-fade instead of fling; keep haptics |

## 7.5 Tech

| Concern | Choice |
|---|---|
| Gestures | **react-native-gesture-handler v2** (`Gesture.Pan/Tap/Fling`, composed with `Gesture.Exclusive/Simultaneous`) |
| Animation | **react-native-reanimated v3** (worklets on UI thread: `useSharedValue`, `useAnimatedStyle`, `withSpring`, `interpolate`, `runOnJS`) |
| Paging feed | `FlatList` vertical `pagingEnabled` (Reel) or Reanimated pager |
| Haptics | **expo-haptics** |
| Media | **expo-video** for the video reel |

All added to `package.json` in this repo.

## 7.6 Accessibility (gestures must not exclude anyone)

- Every swipe action has a **visible button equivalent** (e.g. Again / Got it buttons
  under the deck) and an **accessibility action** so VoiceOver/TalkBack users can
  trigger it.
- Respect reduce-motion (§7.4) and Dynamic Type (content scales; layouts reflow).
- Don't encode grade by color alone — pair with icon + label + haptic.
- Auto-advance (if any) is **off by default** and pausable by touch.

## 7.7 Scope change: PBQs are **web/laptop-only**

Performance-Based Questions (drag-and-drop simulations, terminal/console tasks,
network-diagram building) require a **precision pointer and screen real estate**.
They are **excluded from the mobile app**. Where a course contains PBQs, mobile shows
an informational card: *"Performance-based questions are available on the web app
(desktop recommended)."* with a link out. This removes the `/api/v1/pbqs*` work from
the mobile roadmap (doc 3 §3.7 is deferred/cancelled for mobile).

## 7.8 Floating translucent navigation

The bottom tab bar is a **floating, translucent pill** (Instagram-style), not a solid
docked bar:

- **Detached** from the screen edge — inset ~12–16pt left/right, floats above content
  with a soft shadow, pill radius (~28pt).
- **Translucent blur** — `expo-blur` `BlurView` (`intensity` ~40–60,
  `tint="systemChromeMaterial"` → adapts to light/dark) with a semi-opaque token
  overlay (`--panel` at ~55–70% alpha) so content scrolls softly under it.
- **Content-aware** — screens use `contentContainerStyle` bottom padding so nothing
  hides behind it; the immersive Reel/Flashcard/Video surfaces **hide the bar entirely**
  (full-bleed) and rely on gestures + a small close affordance.
- **Active state** — accent-filled icon + subtle scale pop on tab change; inactive
  icons are `--muted`. Optional center accent action (e.g. quick "Practice").
- **Respect safe area** — floats above the home indicator with `env(safe-area-inset-bottom)`.

Implemented as a custom `FloatingTabBar` passed to Expo Router's `Tabs` via
`tabBar={...}` (see `src/components/FloatingTabBar.tsx`).

## 7.9 Impacted screens (updates to doc 5 inventory)

| Screen | Change |
|---|---|
| O · Study Notes | Reworked into a **vertical Reel** with segment bar + gesture nav |
| P · Flashcards | Reworked into a **swipe-to-grade deck** with stamps + haptics |
| Q · Videos | Reworked into a **Reels-style vertical feed** |
| J · Quiz Runner | Adds swipe-up-to-advance after reveal + haptic feedback (buttons stay) |
| — · PBQ | **Removed** from mobile (§7.7) |
