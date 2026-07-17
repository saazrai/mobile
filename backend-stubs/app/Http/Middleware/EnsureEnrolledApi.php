<?php

namespace App\Http\Middleware;

use App\Models\Enrollment;
use App\Models\Product;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Token-auth equivalent of the web `enrolled` middleware. Guards /learn, /practice
 * and /exams so a mobile user can only reach content for a product they hold an
 * ACTIVE enrollment for. Mirrors the ownership checks in the Learn controllers.
 *
 * Resolves the {product} route param (slug) and 403s with a JSON envelope when the
 * authenticated user has no active enrollment. Reuse EnrollmentService here if you
 * have richer status logic (expiry grace, etc.) — kept inline for the stub.
 */
class EnsureEnrolledApi
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $product = $request->route('product');

        // Some routes (assessments/*) carry no {product} — ownership is enforced in
        // the controller against the assessment's user_id instead.
        if ($product === null) {
            return $next($request);
        }

        if (! $product instanceof Product) {
            $product = Product::where('slug', $product)->firstOrFail();
        }

        $enrolled = Enrollment::query()
            ->where('user_id', $user->id)
            ->where('product_id', $product->id)
            ->where('status', 'active')
            ->when(true, fn ($q) => $q->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            }))
            ->exists();

        if (! $enrolled) {
            return response()->json([
                'message' => 'You are not enrolled in this course.',
                'code' => 'not_enrolled',
            ], 403);
        }

        return $next($request);
    }
}
