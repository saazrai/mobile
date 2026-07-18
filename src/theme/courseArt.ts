/** Client-side metadata for known products. The API does not return vendor or
 * art style on enrollment / course-home responses — those are properties of
 * the product type itself, stable across users and enrollments. Keeping them
 * here means screens can render consistently without depending on server data
 * that may omit these fields (which is what caused the `toUpperCase` crash). */

export type ArtStyle = 'security' | 'cc' | 'cysa';

interface CourseMeta {
  vendor: string;
  art: ArtStyle;
}

const META: Record<string, CourseMeta> = {
  'comptia-security-plus':   { vendor: 'CompTIA',  art: 'security' },
  'isc2-cc':                 { vendor: 'ISC2',     art: 'cc' },
  'comptia-cysa-plus':       { vendor: 'CompTIA',  art: 'cysa' },
};

/** Look up vendor + art for a product slug. Returns `null` if the slug is
 * unknown — callers should degrade gracefully (hide vendor line, use default
 * art) rather than crash. */
export function courseMetaFor(slug: string | null | undefined): CourseMeta | null {
  if (!slug) return null;
  return META[slug] ?? null;
}
