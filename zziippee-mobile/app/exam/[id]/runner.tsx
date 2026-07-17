import { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Alert, AppState, Pressable, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { OptionContent } from '../../../src/components/OptionContent';
import { questionMarkdownStyle } from '../../../src/components/markdownStyles';
import { scrollableMarkdownRules } from '../../../src/components/markdownRules';
import { ApiRequestError } from '../../../src/api/client';
import {
  useExam, useExamAnswer, useExamPause, useExamHeartbeat, useExamEnd, mintIdempotencyKey,
  type ExamPolicy, type ExamQuestion,
} from '../../../src/api/hooks/exam';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type Palette } from '../../../src/theme/tokens';

/**
 * Screen M — Exam Runner (docs/08-exam-spec.md §8.7). Unlike the Practice runner
 * there is no reveal-after-submit step here — exams never return correct_options
 * until the completed-only /review endpoint (§8.6), so answering just advances.
 */
export default function ExamRunner() {
  const t = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { id, product } = useLocalSearchParams<{ id: string; product?: string }>();
  const { data: initial, isLoading } = useExam(id);
  const answerMutation = useExamAnswer(id!);
  const pauseMutation = useExamPause(id!);
  const heartbeat = useExamHeartbeat(id!);
  const endMutation = useExamEnd(id!);

  const initializedRef = useRef(false);
  const [initialized, setInitialized] = useState(false);
  const [policy, setPolicy] = useState<ExamPolicy | null>(null);
  const [examTypeName, setExamTypeName] = useState('');
  const [questionsList, setQuestionsList] = useState<ExamQuestion[] | null>(null);
  const [liveQuestion, setLiveQuestion] = useState<ExamQuestion | null>(null);
  const [serverIndex, setServerIndex] = useState(0);
  const [viewIndex, setViewIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [answersMap, setAnswersMap] = useState<Record<number, string[]>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [stateVersion, setStateVersion] = useState(0);
  const [reviewReady, setReviewReady] = useState(false);
  const [reviewEnded, setReviewEnded] = useState(false);
  const [inReviewDetail, setInReviewDetail] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [deadlineAt, setDeadlineAt] = useState<number | null>(null);

  // Refs mirror the latest values for use inside setInterval/AppState closures
  // (which would otherwise capture stale state from the render they were created in).
  const stateVersionRef = useRef(stateVersion);
  const remainingRef = useRef(remaining);
  const endingRef = useRef(false);
  useEffect(() => { stateVersionRef.current = stateVersion; }, [stateVersion]);
  useEffect(() => { remainingRef.current = remaining; }, [remaining]);

  // Seed local state once from the resume-aware GET (covers both a fresh start
  // — the List screen already called /start — and a resumed/paused attempt).
  useEffect(() => {
    if (initializedRef.current || !initial || initial.completed) return;
    initializedRef.current = true;
    setPolicy(initial.policy);
    setExamTypeName(initial.exam_type.name);
    setQuestionsList(initial.questions ?? null);
    setLiveQuestion(initial.question);
    const idx = initial.current_question_number - 1;
    setServerIndex(idx);
    setViewIndex(idx);
    setTotalQuestions(initial.total_questions);
    setAnsweredCount(initial.answered_count);
    setStateVersion(initial.state_version);
    setReviewReady(initial.review_ready);
    setReviewEnded(initial.review_ended);
    if (initial.answers) {
      setAnswersMap(Object.fromEntries(Object.entries(initial.answers).map(([k, v]) => [Number(k), v])));
    }
    setDeadlineAt(Date.now() + initial.remaining_seconds * 1000);
    setRemaining(initial.remaining_seconds);
    setInitialized(true);
  }, [initial]);

  // Already-expired/completed on load (e.g. reopened long after the deadline).
  useEffect(() => {
    if (initial?.completed) router.replace(`/exam/${id}/results`);
  }, [initial, id, router]);

  const isNavigable = policy?.pre_selected_question_set ?? false;
  const question = isNavigable ? questionsList?.[viewIndex] ?? null : liveQuestion;
  const isEditingPast = viewIndex !== serverIndex;

  // Local selection resets whenever the viewed question changes (palette jump,
  // forward advance, or entering review detail).
  useEffect(() => {
    setSelected(answersMap[viewIndex] ?? []);
  }, [viewIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- timer: local tick + periodic server resync ----
  useEffect(() => {
    if (deadlineAt == null) return;
    const tick = () => setRemaining(Math.max(0, Math.round((deadlineAt - Date.now()) / 1000)));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [deadlineAt]);

  async function resyncTimer() {
    try {
      const res = await heartbeat.mutateAsync(Math.max(0, remainingRef.current));
      setDeadlineAt(Date.now() + res.remaining_seconds * 1000);
      if (res.expired) router.replace(`/exam/${id}/results`);
    } catch {
      // heartbeat failures shouldn't interrupt the exam — matches web's Exam.vue behavior
    }
  }
  useEffect(() => {
    if (!initialized) return;
    const iv = setInterval(resyncTimer, 30_000);
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') resyncTimer(); });
    return () => { clearInterval(iv); sub.remove(); };
  }, [initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- time-up: best-effort submit pending selection, then force-end ----
  useEffect(() => {
    if (!initialized || remaining > 0 || endingRef.current) return;
    endingRef.current = true;
    handleTimeUp();
  }, [remaining, initialized]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTimeUp() {
    try {
      await endMutation.mutateAsync({ state_version: stateVersionRef.current, idempotency_key: mintIdempotencyKey('exam-timeup') });
    } catch {
      // already expired server-side — /results will still reflect the correct outcome
    }
    Alert.alert('Time’s up', 'Your exam has been submitted automatically.', [
      { text: 'OK', onPress: () => router.replace(`/exam/${id}/results`) },
    ]);
  }

  function handleMutationError(e: unknown) {
    const err = e as ApiRequestError;
    if (err?.status === 409) {
      if (typeof err.stateVersion === 'number') setStateVersion(err.stateVersion);
      Alert.alert('Out of date', err.message || 'Refresh and try again.');
      return;
    }
    Alert.alert('Something went wrong', err?.message || 'Please try again.');
  }

  const toggle = (opt: string) => {
    if (!question) return;
    const expected = question.expected_selection_count;
    if (expected <= 1) { Haptics.selectionAsync(); setSelected([opt]); return; }
    if (selected.includes(opt)) { Haptics.selectionAsync(); setSelected((p) => p.filter((o) => o !== opt)); return; }
    if (selected.length >= expected) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); return; }
    Haptics.selectionAsync();
    setSelected((p) => [...p, opt]);
  };

  async function onSubmitPress() {
    if (!question) return;
    try {
      const key = mintIdempotencyKey(isEditingPast ? 'exam-edit' : 'exam-submit');
      const res = await answerMutation.mutateAsync({
        question_id: question.id,
        selected_options: selected,
        state_version: stateVersion,
        idempotency_key: key,
        ...(isEditingPast ? { review_index: viewIndex } : {}),
      });
      setStateVersion(res.state_version);
      setAnswersMap((m) => ({ ...m, [viewIndex]: selected }));
      if (res.answered_count != null) setAnsweredCount(res.answered_count);

      if (res.completed) { router.replace(`/exam/${id}/results`); return; }
      if (res.review_ready) { setReviewReady(true); setInReviewDetail(false); return; }
      if (res.updated) {
        if (!reviewReady) { setViewIndex(serverIndex); }
        setInReviewDetail(false);
        return;
      }
      // normal forward advance
      const nextIdx = serverIndex + 1;
      setServerIndex(nextIdx);
      setViewIndex(nextIdx);
      setLiveQuestion(res.question ?? null);
    } catch (e) {
      handleMutationError(e);
    }
  }

  function confirmPause() {
    Alert.alert(
      'Pause Exam?',
      'Your progress is saved. Heads up: the timer keeps counting against the real deadline even while paused.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Pause', style: 'destructive', onPress: doPause }],
    );
  }
  async function doPause() {
    try {
      const res = await pauseMutation.mutateAsync({ state_version: stateVersion, idempotency_key: mintIdempotencyKey('exam-pause') });
      setStateVersion(res.state_version);
      router.replace(product ? `/learn/${product}/exams` : '/(tabs)');
    } catch (e) {
      handleMutationError(e);
    }
  }

  function confirmEndReview() {
    const unanswered = totalQuestions - answeredCount;
    Alert.alert(
      'End Review?',
      unanswered > 0
        ? `${unanswered} question${unanswered === 1 ? ' is' : 's are'} still unanswered. Once you end review, you can't change any answers.`
        : "Once you end review, you can't change any answers.",
      [{ text: 'Keep Reviewing', style: 'cancel' }, { text: 'End Review', style: 'destructive', onPress: () => setReviewEnded(true) }],
    );
  }
  async function endExam() {
    try {
      const res = await endMutation.mutateAsync({ state_version: stateVersion, idempotency_key: mintIdempotencyKey('exam-end') });
      setStateVersion(res.state_version);
      router.replace(`/exam/${id}/results`);
    } catch (e) {
      handleMutationError(e);
    }
  }

  function jumpTo(i: number) {
    setViewIndex(i);
    setPaletteOpen(false);
  }
  function openFromReviewList(i: number) {
    setViewIndex(i);
    setInReviewDetail(true);
  }
  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      next.has(viewIndex) ? next.delete(viewIndex) : next.add(viewIndex);
      return next;
    });
  }

  if (isLoading || !initialized) {
    return <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}><ActivityIndicator color={t.blue} /></SafeAreaView>;
  }

  const showReviewList = reviewReady && !inReviewDetail;
  const timerColor = remaining < 60 ? t.red : remaining < 300 ? t.orange : t.label;
  const pending = answerMutation.isPending || endMutation.isPending || pauseMutation.isPending;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        {reviewEnded ? (
          <View style={{ width: 44 }} />
        ) : (
          <PressableScale onPress={confirmPause} hitSlop={12} style={[styles.navBtn, { backgroundColor: t.fill }]}>
            <Icon name="clock" size={18} color={t.label} />
          </PressableScale>
        )}
        <Text variant="headline" style={{ color: timerColor, fontVariant: ['tabular-nums'] }}>{formatClock(remaining)}</Text>
        <View style={styles.navRight}>
          {policy?.allow_mark_for_review && !showReviewList && !reviewEnded && (
            <PressableScale onPress={toggleFlag} hitSlop={10}>
              <Icon name="flag" size={20} color={flagged.has(viewIndex) ? t.orange : t.label3} filled={flagged.has(viewIndex)} />
            </PressableScale>
          )}
          {isNavigable && !showReviewList && !reviewEnded && (
            <PressableScale onPress={() => setPaletteOpen(true)} hitSlop={10} style={{ marginLeft: spacing.md }}>
              <Icon name="layers" size={20} color={t.label} />
            </PressableScale>
          )}
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: t.fill }]}>
        <View style={[styles.progressFill, { backgroundColor: t.blue, width: `${(answeredCount / Math.max(1, totalQuestions)) * 100}%` }]} />
      </View>
      <Text variant="footnote" color="label2" style={{ marginTop: spacing.xs, marginHorizontal: spacing.xl }}>
        {examTypeName} · Question {viewIndex + 1} of {totalQuestions} · {answeredCount} answered
      </Text>

      {showReviewList ? (
        <ReviewGateList
          t={t}
          scheme={scheme}
          questions={questionsList}
          totalQuestions={totalQuestions}
          answersMap={answersMap}
          flagged={flagged}
          locked={reviewEnded}
          onOpen={openFromReviewList}
          onEndReview={confirmEndReview}
          onEndExam={endExam}
          pending={pending}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>
            {isEditingPast && (
              <PressableScale onPress={() => { setViewIndex(serverIndex); setInReviewDetail(false); }} style={[styles.editingBanner, { backgroundColor: t.fill }, continuousCurve]}>
                <Icon name="chevron" size={13} color={t.label2} />
                <Text variant="footnote" color="label2">
                  {reviewReady ? 'Back to review' : `Editing a previous answer — back to question ${serverIndex + 1}`}
                </Text>
              </PressableScale>
            )}
            {question && (
              <>
                <Markdown style={questionMarkdownStyle(scheme === 'dark')} rules={scrollableMarkdownRules(scheme === 'dark')}>
                  {question.content}
                </Markdown>
                <View style={[{ marginTop: spacing.xxl }, continuousCurve, shadow.card]}>
                  <View style={[styles.optCard, { backgroundColor: t.cell }, continuousCurve]}>
                    {question.options.map((opt, i) => {
                      const isSel = selected.includes(opt);
                      const isMulti = question.expected_selection_count > 1;
                      return (
                        <PressableScale key={i} scaleTo={0.985} onPress={() => toggle(opt)}>
                          {i > 0 && <View style={[styles.sep, { backgroundColor: t.separator }]} />}
                          <View style={[styles.opt, { backgroundColor: isSel ? `${t.blue}1f` : 'transparent' }]}>
                            <View style={[styles.radio, isMulti && styles.checkbox, { borderColor: isSel ? t.blue : t.label3, backgroundColor: isSel ? t.blue : 'transparent' }]}>
                              {isSel && (isMulti ? <Icon name="check" size={13} color={t.cell} /> : <View style={[styles.dot, { backgroundColor: t.cell }]} />)}
                            </View>
                            <View style={{ flex: 1 }}><OptionContent>{opt}</OptionContent></View>
                          </View>
                        </PressableScale>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={styles.footWrap} pointerEvents="box-none">
            <BlurView intensity={40} tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={[styles.footbar, shadow.floating]}>
              <PressableScale
                style={[styles.btn, { backgroundColor: submitEnabled(question, selected, policy, isEditingPast) ? t.blue : t.fill }, continuousCurve]}
                disabled={!submitEnabled(question, selected, policy, isEditingPast) || pending}
                onPress={onSubmitPress}
              >
                {pending ? <ActivityIndicator color="#fff" /> : (
                  <Text variant="headline" color={submitEnabled(question, selected, policy, isEditingPast) ? 'onColor' : 'label3'}>
                    {buttonLabel({ question, selected, policy, isEditingPast, reviewReady, serverIndex, totalQuestions })}
                  </Text>
                )}
              </PressableScale>
            </BlurView>
          </View>
        </>
      )}

      {paletteOpen && (
        <PaletteSheet
          t={t}
          questions={questionsList}
          totalQuestions={totalQuestions}
          currentIndex={viewIndex}
          serverIndex={serverIndex}
          answersMap={answersMap}
          flagged={flagged}
          onJump={jumpTo}
          onClose={() => setPaletteOpen(false)}
        />
      )}
    </SafeAreaView>
  );
}

function submitEnabled(question: ExamQuestion | null, selected: string[], policy: ExamPolicy | null, isEditingPast: boolean): boolean {
  if (!question) return false;
  const expected = question.expected_selection_count;
  const valid = selected.length === expected;
  if (isEditingPast) return valid;
  return valid || (!!policy?.allow_skip && selected.length === 0);
}

function buttonLabel({ question, selected, policy, isEditingPast, reviewReady, serverIndex, totalQuestions }: {
  question: ExamQuestion | null; selected: string[]; policy: ExamPolicy | null; isEditingPast: boolean;
  reviewReady: boolean; serverIndex: number; totalQuestions: number;
}): string {
  if (!question) return 'Next';
  if (isEditingPast) return reviewReady ? 'Save & Back to Review' : 'Save Answer';
  const valid = selected.length === question.expected_selection_count;
  if (!valid && policy?.allow_skip && selected.length === 0) return 'Skip';
  const isLast = !reviewReady && serverIndex === totalQuestions - 1;
  if (isLast) return policy?.allow_review_before_submit ? 'Review Answers' : 'Finish Exam';
  return 'Next';
}

function formatClock(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function ReviewGateList({ t, scheme, questions, totalQuestions, answersMap, flagged, locked, onOpen, onEndReview, onEndExam, pending }: {
  t: Palette; scheme: string | null | undefined; questions: ExamQuestion[] | null; totalQuestions: number; answersMap: Record<number, string[]>;
  flagged: Set<number>; locked: boolean; onOpen: (i: number) => void; onEndReview: () => void; onEndExam: () => void; pending: boolean;
}) {
  return (
    <>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>
        <Text variant="title3" style={{ marginBottom: spacing.xs }}>Review your answers</Text>
        <Text variant="footnote" color="label2" style={{ marginBottom: spacing.lg }}>
          {locked ? 'Review is locked in — tap End Exam to submit.' : 'Tap any question to change your answer before you submit.'}
        </Text>
        <View style={[styles.reviewCard, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const answered = !!answersMap[i]?.length;
            const preview = questions?.[i]?.content?.replace(/[#*`\n]/g, ' ').trim().slice(0, 64) ?? `Question ${i + 1}`;
            return (
              <PressableScale key={i} disabled={locked} onPress={() => onOpen(i)} scaleTo={0.99}>
                {i > 0 && <View style={[styles.sep, { backgroundColor: t.separator, marginLeft: spacing.lg }]} />}
                <View style={styles.reviewRow}>
                  <View style={[styles.reviewDot, { backgroundColor: answered ? t.blue : t.fill }]}>
                    <Text variant="caption" color={answered ? 'onColor' : 'label2'} style={{ fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <Text variant="footnote" color="label2" numberOfLines={1} style={{ flex: 1 }}>{preview}…</Text>
                  {flagged.has(i) && <Icon name="flag" size={14} color={t.orange} filled />}
                  {!answered && <Text variant="caption" color="red">Unanswered</Text>}
                  {!locked && <Icon name="chevron" size={13} color={t.label3} />}
                </View>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
      <View style={styles.footWrap} pointerEvents="box-none">
        <BlurView intensity={40} tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={[styles.footbar, shadow.floating]}>
          {locked ? (
            <PressableScale style={[styles.btn, { backgroundColor: t.red }, continuousCurve]} disabled={pending} onPress={onEndExam}>
              {pending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">End Exam</Text>}
            </PressableScale>
          ) : (
            <PressableScale style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]} onPress={onEndReview}>
              <Text variant="headline" color="onColor">End Review</Text>
            </PressableScale>
          )}
        </BlurView>
      </View>
    </>
  );
}

function PaletteSheet({ t, questions, totalQuestions, currentIndex, serverIndex, answersMap, flagged, onJump, onClose }: {
  t: Palette; questions: ExamQuestion[] | null; totalQuestions: number;
  currentIndex: number; serverIndex: number; answersMap: Record<number, string[]>; flagged: Set<number>;
  onJump: (i: number) => void; onClose: () => void;
}) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <View style={styles.scrim} />
      </Pressable>
      <View style={[styles.sheet, { backgroundColor: t.cell }, continuousCurve, shadow.floating]}>
        <Text variant="headline" style={{ marginBottom: spacing.md }}>Questions</Text>
        <View style={styles.chipGrid}>
          {Array.from({ length: totalQuestions }).map((_, i) => {
            const answered = !!answersMap[i]?.length;
            const isCurrent = i === currentIndex;
            const isForward = i === serverIndex;
            return (
              <PressableScale key={i} onPress={() => onJump(i)} style={[
                styles.chip,
                { backgroundColor: answered ? t.blue : t.fill, borderColor: isCurrent ? t.blue : 'transparent', borderWidth: isCurrent ? 2 : 0 },
              ]}>
                <Text variant="footnote" color={answered ? 'onColor' : 'label'} style={{ fontWeight: '700' }}>{i + 1}</Text>
                {flagged.has(i) && <View style={[styles.chipFlag, { backgroundColor: t.orange }]} />}
                {isForward && <View style={[styles.chipForward, { backgroundColor: t.green }]} />}
              </PressableScale>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  navRight: { flexDirection: 'row', alignItems: 'center', width: 44, justifyContent: 'flex-end' },
  progressTrack: { height: 4, marginHorizontal: spacing.xl, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  editingBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.sm, marginBottom: spacing.lg },
  optCard: { borderRadius: radius.cell, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 44 },
  sep: { height: hairline },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkbox: { borderRadius: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  footWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  footbar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, overflow: 'hidden' },
  btn: { flex: 1, borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
  reviewCard: { borderRadius: radius.cell, overflow: 'hidden' },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 44 },
  reviewDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.xl, padding: spacing.xl, borderRadius: radius.card },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  chipFlag: { position: 'absolute', top: -3, right: -3, width: 9, height: 9, borderRadius: 5 },
  chipForward: { position: 'absolute', bottom: -3, left: -3, width: 9, height: 9, borderRadius: 5 },
});
