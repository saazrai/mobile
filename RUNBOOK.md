# RUNBOOK — get SecureStart running on a simulator

Goal: see the real app — SF type, grouped lists, cinematic Home, swipe gestures —
running against a real zziippee `/api/v1` backend.

## Prerequisites (one-time)

- **Node 20+** and npm.
- **iOS**: Xcode + a simulator (macOS). **Android**: Android Studio + an emulator.
- **Expo Go** app (from the App Store / Play Store) if you'd rather run on your
  physical phone. All native modules used here (secure-store, gesture-handler,
  reanimated, svg, blur, haptics, linear-gradient) ship in Expo Go — no custom dev
  build needed for v1.
- A reachable zziippee backend: the UAT instance (`https://zziippee.laravel.cloud/api/v1`,
  no setup required) or a local Laravel dev instance.

## Run it

```bash
npm install                      # pulls Expo SDK 52, RN 0.76, and all deps
cp .env.example .env             # defaults to UAT — edit API_BASE_URL if pointing elsewhere
npx expo start                   # then press  i (iOS)  or  a (Android)
```

Log in with a real account on the backend you're pointed at. Then: Home → tap
a course → **Practice** → answer a few questions (watch the adaptive loop +
reveal), back out → **Flashcards** (swipe → / ← ) and **Study notes** (swipe ↕).

## Pointing the app at the API

`app.config.ts` reads `API_BASE_URL` (Expo auto-loads `.env`). Default is UAT.
Override per environment:

| Target | `API_BASE_URL` |
|---|---|
| UAT backend | `https://zziippee.laravel.cloud/api/v1` (default) |
| Production | `https://zziippee.com/api/v1` |
| Local Laravel dev, iOS simulator | `http://localhost:8000/api/v1` |
| Local Laravel dev, Android emulator | `http://10.0.2.2:8000/api/v1` |
| Local Laravel dev, physical phone (Expo Go) | `http://<YOUR-LAN-IP>:8000/api/v1` |

```bash
cp .env.example .env             # then edit API_BASE_URL for your setup
```

Find your LAN IP: `ipconfig getifaddr en0` (macOS). Phone and Mac must share Wi-Fi.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App can't reach a local backend on Android emulator | Use `10.0.2.2`, not `localhost` |
| App can't reach a local backend on a real device | Use your Mac's LAN IP; same Wi-Fi; firewall allows the port |
| Reanimated / worklets error on start | Ensure `react-native-worklets/plugin` is **last** in `babel.config.js` (it is) and `react-native-worklets` is installed, then `npx expo start -c` |
| Blank screen after login | Check the backend's logs for a failed/missing route |
| Type errors | `npm run typecheck` — version pins are current-stable; bump any that drift |
