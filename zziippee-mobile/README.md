# zziippee-mobile (Expo skeleton)

React Native + Expo (TypeScript) starter for the SecureStart app. Implements the
architecture in [`../docs/04-mobile-app-design.md`](../docs/04-mobile-app-design.md)
and consumes the API in [`../docs/openapi/mobile-v1.yaml`](../docs/openapi/mobile-v1.yaml).

## What's wired already

- **Expo Router** with an **auth gate** (`app/_layout.tsx`) that routes on token presence.
- **API client** (`src/api/client.ts`) — axios + Bearer token injection + 401 → logout + envelope unwrap.
- **Session store** (`src/stores/session.ts`) — token in **SecureStore** (Keychain/Keystore), never AsyncStorage.
- **TanStack Query** hooks (`src/api/hooks/`) — auth, dashboard, adaptive practice, with online-first cache policies.
- **Apple-grade design system** (matches `../design/uiux-mockup.html`):
  - `src/theme/tokens.ts` — iOS **semantic tokens** (systemGroupedBackground, secondary/tertiaryLabel, separator, system colors, blur materials) + the **SF Pro type ramp**.
  - `src/components/Text.tsx` — typography primitive keyed to the ramp.
  - `src/components/List.tsx` — **grouped-inset** `Section`/`Row` with hairline separators, icon tiles, values + chevrons (the Account-Settings pattern).
  - `src/components/Icon.tsx` — SF-Symbols-style SVG icons (shared vocabulary with the mockup).
  - `src/components/Poster.tsx` — Apple-TV cinematic gradient posters.
  - `src/components/FloatingTabBar.tsx` — iOS translucent (blur) tab bar.
- **Screens**: Login, **Home** (cinematic), **Course** (hero + grouped list), **Quiz Runner**
  (server-authoritative answer→reveal→next), **Account** (grouped settings), Courses, Progress,
  **Flashcards** (swipe-to-grade deck) and **Study Notes** (vertical reel).

## Getting started

```bash
npm install
cp .env.example .env            # set API_BASE_URL + Google client ids
npm run api:mock                # (optional) mock server from the OpenAPI spec
npm run api:types               # generate src/api/generated/schema.ts from OpenAPI
npm start                       # then press i (iOS) or a (Android)
```

Point `API_BASE_URL` at the mock server (`npm run api:mock`) to build screens
before the real `/api/v1` exists — this is the contract-first flow from the roadmap.

## Structure

```
app/                      # Expo Router routes (screens)
  _layout.tsx             # QueryClient + SafeArea + AuthGate
  (auth)/login.tsx        # more: register, verify-email, forgot-password
  (tabs)/                 # index (home), courses, progress, profile
  assessment/[id]/quiz.tsx  # the core practice runner
src/
  api/client.ts           # axios instance + interceptors + envelope helpers
  api/hooks/              # useLogin, dashboard, practice (start/answer/pause)
  api/generated/          # `npm run api:types` output (gitignored until generated)
  stores/session.ts       # token vault + auth state
  theme/tokens.ts         # design tokens (light/dark)
  components/             # QuestionCard, OptionRow, Timer, ... (to build)
```

## Still to build (per docs 4, 5 & 7)

Register/verify/forgot screens · Google native sign-in call · Practice list &
objective detail · Exam runner (server timer + heartbeat) · Videos reel · Review &
results · offline banner (netinfo) · Query persistence · Sentry · Maestro E2E flows.
