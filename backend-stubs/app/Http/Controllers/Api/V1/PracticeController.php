<?php

namespace App\Http\Controllers\Api\V1;

use App\Exam\Support\OptionShuffler;
use App\Http\Controllers\Controller;
use App\Models\Assessment;
use App\Models\AssessmentResponse;
use App\Models\Objective;
use App\Models\Product;
use App\Models\Question;
use App\Services\AdaptivePracticeService;
use App\Services\LearnerProficiencyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * JSON mirror of the web Learn\ObjectivesController adaptive flow. Same Services,
 * same scoring — only the response shape differs (JSON vs Inertia). Correctness,
 * difficulty selection, mastery and scoring are decided SERVER-SIDE; the app renders
 * only what it receives. Ownership is enforced against $assessment->user_id.
 *
 * Add a Pest feature test asserting parity: identical answers must yield identical
 * scores/mastery here and in ObjectivesController.
 */
class PracticeController extends Controller
{
    public function __construct(
        private readonly AdaptivePracticeService $adaptive,
        private readonly LearnerProficiencyService $proficiency,
    ) {}

    public function startObjective(Request $request, Product $product, Objective $objective): JsonResponse
    {
        $bounds = $this->adaptive->computeBounds($objective);
        $first = $this->adaptive->firstQuestion($objective);

        abort_if($first === null, 422, 'No questions available for this objective yet.');

        $assessment = Assessment::create([
            'user_id' => $request->user()->id,
            'product_id' => $product->id,
            'type' => 'objective',
            'status' => 'in_progress',
            'total_questions' => $bounds['max'],
            'answered_questions' => 0,
            'correct_answers' => 0,
            'started_at' => now(),
            'metadata' => [
                'objective_id' => $objective->id,
                'objective_slug' => $objective->slug,
                'adaptive' => true,
                'current_question_id' => $first->id,
                'question_ids' => [],
                'current_difficulty' => (int) ($first->difficulty_id ?? 3),
                'difficulty_history' => [],
                'result_history' => [],
                'max_questions' => $bounds['max'],
                'min_questions' => $bounds['min'],
            ],
        ]);

        return $this->ok($this->statePayload($assessment, $first), 201);
    }

    public function show(Request $request, Assessment $assessment): JsonResponse
    {
        $this->authorizeOwner($request, $assessment);
        $meta = (array) $assessment->metadata;

        // Resume: snapshot accumulated time and reopen (mirrors ObjectivesController@quiz)
        if ($assessment->status === 'paused') {
            $assessment->update(['status' => 'in_progress', 'started_at' => now(), 'paused_at' => null]);
        }

        $question = Question::with('type:id,name')->find($meta['current_question_id'] ?? 0);

        return $this->ok($this->statePayload($assessment, $question));
    }

