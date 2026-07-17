# 10 · Auth & Account Spec

Covers doc 05's screens A (Splash), B (Login), C (Register), D (Verify email),
plus S (Profile/Settings)'s account-management actions. Verified against
`/Users/saaz/Projects/zziippee` (file:line cited). Builds on and corrects doc
03 §3.1 and doc 09 §9.1.

## 10.1 Verified findings

- **Sanctum confirmed absent** — no `HasApiTokens`, absent from
  `composer.json`/`composer.lock` (doc 09 §9.1, re-confirmed here). All work
  below is net-new.
- **Registration order is inverted from the typical assumption.**
  `RegisteredUserController::store` (`app/Http/Controllers/Auth/RegisteredUserController.php:33-67`)
  requires `Cache::get("temp_registration_data_{$email}")['email_verified'] === true`
  **before** it will create the account — i.e. email verification happens
  *before* registration, not after. The account is created already
  `email_verified_at => now()`, and the user is auto-logged-in
  (`Auth::login($user)`). The mobile flow must be: send code → verify code →
  *then* register (name/password) → token issued — not register-then-verify.
- **Login** (`AuthenticatedSessionController.php:30-37`,
  `app/Http/Requests/Auth/LoginRequest.php:28-84`): validates `email`,
  `password` only. `remember` is read as an unvalidated boolean
  (`$this->boolean('remember')`) — mobile can pass it or omit it. Rate
  limited: 5 attempts per `email|ip` key, `ValidationException` with
  `seconds`/`minutes` in the message on lockout — surface this as a specific
  "too many attempts, try again in Xm" error, not a generic one.
- **User model** (`app/Models/User.php`): fillable fields include
  `google_id`, `avatar`, `ui_preferences` (JSON, cast `array`), `is_active`,
  `last_login_at`, `login_count` — richer than doc 03 assumed. **Roles are
  real**, via Spatie `spatie/permission` (`HasRoles` trait) — not a stub
  field. **No `UserResource` exists anywhere** — the JSON user shape for
  mobile needs to be built from scratch, and should probably include
  `ui_preferences` (dark mode lives here, see §10.1 Profile below) since the
  mobile app needs it for theme sync.
- **Email verification code flow**
  (`EmailVerificationController.php:20-146`): 4-digit code
  (`str_pad(random_int(0,9999),4,'0',STR_PAD_LEFT)`), cached 10 minutes at
  `email_verification_code_{email}` (just the code, no attempt-count stored
  alongside), rate limited 3 sends per 60s. Verifying flips a cached
  `email_verified` flag, not the user's `email_verified_at` (that happens
  later, at registration). **Inconsistency to know about:** `changeEmail`
  (`:170-195`, an authenticated settings action) uses Laravel's *default
  signed-link email notification* instead of this 4-digit code flow — two
  different verification UX patterns exist in the same app depending on
  context. Mobile's "change email" screen (if built) needs deep-link
  handling for a signed URL, not a code input, unless that's changed
  backend-side to match.
- **Password reset is link-based, not code-based**
  (`PasswordResetLinkController`/`NewPasswordController`): standard Laravel
  `Password::sendResetLink()`/`Password::reset()` — a signed URL emailed to
  the user, meant to be clicked in a browser. This doesn't translate to
  mobile without either (a) a deep link back into the app
  (`zziippee://reset?token=...&email=...`, doc 04 §4.7 already anticipates
  this) or (b) adding a code-based alternative server-side to match the
  verification flow's UX. Recommend (a) — no backend change needed, just
  correct deep-link handling.
- **Account deletion anonymizes, does not delete.**
  `PrivacyController::deleteData` (`app/Http/Controllers/Legal/PrivacyController.php:164-190`)
  requires `password` (current-password check) + `confirmation === 'DELETE'`
  (typed confirmation string), then calls
  `DataAnonymizationService::anonymizeUser()` — not a hard or soft delete.
  Mobile's delete-account screen copy should say "anonymize"/reflect this
  accurately, not promise data removal it doesn't perform. Also present:
  `exportData()` (GDPR JSON export) and `getConsentStatus()`/
  `updateSettings()`/`storeCookiePreferences()` for consent management — a
  fuller privacy-settings surface than doc 05's screen S sketch assumed.
- **Dark mode / UI prefs already exist server-side**, just not where expected:
  `ProfilePreferencesController` (`app/Http/Controllers/Api/ProfilePreferencesController.php`)
  manages `theme` (`light|dark`), `admin_theme`, `sidebar_collapsed`,
  `font_size` (`small|medium|large`), `animations_enabled` — stored in
  `User.ui_preferences`. Mobile's dark-mode toggle (doc 05 §5.2 mentions
  "respect system" — this is more than that, it's a persisted user
  preference) should read/write this, not just follow `useColorScheme()`
  locally.
