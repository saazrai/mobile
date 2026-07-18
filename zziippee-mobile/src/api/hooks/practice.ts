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

/** Domain tree — read-mostly, cache aggressively (rarely changes). */
export function useDomains(productSlug: string) {
  return useQuery({
    queryKey: ['domains', productSlug],
    queryFn: () => getData(`/learn/${productSlug}/domains`),
    staleTime: 15 * 60 * 1000,
  });
}

/** Resume-aware fetch of the current question for an assessment. */
export function useAssessment(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessment', assessmentId],
    queryFn: () => getData<AssessmentState>(`/assessments/${assessmentId}`),
    enabled: !!assessmentId,
    staleTime: 0, // live state — never serve stale
  });
}

export function useStartObjective() {
  return useMutation({
    mutationFn: (objectiveSlug: string) =>
      postData<AssessmentState>(`/practice/objectives/${objectiveSlug}/start`),
  });
}

/** Domain test start — returns full question set up front (fixed preset). */
export interface DomainStartResult {
  assessment_id: string;
  questions: Question[];
  progress: AdaptiveProgress;
}

export function useStartDomain() {
  return useMutation({
    mutationFn: (domainSlug: string) =>
      postData<DomainStartResult>(`/practice/domains/${domainSlug}/start`),
  });
}

/** Domain test answer — no reveal, returns only {saved: true, progress}. */
export interface DomainAnswerResult {
  saved: boolean;
  progress: AdaptiveProgress;
}

export function useDomainAnswer(assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { question_id: number; selected_options: string[] }) =>
      postData<DomainAnswerResult>(`/assessments/${assessmentId}/answer`, body),
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

export function useSubmitDomain(assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => postData<DomainSubmitResult>(`/assessments/${assessmentId}/submit`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Submit an answer. Correctness/adaptivity/scoring are decided server-side; the
 * app renders only what comes back. Never cached — always hits the network.
 */
export function useAnswer(assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      question_id: number;
      selected_options: string[];
      question_elapsed_seconds?: number;
    }) => postData<AnswerResult>(`/assessments/${assessmentId}/answer`, body),
    onSuccess: () => {
      // Progress/proficiency changed — let dashboard refetch on next focus.
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePauseAssessment(assessmentId: string) {
  return useMutation({
    mutationFn: (elapsedSeconds: number) =>
      postData(`/assessments/${assessmentId}/pause`, { elapsed_seconds: elapsedSeconds }),
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
    difficulty_history: number[];
    result_history: boolean[];
  };
  questions: ReviewQuestion[];
}

/** Post-quiz review — score, mastery, and per-question detail (docs/03 §review). */
export function useReview(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['assessment-review', assessmentId],
    queryFn: () => getData<AssessmentReview>(`/assessments/${assessmentId}/review`),
    enabled: !!assessmentId,
    staleTime: Infinity, // a completed assessment's review never changes
  });
}
