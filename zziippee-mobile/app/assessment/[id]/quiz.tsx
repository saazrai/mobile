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
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type as ramp } from '../../../src/theme/tokens';

/** Practice loop — iOS styling; scoring is server-authoritative (docs/04 §4.5). */
export default function QuizRunner() {
  const t = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: state, isLoading } = useAssessment(id);
  const answer = useAnswer(id!);

  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);

  const current = question ?? state?.question ?? null;
  const expected = current?.expected_selection_count ?? 1;
  const revealed = result !== null;

  const toggle = (opt: string) => {
    if (revealed) return;
    Haptics.selectionAsync();
    setSelected((p) => (expected === 1 ? [opt] : p.includes(opt) ? p.filter((o) => o !== opt) : [...p, opt]));
  };

  const onSubmit = async () => {
    if (!current) return;
    const res = await answer.mutateAsync({ question_id: current.id, selected_options: selected });
    setResult(res);
    Haptics.notificationAsync(res.is_correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
  };

  const onNext = () => {
    if (!result) return;
    if (result.is_done) return router.replace(`/assessment/${id}/review`);
    setQuestion(result.next_question); setSelected([]); setResult(null);
  };

  const optState = (opt: string): 'idle' | 'sel' | 'right' | 'wrong' => {
    if (!revealed) return selected.includes(opt) ? 'sel' : 'idle';
    if (result!.correct_options.includes(opt)) return 'right';
    if (selected.includes(opt)) return 'wrong';
    return 'idle';
  };
  const radioColor = { idle: t.label3, sel: t.blue, right: t.green, wrong: t.red };

  if (isLoading || !current) {
    return <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}><ActivityIndicator color={t.blue} /></SafeAreaView>;
  }
  const canSubmit = selected.length === expected;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">Practice</Text>
        <ProgressRing
          progress={(state?.progress.answered ?? 0) / Math.max(1, state?.progress.estimatedTotal ?? 1)}
          size={34} strokeWidth={3} color={t.blue} track={t.fill}
        >
          <Text variant="caption" style={{ fontWeight: '700' }}>{(state?.progress.answered ?? 0) + 1}</Text>
        </ProgressRing>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>
        <Text variant="footnote" color="label2" style={styles.meta}>ADAPTIVE PRACTICE</Text>
        <Markdown style={{ body: { ...ramp.headline, color: t.label, marginTop: spacing.md, marginBottom: spacing.xl } as any }}>
          {current.content}
        </Markdown>

        <View style={[continuousCurve, shadow.card]}>
          <View style={[styles.optCard, { backgroundColor: t.cell }, continuousCurve]}>
            {current.options.map((opt, i) => {
              const s = optState(opt);
              const rationale = revealed ? result!.justifications[i] : undefined;
              return (
                <PressableScale key={i} scaleTo={0.985} onPress={() => toggle(opt)}>
                  {i > 0 && <View style={[styles.sep, { backgroundColor: t.separator }]} />}
                  <View style={styles.opt}>
                    <View style={[styles.radio, { borderColor: radioColor[s], backgroundColor: s === 'idle' ? 'transparent' : radioColor[s], borderWidth: 1.8 }, s !== 'idle' && { shadowColor: t.cell }]}>
                      {s !== 'idle' && <View style={[styles.dot, { backgroundColor: t.cell }]} />}
                    </View>
                    <Text variant="body" style={{ flex: 1 }}>{opt}</Text>
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

      <BlurView
        intensity={40}
        tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={[styles.footbar, { borderTopColor: t.separator }]}
      >
        {!revealed ? (
          <PressableScale style={[styles.btn, { backgroundColor: canSubmit ? t.blue : t.fill }, continuousCurve]} disabled={!canSubmit || answer.isPending} onPress={onSubmit}>
            {answer.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color={canSubmit ? 'onColor' : 'label3'}>Submit</Text>}
          </PressableScale>
        ) : (
          <PressableScale style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]} onPress={onNext}>
            <Text variant="headline" color="onColor">{result!.is_done ? 'See results' : 'Next'}</Text>
          </PressableScale>
        )}
      </BlurView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  meta: { fontWeight: '600', letterSpacing: 0.4 },
  optCard: { borderRadius: radius.cell, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 },
  sep: { height: hairline, marginLeft: spacing.lg },
  radio: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  optRationale: { paddingLeft: spacing.lg + 22 + spacing.md, paddingRight: spacing.lg, paddingBottom: spacing.md, lineHeight: 18 },
  footbar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.xl, paddingTop: spacing.md, borderTopWidth: hairline },
  btn: { borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
});
