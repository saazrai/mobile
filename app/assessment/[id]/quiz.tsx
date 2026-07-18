import { useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { useAssessment, useAnswer, type Question, type AnswerResult } from '../../../src/api/hooks/practice';
import { OptionContent } from '../../../src/components/OptionContent';
import { questionMarkdownStyle } from '../../../src/components/markdownStyles';
import { scrollableMarkdownRules } from '../../../src/components/markdownRules';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../../src/theme/tokens';

/** Practice loop — iOS styling; scoring is server-authoritative (docs/04 §4.5). */
export default function QuizRunner() {
  const t = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { id, product } = useLocalSearchParams<{ id: string; product?: string }>();
  const { data: state, isLoading } = useAssessment(id, product);
  const answer = useAnswer(id!, product!);

  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  // `useAssessment` is fetched once on mount and never refetched as you move through
  // questions locally, so its `progress.answered` goes stale after the first question.
  // Track it locally instead, seeded from the query once it loads.
  const [answeredOverride, setAnsweredOverride] = useState<number | null>(null);

  const current = question ?? state?.question ?? null;
  const expected = current?.expected_selection_count ?? 1;
  const isMultiSelect = expected > 1;
  const revealed = result !== null;
  const atCap = !revealed && isMultiSelect && selected.length >= expected;

  const toggle = (opt: string) => {
    if (revealed) return;
    if (!isMultiSelect) {
      Haptics.selectionAsync();
      setSelected([opt]);
      return;
    }
    if (selected.includes(opt)) {
      Haptics.selectionAsync();
      setSelected((p) => p.filter((o) => o !== opt));
      return;
    }
    if (selected.length >= expected) {
      // Already at the answer count — ignore instead of overselecting.
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    Haptics.selectionAsync();
    setSelected((p) => [...p, opt]);
  };

  const answeredCount = answeredOverride ?? state?.progress.answered ?? 0;

  const onSubmit = async () => {
    if (!current) return;
    const res = await answer.mutateAsync({ question_id: current.id, selected_options: selected });
    setResult(res);
    Haptics.notificationAsync(res.is_correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  };

  const onNext = () => {
    if (!result) return;
    // Advance the header count only now — at Submit time we're still showing the
    // just-answered question's reveal state, so bumping it there made the number
    // jump early instead of in sync with the new question actually appearing.
    setAnsweredOverride(result.progress.answered);
    if (result.is_done) return router.replace(`/assessment/${id}/review?product=${product}`);
    setQuestion(result.next_question); setSelected([]); setResult(null);
  };

  const optState = (opt: string): 'idle' | 'sel' | 'right' | 'wrong' => {
    if (!revealed) return selected.includes(opt) ? 'sel' : 'idle';
    if (result!.correct_options.includes(opt)) return 'right';
    if (selected.includes(opt)) return 'wrong';
    return 'idle';
  };
  const radioColor = { idle: t.label3, sel: t.blue, right: t.green, wrong: t.red };
  const optBg = { idle: 'transparent', sel: `${t.blue}1f`, right: `${t.green}1f`, wrong: `${t.red}1f` };

  if (isLoading || !current) {
    return <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}><ActivityIndicator color={t.blue} /></SafeAreaView>;
  }
  const canSubmit = selected.length === expected;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={[styles.navBtn, { backgroundColor: t.fill }]}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">Practice</Text>
        <ProgressRing
          progress={answeredCount / Math.max(1, state?.progress.estimatedTotal ?? 1)}
          size={44} strokeWidth={3} color={t.blue} track={t.fill}
        >
          <Text variant="caption" style={{ fontWeight: '700' }}>{answeredCount + 1}</Text>
        </ProgressRing>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>
        <Markdown style={questionMarkdownStyle(scheme === 'dark')} rules={scrollableMarkdownRules(scheme === 'dark')}>
          {current.content}
        </Markdown>

        <View style={[{ marginTop: spacing.xxl }, continuousCurve, shadow.card]}>
          <View style={[styles.optCard, { backgroundColor: t.cell }, continuousCurve]}>
            {current.options.map((opt, i) => {
              const s = optState(opt);
              const blocked = atCap && !selected.includes(opt);
              const rationale = revealed ? result!.justifications[i] : undefined;
              return (
                <PressableScale
                  key={i}
                  scaleTo={0.985}
                  onPress={() => toggle(opt)}
                  disabled={revealed || blocked}
                  dimWhenDisabled={!revealed}
                >
                  {i > 0 && <View style={[styles.sep, { backgroundColor: t.separator }]} />}
                  <View style={[styles.opt, { backgroundColor: optBg[s] }]}>
                    <View
                      style={[
                        styles.radio,
                        isMultiSelect && styles.checkbox,
                        { borderColor: radioColor[s], backgroundColor: s === 'idle' ? 'transparent' : radioColor[s], borderWidth: 1.8 },
                        s !== 'idle' && { shadowColor: t.cell },
                      ]}
                    >
                      {s !== 'idle' && (isMultiSelect ? <Icon name="check" size={13} color={t.cell} /> : <View style={[styles.dot, { backgroundColor: t.cell }]} />)}
                    </View>
                    <View style={{ flex: 1 }}>
                      <OptionContent>{opt}</OptionContent>
                    </View>
                  </View>
                  {rationale && (
                    <Text variant="footnote" color={s === 'right' ? 'green' : s === 'wrong' ? 'red' : 'label2'} style={styles.optRationale}>
                      {rationale}
                    </Text>
                  )}
                </PressableScale>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footWrap} pointerEvents="box-none">
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={[styles.footbar, shadow.floating]}
        >
          {!revealed ? (
            <PressableScale style={[styles.btn, { backgroundColor: canSubmit ? t.blue : t.fill }, continuousCurve]} disabled={!canSubmit || answer.isPending} onPress={onSubmit}>
              {answer.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color={canSubmit ? 'onColor' : 'label3'}>Submit</Text>}
            </PressableScale>
          ) : (
            <PressableScale
              style={[styles.btn, styles.btnRow, { backgroundColor: result!.is_correct ? t.green : t.red }, continuousCurve]}
              onPress={onNext}
            >
              <Icon name={result!.is_correct ? 'check' : 'x'} size={18} color="#fff" />
              <Text variant="headline" color="onColor">{result!.is_done ? 'See results' : 'Next'}</Text>
            </PressableScale>
          )}
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  optCard: { borderRadius: radius.cell, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 44 },
  sep: { height: hairline, marginLeft: spacing.lg },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  checkbox: { borderRadius: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  optRationale: { paddingLeft: spacing.lg + 22 + spacing.md, paddingRight: spacing.lg, paddingBottom: spacing.md, lineHeight: 18 },
  footWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  footbar: { flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, overflow: 'hidden' },
  btn: { flex: 1, borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
  btnRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
});
