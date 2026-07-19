import { computeElapsedSeconds, computeContinueProgress } from '../practiceResume';

describe('computeElapsedSeconds', () => {
  it('adds wall-clock time spent this session to the last known server value', () => {
    expect(computeElapsedSeconds(120, 1_000_000, 1_065_000)).toBe(185);
  });

  it('treats a missing last-known value as 0', () => {
    expect(computeElapsedSeconds(undefined, 1_000_000, 1_010_000)).toBe(10);
  });

  it('clamps a backward clock (now before startedAt) to no session delta', () => {
    expect(computeElapsedSeconds(120, 1_000_000, 900_000)).toBe(120);
  });

  it('returns the last known value unchanged when no time has passed', () => {
    expect(computeElapsedSeconds(120, 1_000_000, 1_000_000)).toBe(120);
  });
});

describe('computeContinueProgress', () => {
  it('computes the answered/total fraction', () => {
    expect(computeContinueProgress(6, 10)).toBe(0.6);
  });

  it('treats a missing answered count as 0', () => {
    expect(computeContinueProgress(undefined, 10)).toBe(0);
  });

  it('returns 0 when total_questions is 0, avoiding division by zero', () => {
    expect(computeContinueProgress(5, 0)).toBe(0);
  });

  it('clamps to 1 if answered somehow exceeds total (stale/bad data)', () => {
    expect(computeContinueProgress(12, 10)).toBe(1);
  });
});
