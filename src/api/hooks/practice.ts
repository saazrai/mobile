import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, postData } from '../client';

// ---- Types (subset; generate the full set from OpenAPI via `npm run api:types`) ----
export interface Question {
  id: number;
  content: string;
  type: { id: number; name: string };
  options: string[];
  expected_selection_count: number;
  difficulty_id: number;
}
export interface AdaptiveProgress {
  answered: number;
  estimatedTotal: number;
  currentDifficulty: number;
  minQuestions: number;
}
export interface AssessmentState {
  assessment_id: string;
  kind: 'objective' | 'domain';
  status: 'in_progress' | 'paused' | 'completed';
  elapsed_seconds: number;
  question: Question | null;
  progress: AdaptiveProgress;
}
export interface AnswerResult {
  is_correct: boolean;
  correct_options: string[];
  justifications: string[];
  is_done: boolean;
  next_question: Question | null;
  progress: AdaptiveProgress;
  mastery: { level: number; label: string } | null;
  review_url: string | null;
}

/**
 * Some endpoints return `progress` directly, while others (the production
 * controller's adaptive-progress fields) return it separately and use
 * snake_case for resume data. Normalize both at the API boundary so runners
 * only ever consume one shape.
 */
function normalizeProgress(payload: any): AdaptiveProgress {
  const adaptive = payload.adaptive_progress ?? payload.progress ?? {};
  const resumeProgress = payload.progress ?? {};

  return {
    answered: adaptive.answered ?? payload.answered_count ?? resumeProgress.answered_count ?? 0,
    estimatedTotal: adaptive.estimatedTotal ?? payload.total_questions ?? resumeProgress.total_questions ?? 0,
    currentDifficulty: adaptive.currentDifficulty ?? 3,
    minQuestions: adaptive.minQuestions ?? 0,
  };
}

function normalizeAssessmentState(payload: any): AssessmentState {
  return { ...payload, progress: normalizeProgress(payload) };
}

function normalizeAnswerResult(payload: any): AnswerResult {
  return { ...payload, progress: normalizeProgress(payload) };
}

/** Domain tree — read-mostly, cache aggressively (rarely changes). */
export function useDomains(productSlug: string) {
  return useQuery({
    queryKey: ['domains', productSlug],
    queryFn: () => getData(`/learn/${productSlug}/domains`),
    staleTime: 15 * 60 * 1000,
  });
}

export interface ObjectiveSummary {
  id: number;
  number: string | null;
  name: string;
  slug: string;
  questions_count: number;
}
export interface ObjectiveDomain {
  id: number;
  number: string | null;
  name: string;
  slug: string;
  weight_percentage: number | null;
  objectives: ObjectiveSummary[];
}
export interface ObjectiveLatestAssessment {
  id: string;
  status: 'in_progress' | 'paused' | 'completed';
  score: number;
  total_questions: number;
  responses?: { id: number; questionable_id: number; is_correct: boolean }[];
}
export interface ProficiencyColorShades {
  text: string;
  bg: string;
  border: string;
  dot: string;
}
/**
 * Canonical hex palette from `LearnerProficiencyService::colorsForLevel()` — the
 * single source both web and mobile render from. Never hand-roll this mapping
 * client-side; pick `.light`/`.dark` by the active color scheme.
 */
export interface ProficiencyColor {
  light: ProficiencyColorShades;
  dark: ProficiencyColorShades;
}
export interface ProficiencyEntry {
  proficiency_score: number;
  proficiency_level: number;
  proficiency_label: string;
  proficiency_color: ProficiencyColor;
  best_level: number;
  attempts_count: number;
  coverage: number;
  last_assessed_at: string | null;
}
/**
 * Flat map from `LearnerProficiencyService::summaryForProduct`, keyed
 * `"{scope_type}:{scope_id}"` (`scope_type` one of course|domain|objective) — the
 * same shape on every endpoint that exposes it (docs/11-home-courses-progress-spec.md §11.3).
 */
