/**
 * Clamped so a backward device clock can't push elapsed time below what the
 * server already recorded (docs/superpowers/specs/2026-07-19-practice-pause-continue-design.md).
 */
export function computeElapsedSeconds(
  lastKnownElapsedSeconds: number | undefined,
  startedAtMs: number,
  nowMs: number,
): number {
  const sessionDelta = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
  return (lastKnownElapsedSeconds ?? 0) + sessionDelta;
}

/**
 * 0-1 fraction of an in-progress/paused objective attempt already answered,
 * for the Objectives screen's Continue ring. Never fabricates a value when
 * data is missing — degrades to an empty ring instead.
 */
export function computeContinueProgress(answeredCount: number | undefined, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  const answered = answeredCount ?? 0;
  return Math.min(1, Math.max(0, answered / totalQuestions));
}
