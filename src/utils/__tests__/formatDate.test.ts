import { formatShortDate } from '../formatDate';

describe('formatShortDate', () => {
  it('formats an ISO date string as "D Mon" in UTC', () => {
    expect(formatShortDate('2026-03-14T10:00:00Z')).toBe('14 Mar');
    expect(formatShortDate('2026-12-02T00:00:00Z')).toBe('2 Dec');
  });

  it('returns an empty string for null or undefined', () => {
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate(undefined)).toBe('');
  });

  it('returns an empty string for an invalid date string', () => {
    expect(formatShortDate('not-a-date')).toBe('');
  });
});