export type ProficiencyMap = Record<string, ProficiencyEntry>;
export interface ObjectivesResponse {
  domains: ObjectiveDomain[];
  /** Keyed by objective id (as a string, since it comes back through a JSON object). */
  latestAssessments: Record<string, ObjectiveLatestAssessment>;
  /**
   * Latest *completed* attempt per objective — kept separate from
   * `latestAssessments` so that a newer in-progress/paused attempt doesn't
   * hide the ability to review the last completed one.
   */
  latestCompletedAssessments: Record<string, ObjectiveLatestAssessment>;
  proficiency: ProficiencyMap;
}

/**
 * Objective tree with each objective's latest practice attempt — the `/domains`
 * endpoint above only carries domain-level `latestAssessments` (domain tests),
 * not per-objective ones, so a "last score" per objective must come from here
 * (`CurriculumController::objectives`) instead.
 */
export function useObjectives(productSlug: string) {
  return useQuery({
    queryKey: ['objectives', productSlug],
    queryFn: () => getData<ObjectivesResponse>(`/learn/${productSlug}/objectives`),
    staleTime: 60 * 1000,
  });
}

export interface ObjectiveAttempt {
  id: string;
  status: 'in_progress' | 'paused' | 'completed';
  score: number | null;
  correct_answers: number | null;
  total_questions: number | null;
  answered_questions: number | null;
  duration_seconds: number | null;
  completed_at: string | null;
  created_at: string;
  can_resume: boolean;
}
export interface ObjectiveAttemptsResponse {
  domain: { id: number; number: string | null; name: string; slug: string };
  objective: { id: number; number: string | null; name: string; slug: string };
  attempts: ObjectiveAttempt[];
  summary: {
    count: number;
    bestScore: number;
    averageScore: number;
    latestScore: number;
    scoreImprovement: number;
    hasPrevious: boolean;
    totalAttempts: number;
    attemptsTruncated: boolean;
  };
}

/** Full attempt history for one objective — every attempt, not just the latest. */
export function useObjectiveAttempts(productSlug: string | undefined, objectiveSlug: string | undefined) {
  return useQuery({
    queryKey: ['objective-attempts', productSlug, objectiveSlug],
    queryFn: () => getData<ObjectiveAttemptsResponse>(`/learn/${productSlug}/objectives/${objectiveSlug}/attempts`),
    enabled: !!productSlug && !!objectiveSlug,
  });
}

/**
 * Resume-aware fetch of the current question for an assessment. `productSlug` is
 * required because the real backend nests assessment routes under
 * `/learn/{product}/...` for its EnsureEnrolledApi enrollment-gating middleware.
 */
export function useAssessment(assessmentId: string | undefined, productSlug: string | undefined) {
  return useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: async () => normalizeAssessmentState(await getData(`/learn/${productSlug}/assessments/${assessmentId}`)),
    enabled: !!assessmentId && !!productSlug,
    staleTime: 0, // live state — never serve stale
  });
}

/**
 * Start an adaptive practice assessment for a specific objective.
 * The identifier must be an OBJECTIVE slug (e.g., "2.3"), NOT a product/course
 * slug (e.g., "cisa" or "comptia-security-plus"). Obtain from:
 *   GET /learn/{product}/domains → domain.objectives[].slug
 */
export function useStartObjective(productSlug: string) {
  return useMutation({
    mutationFn: (objectiveIdentifier: string) =>
      postData<AssessmentState>(`/learn/${productSlug}/practice/objectives/${objectiveIdentifier}/start`),
  });
}

/** Domain test start — returns full question set up front (fixed preset). */
export interface DomainStartResult {
  assessment_id: string;
  questions: Question[];
  progress: AdaptiveProgress;
}

export function useStartDomain(productSlug: string) {
  return useMutation({
    mutationFn: (domainSlug: string) =>
      postData<DomainStartResult>(`/learn/${productSlug}/practice/domains/${domainSlug}/start`),
  });
}

/** Domain test answer — no reveal, returns only {saved: true, progress}. */
export interface DomainAnswerResult {
  saved: boolean;
  progress: AdaptiveProgress;
}

