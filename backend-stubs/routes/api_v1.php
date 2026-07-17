<?php

/**
 * Mobile API v1 — DROP-IN STUB for the zziippee Laravel app.
 *
 * Install:
 *  1) composer require laravel/sanctum
 *  2) Add `use Laravel\Sanctum\HasApiTokens;` to App\Models\User.
 *  3) Register this file in bootstrap/app.php (see ../bootstrap-snippet.php):
 *         ->withRouting(api: __DIR__.'/../routes/api_v1.php', apiPrefix: 'api/v1')
 *     (or Route::prefix('api/v1')->group(base_path('routes/api_v1.php')) )
 *  4) Register the `enrolled.api` alias → EnsureEnrolledApi middleware.
 *
 * Controllers here are THIN and delegate to existing Services (AdaptivePractice,
 * LearnerProficiency, Enrollment). See docs/03-api-contract.md for the full surface.
 * PBQ endpoints are intentionally omitted — PBQs are web/laptop-only (docs/07 §7.7).
 */

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CurriculumController;
use App\Http\Controllers\Api\V1\PracticeController;
use App\Http\Controllers\Api\V1\StudyController;
use App\Http\Middleware\EnsureEnrolledApi;
use Illuminate\Support\Facades\Route;

// ---- Public auth (no token) ----
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('auth/social/google', [AuthController::class, 'google'])->middleware('throttle:10,1');
Route::post('auth/email/send-code', [AuthController::class, 'sendCode'])->middleware('throttle:3,1');
Route::post('auth/email/verify-code', [AuthController::class, 'verifyCode'])->middleware('throttle:5,1');
Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:3,1');

// ---- Authenticated (Sanctum token) ----
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::delete('account', [AuthController::class, 'destroy']);

    // Home / enrollments
    Route::get('enrollments', [CurriculumController::class, 'enrollments']);
    Route::get('dashboard', [CurriculumController::class, 'dashboard']);

    // Practice — assessment lifecycle (generic; objective or domain)
    Route::post('practice/objectives/{objective}/start', [PracticeController::class, 'startObjective'])
        ->middleware('enrolled.api');
    Route::post('practice/domains/{domain}/start', [PracticeController::class, 'startDomain'])
        ->middleware('enrolled.api');
    Route::get('assessments/{assessment}', [PracticeController::class, 'show'])->whereUuid('assessment');
    Route::post('assessments/{assessment}/answer', [PracticeController::class, 'answer'])
        ->whereUuid('assessment')->middleware('throttle:90,1');
    Route::post('assessments/{assessment}/pause', [PracticeController::class, 'pause'])->whereUuid('assessment');
    Route::get('assessments/{assessment}/review', [PracticeController::class, 'review'])->whereUuid('assessment');

    // Enrollment-gated learn surfaces
    Route::middleware('enrolled.api')->group(function () {
        Route::get('learn/{product}', [CurriculumController::class, 'courseHome']);
        Route::get('learn/{product}/domains', [CurriculumController::class, 'domains']);
        Route::get('learn/{product}/objectives/{objective}', [CurriculumController::class, 'objective']);

        // Study content (rendered as gesture-driven reels on mobile)
        Route::get('learn/{product}/study-notes', [StudyController::class, 'topics']);
        Route::get('learn/{product}/study-notes/{topicSlug}', [StudyController::class, 'note']);
        Route::get('learn/{product}/flashcards', [StudyController::class, 'flashcards']);
        Route::get('learn/{product}/videos', [StudyController::class, 'videos']);

        // Exams (UUID assessments) — controller stub not included; mirror ExamsController.
        // Route::get('learn/{product}/exams', [ExamController::class, 'index']);
        // Route::post('exams/{examSetting}/start', [ExamController::class, 'start']);
        // ... submit-answer / heartbeat / pause / end / results / review
    });
});
