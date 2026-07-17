import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getData, postData } from '../client';

// ---- Types (subset; see docs/08-exam-spec.md §8.4 for the full contract) ----
export interface ExamPolicy {
  allow_skip: boolean;
  allow_backtrack: boolean;
  allow_mark_for_review: boolean;
  allow_review_before_submit: boolean;
  allow_review_after_submit: boolean;
  navigation_mode: 'linear_navigable' | 'linear_locked';
  pre_selected_question_set: boolean;
  adaptive_mode: boolean;
}
export interface ExamType {
  code: string;
  name: string;
}
export interface ExamSetting {
  id: number;
  exam_type: ExamType;
  description: string;
  question_count: number;
  duration_minutes: number;
  duration_for_humans: string;
  passing_percentage: number;
  max_attempts: number;
  has_unlimited_attempts: boolean;
  attempt_count: number;
  can_take_exam: boolean;
  has_in_progress_attempt: boolean;
  in_progress_assessment_id: string | null;
  cooldown_ends_at: string | null;
  cooldown_minutes: number;
  policy: ExamPolicy;
}
export interface UserExamAttempt {
  id: string;
  exam_type_name: string;
  status: 'in_progress' | 'paused' | 'completed';
  score: number | null;
  correct_answers: number;
  total_questions: number;
  duration_seconds: number;
  created_at: string;
  can_resume: boolean;
}
export interface ExamListResponse {
  exam_settings: ExamSetting[];
  user_exams: UserExamAttempt[];
}

export interface ExamQuestion {
  id: number;
  content: string;
  type: { id: number; name: string };
  options: string[];
  expected_selection_count: number;
  difficulty_id: number;
}

export interface ExamStartResult {
  assessment_id: string;
  question: ExamQuestion;
  /** Only present when policy.pre_selected_question_set (linear_navigable) — the
   * full ordered set, so the app can render a palette without extra round trips. */
  questions?: ExamQuestion[];
  current_question_number: number;
  total_questions: number;
  answered_count: number;
  deadline_at: string;
  duration_limit_seconds: number;
  state_version: number;
  policy: ExamPolicy;
  exam_type: ExamType;
}

export interface ExamState {
  assessment_id: string;
  status: 'in_progress' | 'paused' | 'completed';
  question: ExamQuestion;
  questions?: ExamQuestion[];
  /** index -> selected_options, navigable only — lets the runner rehydrate the
   * palette's answered/unanswered state after a resume. */
  answers?: Record<number, string[]>;
  current_question_number: number;
  total_questions: number;
  answered_count: number;
  remaining_seconds: number;
  state_version: number;
  policy: ExamPolicy;
  exam_type: ExamType;
  review_ready: boolean;
  review_ended: boolean;
  completed?: boolean;
  redirect_to?: 'results';
}

export interface SubmitAnswerBody {
  question_id: number;
  selected_options: string[];
  duration?: number;
  /** Set when editing a previously-answered question via the palette (allow_backtrack only). */
  review_index?: number;
  state_version: number;
  idempotency_key: string;
}

export interface SubmitAnswerResult {
  completed: boolean;
  redirect_to?: 'results';
  review_ready?: boolean;
  updated?: boolean;
  duplicate?: boolean;
  question?: ExamQuestion;
  current_question_number?: number;
  total_questions?: number;
  answered_count?: number;
  state_version: number;
}

export interface ExamDomainPerformance {
  id: string;
  name: string;
  total: number;
  correct: number;
  accuracy: number;
}
export interface ExamResults {
  assessment: {
    id: string;
    status: 'in_progress' | 'paused' | 'completed';
    score: number;
    correct_answers: number;
    total_questions: number;
    answered_questions: number;
    duration_seconds: number;
    started_at: string;
    completed_at: string | null;
  };
  exam_type_name: string;
  passing_percentage: number;
  can_review: boolean;
  summary: { domains: { performance: ExamDomainPerformance[] } };
}

export interface ExamReviewResponse {
  id: number;
  question_id: number;
  selected_options: string[];
  duration: number;
  is_correct: boolean;
  question: {
    id: number;
    content: string;
    options: string[];
    correct_options: string[];
    justifications: string[];
  };
}
export interface ExamReview {
  responses: ExamReviewResponse[];
}

/** Mints a fresh idempotency key per action-attempt. Guards network-layer
 * retries of the same request, not user double-taps — disable the control on
 * press for that (docs/08 §8.6). */
export function mintIdempotencyKey(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useExamSettings(productSlug: string) {
  return useQuery({
    queryKey: ['exam-settings', productSlug],
    queryFn: () => getData<ExamListResponse>(`/learn/${productSlug}/exams`),
    staleTime: 30_000,
  });
}

export function useExamStart() {
  return useMutation({
    mutationFn: (examSettingId: number) => postData<ExamStartResult>(`/exams/${examSettingId}/start`),
  });
}

/** Resume-aware current state. Also used to rehydrate after a pause. */
export function useExam(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['exam', assessmentId],
    queryFn: () => getData<ExamState>(`/exams/${assessmentId}`),
    enabled: !!assessmentId,
    staleTime: 0,
  });
}

/**
 * Submit (or edit, via review_index) an answer. Never reveals correctness —
 * exams don't have a reveal-after-submit step like Practice (docs/08 §8.7).
 */
export function useExamAnswer(assessmentId: string) {
  return useMutation({
    mutationFn: (body: SubmitAnswerBody) => postData<SubmitAnswerResult>(`/exams/${assessmentId}/submit-answer`, body),
  });
}

export function useExamPause(assessmentId: string) {
  return useMutation({
    mutationFn: (body: { state_version: number; idempotency_key: string }) =>
      postData<{ status: string; state_version: number }>(`/exams/${assessmentId}/pause`, body),
  });
}

/** Keepalive, every ~30s and on foreground — returns authoritative remaining_seconds. */
export function useExamHeartbeat(assessmentId: string) {
  return useMutation({
    mutationFn: (elapsed: number) =>
      postData<{ ok: boolean; remaining_seconds: number; expired: boolean }>(`/exams/${assessmentId}/heartbeat`, { elapsed }),
  });
}

export function useExamEnd(assessmentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { state_version: number; idempotency_key: string }) =>
      postData<{ completed: boolean; redirect_to?: string; state_version: number }>(`/exams/${assessmentId}/end`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useExamResults(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['exam-results', assessmentId],
    queryFn: () => getData<ExamResults>(`/exams/${assessmentId}/results`),
    enabled: !!assessmentId,
    staleTime: Infinity,
  });
}

export function useExamReview(assessmentId: string | undefined) {
  return useQuery({
    queryKey: ['exam-review', assessmentId],
    queryFn: () => getData<ExamReview>(`/exams/${assessmentId}/review`),
    enabled: !!assessmentId,
    staleTime: Infinity,
  });
}
