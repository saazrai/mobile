# zziippee Mobile — Architecture & Design Package

*Prepared as: Mobile App Architect + Product Manager · 2026-07-17*

This folder contains the recommendation, architecture, API contract, mobile app
design, UI/UX spec, and delivery roadmap for building **native iOS and Android
apps** for the zziippee / SaazAcademy learning platform. Each document is
self-contained so backend, mobile, and design workstreams can proceed in parallel.

## The one-paragraph summary

The zziippee web app is a Laravel 13 + Vue 3 **Inertia.js monolith**. Inertia
serves server-rendered HTML-over-the-wire with **session/cookie auth**, so its
pages and most of its endpoints **cannot be consumed by a native app as-is**. The
recommended solution is to add a **new versioned, token-authenticated JSON API
(`/api/v1`, Laravel Sanctum)** to the existing backend that **reuses the domain
Services already in place** (adaptive practice, learner proficiency, exam engines,
enrollment), and to build a **single React Native + Expo (TypeScript)** codebase
that ships to both App Store and Play Store. Purchases remain on the web to avoid
app-store commission and policy friction. v1 delivers **login, course/enrollment
list, adaptive practice quizzes, domain tests, exam simulations, review, and study
content (notes, flashcards, videos)** with an online-first, lightly-cached data layer.

## Decisions (agreed with stakeholder)

| Decision | Choice |
|---|---|
| v1 scope | Login + Practice (adaptive quiz, domain test, exam sim, review) + Study content (notes, flashcards, videos). **Purchases stay on web.** |
| Client framework | **React Native + Expo (TypeScript)** — one codebase, reuses TS skillset |
| Offline | **Online-first** with light caching; full offline is a later phase |
| Backend | **Add new `/api/v1`** (Sanctum) reusing existing Laravel Services |

## Document index

| # | Document | For whom |
|---|---|---|
| 1 | [Solution Recommendation](docs/01-solution-recommendation.md) | Stakeholders / PM — why this approach, alternatives, risks |
| 2 | [System Architecture](docs/02-architecture.md) | Architects / backend — diagrams: context, containers, auth, practice flow, data model |
| 3 | [Mobile API Contract](docs/03-api-contract.md) | Backend team — every `/api/v1` endpoint mobile needs, mapped to existing Services |
| 4 | [Mobile App Design](docs/04-mobile-app-design.md) | Mobile team — RN/Expo structure, navigation, state, caching, offline posture |
| 5 | [UI/UX Specification](docs/05-uiux-spec.md) | Design + mobile — screen inventory, flows, design system, components |
| 6 | [Delivery Roadmap](docs/06-roadmap.md) | PM / leads — phases, milestones, effort, team, risks |
| 7 | [Gesture-First UX](docs/07-gesture-ux.md) | Design + mobile — Instagram-style reels/decks, gesture language, floating translucent nav, motion/haptics; **PBQs excluded (web-only)** |

## Buildable artifacts (start here to code)

| Path | What it is |
|---|---|
| [`docs/openapi/mobile-v1.yaml`](docs/openapi/mobile-v1.yaml) | **OpenAPI 3.1 contract** for `/api/v1` — the shared source of truth. Mock it (`prism mock`) and generate types from it. |
| [`zziippee-mobile/`](zziippee-mobile/) | **Runnable Expo app** (RN + TS) — Apple-grade design system (iOS tokens, SF ramp, grouped lists, cinematic posters), auth gate, token vault, TanStack Query, and screens (Login, Home, Course, Quiz, Account, Flashcards, Study Notes). Ships a **zero-dependency mock API** so it runs with no backend — see [`RUNBOOK.md`](zziippee-mobile/RUNBOOK.md). |
| [`backend-stubs/`](backend-stubs/) | **Laravel `/api/v1` stubs** — routes, `EnsureEnrolledApi` middleware, `AuthController` (Sanctum), and `PracticeController` (JSON mirror of the adaptive engine). Copy into the zziippee repo; see its README. |
| [`design/uiux-mockup.html`](design/uiux-mockup.html) | Visual UI/UX mockup — gesture-first, floating translucent nav (also published as an Artifact — link in chat). |

A visual **UI/UX mockup** (interactive HTML) is published separately as an Artifact —
see the link shared in chat, or `design/uiux-mockup.html`.

## How the three workstreams run in parallel

```
Backend API team ──► builds /api/v1 (doc 3) against a published OpenAPI contract
Mobile app team  ──► builds RN/Expo app (doc 4) against a mock server of the same contract
Design team      ──► delivers Figma from the UI/UX spec (doc 5) + mockup
```

The **API contract (doc 3) is the shared source of truth** that decouples the three
teams. Publish it as OpenAPI first; everything else keys off it.
