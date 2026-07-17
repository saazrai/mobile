# 2 · System Architecture

Diagrams are in Mermaid so they render on GitHub and in most IDEs. They cover:
system context, containers, the auth/token sequence, the adaptive-practice
sequence, and the slice of the domain model the mobile app touches.

## 2.1 System context

```mermaid
graph TB
    subgraph Users
        L[Learner<br/>iOS / Android]
        W[Learner / Admin<br/>Web browser]
    end

    subgraph "zziippee Laravel Monolith (Laravel Cloud)"
        WEB[Inertia + Vue Web App<br/>session/cookie auth]
        API[/api/v1 Mobile API<br/>Sanctum token auth/]
        SVC[Domain Services<br/>Adaptive · Proficiency · Exam · Enrollment · Order]
        DB[(PostgreSQL)]
        RVB[Reverb WebSockets]
    end

    subgraph "External"
        G[Google OAuth]
        BREVO[Brevo email]
        PAY[Razorpay / Stripe]
        DRIVE[Google Drive/Sheets<br/>content source]
    end

    L -->|HTTPS JSON| API
    L -.->|opens web checkout| WEB
    W -->|HTTPS Inertia| WEB
    API --> SVC
    WEB --> SVC
    SVC --> DB
    API -.->|verify id_token| G
    API -.->|send codes| BREVO
    WEB -->|checkout| PAY
    SVC -.-> DRIVE
    WEB -.-> RVB

    classDef new fill:#dbeafe,stroke:#2563eb,stroke-width:2px;
    class API,L new
```

**Blue = new work.** The mobile app and the `/api/v1` layer are the only new
components; everything else already exists. Purchases are intentionally routed to
the existing web checkout (deep-link out), not re-implemented natively.

## 2.2 Container / layer view

```mermaid
graph LR
    subgraph "React Native + Expo App"
        UI[Screens & Components]
        NAV[Expo Router]
        Q[TanStack Query<br/>server cache]
        Z[Zustand<br/>UI/session state]
        SEC[Expo SecureStore<br/>token vault]
        APIC[API client<br/>axios + interceptors]
        UI --> NAV --> Q --> APIC
        UI --> Z
        APIC --> SEC
    end

    APIC -->|Bearer token| GW

    subgraph "Backend /api/v1"
        GW[Route group<br/>auth:sanctum + throttle]
        MW[Middleware<br/>EnsureEnrolledApi · verified]
        CTRL[Api\\V1 Controllers<br/>thin]
        RES[JSON Resources<br/>ApiResponse envelope]
        GW --> MW --> CTRL --> RES
    end

    CTRL --> SVCS

    subgraph "Reused Domain Services (unchanged)"
        SVCS[AdaptivePracticeService<br/>LearnerProficiencyService<br/>ExamEngineFactory → Engines<br/>EnrollmentService · OrderService]
    end

    SVCS --> MODELS[(Eloquent Models<br/>Assessment · Question · Enrollment · ...)]
```

Key principle: **controllers stay thin, business logic is not duplicated.** The API
controllers call the very same Services the Inertia controllers already use, so
scoring and adaptivity behave identically on web and mobile.

## 2.3 Authentication & token lifecycle

Mobile uses **Laravel Sanctum personal access tokens** (Bearer), not cookies. Three
entry paths — email/password, Google, and the existing email-code verification —
all converge on "issue a Sanctum token."

```mermaid
sequenceDiagram
    participant App as Mobile App
    participant API as /api/v1
    participant G as Google
    participant DB as PostgreSQL
    participant Store as SecureStore

    rect rgb(235,244,255)
    note over App,DB: Email + password
    App->>API: POST /auth/login {email, password, device_name}
    API->>DB: verify credentials
    API-->>App: 200 {token, user, enrollments[]}
    App->>Store: save token (Keychain/Keystore)
    end

    rect rgb(235,255,240)
    note over App,G: Google (native SDK)
    App->>G: native Google Sign-In
    G-->>App: id_token
    App->>API: POST /auth/social/google {id_token, device_name}
    API->>G: verify id_token signature/aud
    API->>DB: find-or-create user + link
    API-->>App: 200 {token, user}
    end

    note over App,API: All later calls
    App->>API: GET /learn/... (Authorization: Bearer <token>)
    API->>API: auth:sanctum → resolve user
    API-->>App: 200 JSON

    note over App,API: Logout
    App->>API: POST /auth/logout
    API->>DB: revoke current token
    App->>Store: clear token
```

- **Email verification** reuses the existing code-based flow, re-exposed under
  `/api/v1/auth/email/*` returning JSON. `verified` middleware still gates practice.
- **Token storage:** `expo-secure-store` (iOS Keychain / Android Keystore). Never
  AsyncStorage for tokens.
- **401 handling:** an axios response interceptor clears the token and routes to
  Login on `401`.
- **Refresh strategy (v1):** long-lived token + re-login on expiry/`401` (simple).
  A refresh-token pair can be added later without changing app screens.

## 2.4 Adaptive practice — request sequence

This is the core learning loop. It mirrors `ObjectivesController` +
`AdaptivePracticeService`, but stateless-per-request over JSON.

