import { courseMetaFor } from '../courseArt';

describe('courseMetaFor', () => {
  it('returns the mapped art and vendor for a known product slug', () => {
    expect(courseMetaFor('isc2-cc')).toEqual({ art: 'cc', vendor: 'ISC2' });
    expect(courseMetaFor('comptia-security-plus')).toEqual({ art: 'security', vendor: 'CompTIA' });
    expect(courseMetaFor('comptia-cysa-plus')).toEqual({ art: 'cysa', vendor: 'CompTIA' });
  });

  it('falls back to security art with no vendor for an unknown slug', () => {
    expect(courseMetaFor('some-future-course')).toEqual({ art: 'security', vendor: '' });
  });

  it('falls back to the default for a null or undefined slug', () => {
    expect(courseMetaFor(null)).toEqual({ art: 'security', vendor: '' });
    expect(courseMetaFor(undefined)).toEqual({ art: 'security', vendor: '' });
  });
});