export function useDomainAnswer(assessmentId: string, productSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { question_id: number; selected_options: string[] }) =>
      postData<DomainAnswerResult>(`/learn/${productSlug}/assessments/${assessmentId}/answer`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/** Domain test submit — returns final score only. */
export interface DomainSubmitResult {
  score: number;
  correct_answers: number;
  total_questions: number;
}

export function useSubmitDomain(assessmentId: string, productSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postData<DomainSubmitResult>(`/learn/${productSlug}/assessments/${assessmentId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Submit an answer. Correctness/adaptivity/scoring are decided server-side; the
 * app renders only what comes back. Never cached — always hits the network.
 */
export function useAnswer(assessmentId: string, productSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      question_id: number;
      selected_options: string[];
      question_elapsed_seconds?: number;
    }) => normalizeAnswerResult(await postData(`/learn/${productSlug}/assessments/${assessmentId}/answer`, body)),
    onSuccess: (res) => {
      // Progress changed — synchronously patch the assessment cache so the
      // quiz runner's header counter reflects the new count on the very next render,
      // without waiting for an async refetch to complete.
      //
      // The real backend's "done" response omits progress entirely (docs/12-practice-spec.md
      // §12.2), which normalizeProgress then defaults to all-zero — trusting that would reset
      // the header's question counter to 1 while the final question's feedback is on screen.
      // Bump the last known count locally instead in that case.
      qc.setQueryData(['assessment', assessmentId], (old: any) =>
        old ? { ...old, progress: res.is_done ? { ...old.progress, answered: old.progress.answered + 1 } : res.progress } : old,
      );
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      if (res.is_done) qc.invalidateQueries({ queryKey: ['objectives', productSlug] });
    },
  });
}

export function usePauseAssessment(assessmentId: string, productSlug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (elapsedSeconds: number) =>
      postData(`/learn/${productSlug}/assessments/${assessmentId}/pause`, { elapsed_seconds: elapsedSeconds }),
    onSuccess: () => {
      // Lets the Objectives screen (and Home's Continue card, once it's
      // backed by real data) show Continue immediately on the next render,
      // without a manual pull-to-refresh.
      qc.invalidateQueries({ queryKey: ['objectives', productSlug] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export interface ReviewQuestion {
  id: number;
  content: string;
  options: string[];
  correct_options: string[];
  justifications: string[];
  selected_options: string[];
  is_correct: boolean | null;
}
export interface AssessmentReview {
  assessment: {
    id: string;
    status: 'in_progress' | 'paused' | 'completed';
    score: number;
    total_questions: number;
    correct_answers: number;
    completed_at: string | null;
    mastery_label: string | null;
    proficiency_label: string | null;
    proficiency_level: number | null;
    proficiency_color: ProficiencyColor | null;
    difficulty_history: number[];
    result_history: boolean[];
  };
  questions: ReviewQuestion[];
}

/** The production review endpoint is flat; some responses nest `assessment` instead. */
function normalizeReview(payload: any): AssessmentReview {
  if (payload.assessment) {
    return {
      ...payload,
      questions: (payload.questions ?? []).map(normalizeReviewQuestion),
    };
  }

  return {
    assessment: {
      id: payload.assessment_id,
      status: payload.status,
      score: Number(payload.score ?? 0),
      total_questions: Number(payload.total_questions ?? 0),
      correct_answers: Number(payload.correct_answers ?? 0),
      completed_at: payload.completed_at ?? null,
      mastery_label: payload.mastery_label ?? null,
      proficiency_label: payload.proficiency_label ?? null,
      proficiency_level: payload.proficiency_level ?? null,
      proficiency_color: payload.proficiency_color ?? null,
      difficulty_history: payload.difficulty_history ?? [],
      result_history: payload.result_history ?? [],
    },
    questions: (payload.questions ?? []).map(normalizeReviewQuestion),
  };
}

function normalizeReviewQuestion(question: any): ReviewQuestion {
  return {
    ...question,
    options: question.options ?? [],
    correct_options: question.correct_options ?? [],
    justifications: question.justifications ?? [],
    selected_options: question.selected_options ?? [],
    is_correct: question.is_correct ?? null,
  };
}

/** Post-quiz review — score, mastery, and per-question detail (docs/03 §review). */
export function useReview(assessmentId: string | undefined, productSlug: string | undefined) {
  return useQuery({
    queryKey: ['assessment-review', assessmentId],
    queryFn: async () => normalizeReview(await getData(`/learn/${productSlug}/assessments/${assessmentId}/review`)),
    enabled: !!assessmentId && !!productSlug,
    staleTime: Infinity, // a completed assessment's review never changes
  });
}
