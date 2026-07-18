export type CourseArt = 'security' | 'cc' | 'cysa';

export interface CourseMeta {
  art: CourseArt;
  vendor: string;
}

// The real backend has no concept of poster art or a vendor label — both are
// presentation-only, so they're a client-side lookup keyed by product slug
// rather than something the API returns.
const COURSE_META: Record<string, CourseMeta> = {
  'comptia-security-plus': { art: 'security', vendor: 'CompTIA' },
  'isc2-cc': { art: 'cc', vendor: 'ISC2' },
  'comptia-cysa-plus': { art: 'cysa', vendor: 'CompTIA' },
};

const DEFAULT_META: CourseMeta = { art: 'security', vendor: '' };

export function courseMetaFor(slug: string | null | undefined): CourseMeta {
  if (!slug) return DEFAULT_META;
  return COURSE_META[slug] ?? DEFAULT_META;
}