- **Logout is pure session invalidation**
  (`AuthenticatedSessionController::destroy:42-50`) — no token revocation
  logic exists to reuse (expected, since Sanctum doesn't exist yet); the
  mobile logout endpoint will be new code (`$user->currentAccessToken()->delete()`)
  following standard Sanctum patterns, not adapted from here.
- **Google sign-in gap** (doc 09 §9.1, re-confirmed): `SocialAuthController`
  only has `redirect()`/`callback()` for server-driven OAuth — no
  `id_token`-verification method exists. New code required.

## 10.2 Proposed API surface

Supersedes doc 03 §3.1's table for the affected rows.

| Method | Path | Body → Returns | Notes |
|---|---|---|---|
| POST | `/auth/email/send-code` | `{email, consent}` → `202` | Rate limited 3/60s. `consent` is required (`required\|accepted`) — doc 03 didn't have this field. |
| POST | `/auth/email/verify-code` | `{email, verification_code}` → `{verified:true}` | 4-digit code, 10 min expiry. |
| POST | `/auth/register` | `{name, email, password, password_confirmation, device_name}` → `{token, user}` | **Requires a prior successful `verify-code` call for this email** (checked server-side via cache) — register will 422 otherwise. Auto-issues a Sanctum token on success (mirrors `Auth::login()`'s auto-login). |
| POST | `/auth/login` | `{email, password, device_name, remember?}` → `{token, user, enrollments[]}` | 5 attempts/`email\|ip` rate limit; surface the lockout `seconds`/`minutes` in the UI. |
| POST | `/auth/social/google` | `{id_token, device_name}` → `{token, user}` | **New code required** — no verification path exists today (§10.1). |
| POST | `/auth/forgot-password` | `{email}` → `202` | Sends the existing signed-link email; mobile handles the resulting link via deep link (`zziippee://reset?...`), does **not** get a code to type in. |
| GET | `/auth/me` | → `{user, roles, verified, ui_preferences}` | New endpoint — nothing like it exists today. `roles` is real (Spatie), safe to expose as `roles->pluck('name')`. |
| POST | `/auth/logout` | → revokes current token | New Sanctum-standard code, not adapted from the web logout. |
| GET/PATCH | `/account/preferences` | `{theme, font_size, animations_enabled, ...}` | Thin wrapper over `ProfilePreferencesController` — real, already does exactly this for the web app's own AJAX calls. |
| DELETE | `/account` | `{password, confirmation: "DELETE"}` → anonymizes | Thin wrapper over `PrivacyController::deleteData` — **copy must say "anonymize," not "delete"** (§10.1). |
| GET | `/account/export` | → GDPR data export | Thin wrapper over `PrivacyController::exportData`. |

## 10.3 Mobile UX notes (corrects doc 05 screens B–D, S)

- **Screen C (Register) must follow D (Verify email), not the reverse.** Doc
  05's screen inventory lists them in visual/flow order without specifying
  which gates which; the real backend requires verify-then-register. Build
  the flow as: enter email → send code → enter code → verify → *then* show
  the name/password form → register (which auto-issues the token, no
  separate login step needed after).
- **Screen S (Profile/Settings)** needs three sections doc 05 didn't fully
  anticipate: a dark-mode toggle that's a *server-synced preference*
  (`ui_preferences.theme`), not just local `useColorScheme()`; a GDPR data
  export action; and delete-account copy that accurately describes
  anonymization rather than deletion.
- **Password reset** should be a "check your email" screen plus deep-link
  handling (`zziippee://reset?token=...`), not an in-app code-entry screen —
  the backend doesn't support the latter for this specific flow (unlike email
  verification, which does).

## 10.4 Corrections to existing docs

| Doc | Claim | Reality |
|---|---|---|
| 03 §3.1 | `/auth/register` implies register-then-verify is possible | Backend requires verify-then-register; register 422s without a prior verified email in cache |
| 03 §3.1 | `PrivacyController@deleteAccount` ("mirror web") | Method is `deleteData`, and it anonymizes, not deletes — copy/UX must reflect this |
| 03 §3.1 | `/auth/social/google` reuses `SocialAuthController` + Socialite `userFromToken` | No such method/path exists; new code required (already corrected once in doc 09, re-confirmed here) |
| 05 §5.3 (screens B/C/D) | Screens listed without explicit gating order | Register cannot happen before email verification succeeds — this is a hard backend constraint, not a UX choice |
| 05 §5.2/§5.3 (screen S) | Dark mode as a system-respecting local setting | A real server-synced preference already exists (`ui_preferences.theme`) and should be used instead of a purely local toggle |
