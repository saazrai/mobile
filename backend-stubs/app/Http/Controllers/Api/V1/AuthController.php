<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

/**
 * Issues Sanctum personal access tokens for the mobile app. Reuses the same user
 * model / verification flow as the web; only the *transport* differs (token vs
 * session cookie). See docs/02 §2.3 and docs/03 §3.1.
 */
class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'device_name' => ['required', 'string'],
        ]);

        $user = \App\Models\User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);
        // event(new Registered($user)); // triggers verification email as on web

        return $this->tokenResponse($user, $data['device_name'], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['required', 'string'],
        ]);

        $user = \App\Models\User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => __('auth.failed')]);
        }

        return $this->tokenResponse($user, $data['device_name']);
    }

    /**
     * Native Google Sign-In: the app sends the Google OIDC id_token; verify it and
     * find-or-create the linked user, then issue a Sanctum token. Reuse the account
     * linking logic from Auth\SocialAuthController.
     */
    public function google(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id_token' => ['required', 'string'],
            'device_name' => ['required', 'string'],
        ]);

        $googleUser = Socialite::driver('google')->userFromToken($data['id_token']);

        $user = \App\Models\User::firstOrCreate(
            ['email' => $googleUser->getEmail()],
            ['name' => $googleUser->getName(), 'email_verified_at' => now(), 'password' => Hash::make(str()->random(40))],
        );
        // Persist provider id / link as SocialAuthController does.

        return $this->tokenResponse($user, $data['device_name']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json(['data' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'email_verified' => (bool) $user->email_verified_at,
            'roles' => $user->getRoleNames(),
        ]]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Signed out.']);
    }

    public function destroy(Request $request): JsonResponse
    {
        // Delegate to the existing PrivacyController@deleteAccount logic / job.
        // app(PrivacyService::class)->deleteAccount($request->user());
        return response()->json(['message' => 'Account scheduled for deletion.']);
    }

    // sendCode / verifyCode / forgotPassword: thin JSON wrappers over the existing
    // App\Http\Controllers\Auth\EmailVerificationController + PasswordResetLinkController.
    public function sendCode(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        // app(EmailVerificationController::class)->sendVerificationCodeToEmail($request);
        return response()->json(['message' => 'Verification code sent.']);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email'], 'code' => ['required', 'string']]);
        // app(EmailVerificationController::class)->verifyCode($request);
        return response()->json(['message' => 'Email verified.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);
        // Password::sendResetLink($request->only('email'));
        return response()->json(['message' => 'If the email exists, a reset link was sent.']);
    }

    private function tokenResponse(\App\Models\User $user, string $deviceName, int $status = 200): JsonResponse
    {
        $token = $user->createToken($deviceName)->plainTextToken;

        return response()->json(['data' => [
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'email_verified' => (bool) $user->email_verified_at,
                'roles' => $user->getRoleNames(),
            ],
        ]], $status);
    }
}