```mermaid
sequenceDiagram
    participant App
    participant API as /api/v1
    participant AP as AdaptivePracticeService
    participant LP as LearnerProficiencyService
    participant DB as PostgreSQL

    App->>API: POST /practice/objectives/{objective}/start
    API->>AP: computeBounds + firstQuestion
    API->>DB: create Assessment(status=in_progress, metadata: adaptive)
    API-->>App: {assessment_id, question, progress{answered,estimatedTotal,difficulty}}

    loop each question
        App->>App: learner selects option(s)
        App->>API: POST /assessments/{id}/answer {question_id, selected_options, elapsed}
        API->>DB: upsert AssessmentResponse (is_correct computed server-side)
        API->>AP: isDone? nextQuestion(difficulty adjusts by correctness)
        alt not done
            API-->>App: {is_correct, is_done:false, next_question, correct_options, justifications, progress}
        else done
            API->>AP: computeMastery
            API->>DB: Assessment → completed (score, mastery)
            API->>LP: recomputeForObjective(mastery, score)
            API-->>App: {is_correct, is_done:true, mastery, review_url}
        end
    end

    App->>API: GET /assessments/{id}/review
    API-->>App: {questions[], selected, correct, justifications, mastery, difficulty_history}
```

Notes reflecting the real engine:
- **Correctness, difficulty selection, mastery, and scoring are decided
  server-side** — the app never trusts client scoring. The app renders the returned
  `correct_options` + `justifications` *after* submit (same reveal rule as web).
- **Option order is shuffled deterministically server-side** (`OptionShuffler`), so
  the app just renders the options array it receives.
- **Pause/resume:** `POST /assessments/{id}/pause` snapshots elapsed time; reopening
  `GET /assessments/{id}` resumes with the current question and accumulated time.
- **Domain tests** follow the same shape under `/practice/domains/{domain}/...`.

## 2.5 Exam simulation flow

Exam sims use the `ExamEngineFactory` (policy from `ExamSetting`): `linear_locked`
→ `SimulationEngine` (no back-nav, timed), else `LinearPracticeEngine`.

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> InProgress: POST /exams/{examSetting}/start
    InProgress --> InProgress: POST /exams/{id}/submit-answer
    InProgress --> InProgress: POST /exams/{id}/heartbeat (keepalive + server timer)
    InProgress --> Paused: POST /exams/{id}/pause
    Paused --> InProgress: GET /exams/{id}/resume
    InProgress --> Completed: POST /exams/{id}/end (or timer expiry)
    Completed --> Review: GET /exams/{id}/results & /review
    Review --> [*]
```

- The **server owns the timer** (heartbeat + `started_at`), so closing the app can't
  cheat the clock; the app shows a countdown synced from server time.
- Exam Assessments use **UUID** ids (web routes already `whereUuid`).

## 2.6 Domain model — the slice mobile touches

```mermaid
erDiagram
    USER ||--o{ ENROLLMENT : has
    PRODUCT ||--|| COURSE : "wraps"
    ENROLLMENT }o--|| PRODUCT : "grants access to"
    COURSE ||--o{ DOMAIN : contains
    DOMAIN ||--o{ OBJECTIVE : contains
    OBJECTIVE ||--o{ TOPIC : contains
    TOPIC ||--o{ CONCEPT : contains
    QUESTION }o--o{ OBJECTIVE : "mapped via curriculum"
    USER ||--o{ ASSESSMENT : takes
    ASSESSMENT ||--o{ ASSESSMENT_RESPONSE : records
    ASSESSMENT }o--|| PRODUCT : "scoped to"
    QUESTION ||--o{ ASSESSMENT_RESPONSE : "answered in"
    COURSE ||--o{ EXAM_SETTING : "defines sims"

    ENROLLMENT {
        int user_id
        int product_id
        string status
        datetime expires_at
    }
    ASSESSMENT {
        uuid id
        string type "objective|domain|exam"
        string status "in_progress|paused|completed"
        int score
        json metadata "adaptive state, question_ids"
    }
    QUESTION {
        int id
        text content
        json options
        json correct_options
        json justifications
        int difficulty_id
    }
```

**Access rule that the API must enforce (as web does):** a learner may only reach
`learn/practice/exam` data for a `product` they hold an **active `Enrollment`** for
(`EnsureEnrolledApi`), and may only read/write their **own** Assessments
(`user_id === auth id`). These are exactly the checks in the current controllers.

## 2.7 Cross-cutting concerns

| Concern | Approach on mobile / API |
|---|---|
| **Caching** | Online-first. TanStack Query caches GET responses (course tree, study notes, flashcards). Practice mutations always hit network. See doc 4. |
| **Rate limiting** | Reuse named throttles (`throttle:pbq-submit`, exam throttles); add `throttle:api` per token. |
| **Errors** | Uniform `ApiResponse` envelope + HTTP status; app maps to typed error UI. |
| **Content sanitization** | Question/notes HTML sanitized server-side; app renders via vetted markdown/HTML view. |
| **Observability** | Structured logs via existing `LoggingService`; app crash/analytics via Expo (Sentry). |
| **Versioning** | Path-versioned `/api/v1`; additive changes only within a version. |
| **Realtime (later)** | Reverb exists; not needed for v1. Push via Expo Notifications for reminders/streaks in a fast-follow. |
