/** Lightweight date formatters used across screens. Kept tiny on purpose —
 * we don't want a full i18n/date library dependency for two helper functions. */

const DATE_OPTS: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

/** Format an ISO date-time string as "14 Mar", "02 Sep", etc. Returns empty
 * string if the input is nullish or unparseable — callers can conditionally
 * render based on truthiness. */
export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', DATE_OPTS);
}
