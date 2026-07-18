# RUNBOOK — get SecureStart running on a simulator

Goal: see the real app — SF type, grouped lists, cinematic Home, swipe gestures —
running against the bundled mock API, with **no Laravel backend required**.

## Prerequisites (one-time)

- **Node 20+** and npm.
- **iOS**: Xcode + a simulator (macOS). **Android**: Android Studio + an emulator.
- **Expo Go** app (from the App Store / Play Store) if you'd rather run on your
  physical phone. All native modules used here (secure-store, gesture-handler,
  reanimated, svg, blur, haptics, linear-gradient) ship in Expo Go — no custom dev
  build needed for v1.

## Run it (two terminals)

```bash
cd zziippee-mobile
npm install                      # pulls Expo SDK 52, RN 0.76, and all deps

# terminal 1 — the mock API (realistic content + stateful practice flow)
npm run mock                     # → http://localhost:4010/api/v1

# terminal 2 — the app
npx expo start                   # then press  i (iOS)  or  a (Android)
```

Log in with **any** email/password — the mock accepts anything and returns a token.
Then: Home → tap a course → **Practice** → answer a few questions (watch the adaptive
loop + reveal), back out → **Flashcards** (swipe → / ← ) and **Study notes** (swipe ↕).

## Pointing the app at the API

`app.config.ts` reads `API_BASE_URL` (Expo auto-loads `.env`). Default is the mock on
localhost. Override per environment:

| Target | `API_BASE_URL` |
|---|---|
| iOS simulator → mock | `http://localhost:4010/api/v1` (default) |
| Android emulator → mock | `http://10.0.2.2:4010/api/v1` |
| Physical phone (Expo Go) → mock | `http://<YOUR-LAN-IP>:4010/api/v1` |
| UAT backend | `https://zziippee.laravel.cloud/api/v1` |

```bash
cp .env.example .env             # then edit API_BASE_URL for your setup
```

Find your LAN IP: `ipconfig getifaddr en0` (macOS). Phone and Mac must share Wi-Fi.

## Switch to the real backend

When `/api/v1` exists on the Laravel side (see `../backend-stubs/`), set
`API_BASE_URL` to UAT and regenerate types:

```bash
npm run api:types                # generates src/api/generated/schema.ts from OpenAPI
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| App can't reach API on Android emulator | Use `10.0.2.2`, not `localhost` |
| App can't reach API on a real device | Use your Mac's LAN IP; same Wi-Fi; firewall allows port 4010 |
| Reanimated / worklets error on start | Ensure `react-native-worklets/plugin` is **last** in `babel.config.js` (it is) and `react-native-worklets` is installed, then `npx expo start -c` |
| Blank screen after login | Check terminal 1 — the mock logs each request; a 404 line names the missing route |
| Type errors | `npm run typecheck` — version pins are current-stable; bump any that drift |

## What the mock covers

`mock/server.mjs` (zero dependencies) implements: auth (login/register/google/me/logout),
`/dashboard`, `/enrollments`, `/learn/:product` (+ domains, flashcards, study-notes,
videos), and the **stateful** practice flow (`/practice/objectives/:o/start`,
`/assessments/:id`, `/assessments/:id/answer` with real adaptive advance + scoring).
Content is genuine Security+ (SY0-701) material so the screens look real in demos.