    public function answer(Request $request, Assessment $assessment): JsonResponse
    {
        $this->authorizeOwner($request, $assessment);
        abort_if($assessment->status === 'completed', 422, 'Assessment already completed.');

        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'selected_options' => ['present', 'array'],
            'question_elapsed_seconds' => ['nullable', 'integer', 'min:0'],
        ]);

        $question = Question::findOrFail($data['question_id']);
        $correct = $question->correct_options ?? [];
        $selected = $data['selected_options'];
        $isCorrect = ! empty($selected)
            && empty(array_diff($selected, $correct))
            && empty(array_diff($correct, $selected));

        AssessmentResponse::updateOrCreate(
            ['assessment_id' => $assessment->id, 'questionable_type' => Question::class, 'questionable_id' => $question->id],
            ['selected_options' => $selected, 'is_correct' => $isCorrect, 'answered_at' => now()],
        );

        $meta = (array) $assessment->metadata;
        abort_unless((int) ($meta['current_question_id'] ?? 0) === $question->id, 422);

        // Advance adaptive state (same math as ObjectivesController@processAdaptiveAnswer)
        $meta['question_ids'][] = $question->id;
        $meta['difficulty_history'][] = (int) ($question->difficulty_id ?? 3);
        $meta['result_history'][] = $isCorrect;

        $shuffled = OptionShuffler::shuffle($question->id, (array) $question->options, (array) $question->justifications);
        $reveal = [
            'is_correct' => $isCorrect,
            'correct_options' => $correct,
            'justifications' => $shuffled['justifications'],
        ];

        $done = $this->adaptive->isDone($meta);
        $next = $done ? null : $this->adaptive->nextQuestion($assessment->objective(), $meta, $isCorrect);
        $done = $done || $next === null;

        if ($done) {
            $mastery = $this->adaptive->computeMastery($meta);
            $answered = count($meta['question_ids']);
            $correctCount = count(array_filter($meta['result_history']));
            $score = $answered > 0 ? round($correctCount / $answered * 100, 2) : 0.0;
            $meta['current_question_id'] = null;

            $assessment->update([
                'status' => 'completed', 'answered_questions' => $answered, 'correct_answers' => $correctCount,
                'total_questions' => $answered, 'score' => $score, 'completed_at' => now(), 'metadata' => $meta,
            ]);
            $this->proficiency->recomputeForObjective(
                $request->user()->id, $assessment->product_id, $meta['objective_id'], $mastery['level'], (string) $assessment->id, $score,
            );

            return $this->ok($reveal + [
                'is_done' => true,
                'mastery' => $mastery,
                'progress' => $this->progress($meta),
                'review_url' => null,
            ]);
        }

        $meta['current_question_id'] = $next->id;
        $meta['current_difficulty'] = (int) ($next->difficulty_id ?? 3);
        $assessment->update(['metadata' => $meta]);

        return $this->ok($reveal + [
            'is_done' => false,
            'next_question' => $this->questionPayload($next),
            'progress' => $this->progress($meta),
            'mastery' => null,
        ]);
    }

    public function pause(Request $request, Assessment $assessment): JsonResponse
    {
        $this->authorizeOwner($request, $assessment);
        $assessment->update([
            'status' => 'paused',
            'duration_seconds' => max(0, (int) $request->integer('elapsed_seconds')),
            'paused_at' => now(),
        ]);

        return $this->ok(['paused' => true]);
    }

    public function review(Request $request, Assessment $assessment): JsonResponse
    {
        $this->authorizeOwner($request, $assessment);
        // Build per-question review as ObjectivesController@review does; omitted for brevity.
        return $this->ok(['assessment' => ['id' => $assessment->id, 'score' => $assessment->score], 'questions' => []]);
    }

    // ---- helpers ----
    private function authorizeOwner(Request $request, Assessment $assessment): void
    {
        abort_if((int) $assessment->user_id !== (int) $request->user()->id, 403);
    }

    private function statePayload(Assessment $assessment, ?Question $question): array
    {
        $meta = (array) $assessment->metadata;

        return [
            'assessment_id' => $assessment->id,
            'kind' => $assessment->type,
            'status' => $assessment->status,
            'elapsed_seconds' => (int) $assessment->duration_seconds,
            'question' => $question ? $this->questionPayload($question) : null,
            'progress' => $this->progress($meta),
        ];
    }

    private function questionPayload(Question $q): array
    {
        $shuffled = OptionShuffler::shuffle($q->id, (array) $q->options, (array) $q->justifications);

        return [
            'id' => $q->id,
            'content' => $q->content,
            'type' => $q->type ? ['id' => $q->type->id, 'name' => $q->type->name] : null,
            'options' => $shuffled['options'],
            'expected_selection_count' => max(1, count((array) $q->correct_options)),
            'difficulty_id' => (int) ($q->difficulty_id ?? 3),
        ];
    }

    private function progress(array $meta): array
    {
        return [
            'answered' => count($meta['question_ids'] ?? []),
            'estimatedTotal' => (int) ($meta['max_questions'] ?? 10),
            'currentDifficulty' => (int) ($meta['current_difficulty'] ?? 3),
            'minQuestions' => (int) ($meta['min_questions'] ?? 5),
        ];
    }

    private function ok(array $data, int $status = 200): JsonResponse
    {
        return response()->json(['data' => $data], $status);
    }

    // startDomain(): same shape, delegate to the domain-test path of the engine.
    public function startDomain(Request $request, \App\Models\Domain $domain): JsonResponse
    {
        abort(501, 'Mirror startObjective for the domain-test flow.');
    }
}
