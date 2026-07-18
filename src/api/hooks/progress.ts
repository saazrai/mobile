import { useQuery } from '@tanstack/react-query';
import { getData } from '../client';

/** Proficiency summary per domain for a product (LearnerProficiencyService). */
export interface DomainProficiency {
  proficiency_score: number;    // 0-100
  level: number;                // 1-5
  label: string;
  best_level: number | null;
  attempts_count: number;
  coverage: number;             // 0-100, % of objectives attempted
}

export interface LearnerProficiency {
  product_slug: string;
  product_name: string;
  overall_score: number;        // weighted average across domains
  domains: Record<string, DomainProficiency>;
}

/** Fetches per-domain proficiency for a product. */
export function useLearnerProficiency(productSlug: string | undefined) {
  return useQuery({
    queryKey: ['learner-proficiency', productSlug],
    queryFn: () => getData<LearnerProficiency>(`/learner/proficiency/${productSlug}`),
    enabled: !!productSlug,
    staleTime: 5 * 60_000, // 5 min — not real-time but refreshes on tab focus
  });
}
