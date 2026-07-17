# Backend stubs — zziippee `/api/v1`

Drop-in starting point for the mobile API **inside the existing zziippee Laravel app**
(not a separate service — see doc 1 §1.4). Controllers are thin and delegate to the
Services already in the codebase. Copy these files into the zziippee repo under the
matching paths, then wire them up.

## Files

| Stub | Copy to | Notes |
|---|---|---|
| `routes/api_v1.php` | `routes/api_v1.php` | The v1 route table (Sanctum + `enrolled.api`) |
| `app/Http/Middleware/EnsureEnrolledApi.php` | same path | Token-auth version of the web `enrolled` gate |
| `app/Http/Controllers/Api/V1/AuthController.php` | same path | Sanctum token issuance (email, Google, verify) |
| `app/Http/Controllers/Api/V1/PracticeController.php` | same path | JSON mirror of `Learn\ObjectivesController` adaptive flow |

`CurriculumController`, `StudyController`, and `ExamController` are referenced by the
routes but left for you to add following the same delegate-to-Service pattern
(mirror `ObjectivesController@index`, `StudyNotesController`, `ExamsController`).
**PBQ endpoints are deliberately excluded** — PBQs are web/laptop-only (doc 07 §7.7).

## Wiring (Laravel 13 / bootstrap/app.php)

```php
// 1. Install Sanctum
//    composer require laravel/sanctum
// 2. User model:  use Laravel\Sanctum\HasApiTokens; (add the trait)

// 3. bootstrap/app.php
return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api_v1.php',   // <-- add
        apiPrefix: 'api/v1',                    // <-- v1 prefix
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            // ...existing aliases...
            'enrolled.api' => \App\Http\Middleware\EnsureEnrolledApi::class,  // <-- add
        ]);
        // Optional: define the `api` rate limiter in AppServiceProvider/boot.
    })
    ->create();
```

> The existing web `/api/*` routes (in `web.php`, session-guarded for Inertia) stay
> as they are — this new group lives at `/api/v1/*` and is token-guarded. No conflict.

## Definition of done (per doc 6 §6.5)

- Pest **feature tests**, including **parity tests**: the same answers posted to
  `PracticeController@answer` and to `ObjectivesController` must produce identical
  scores and mastery.
- `php artisan pint --test` and `./vendor/bin/phpstan` (level 6) clean.
- No PII/secrets in responses or logs; run gateway/PII through `PIIRedaction`.
- Regenerate/publish `docs/openapi/mobile-v1.yaml` if the shape changes; the mobile
  app types are generated from it.

## Not included here (by design)

- Payment/checkout endpoints — purchases stay on web (doc 1 §1.2).
- Realtime/Reverb — not needed for v1.
- Admin/content-authoring — out of mobile scope.
