import { View, ScrollView, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { OptionContent } from '../../../src/components/OptionContent';
import { questionMarkdownStyle } from '../../../src/components/markdownStyles';
import { scrollableMarkdownRules } from '../../../src/components/markdownRules';
import { useExamReview, type ExamReviewResponse } from '../../../src/api/hooks/exam';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type Palette } from '../../../src/theme/tokens';

/** Exam answer review — same visual pattern as assessment/[id]/review.tsx, but
 * sourced from the completed-only /exams/{id}/review endpoint, the sole place
 * correct_options/justifications are ever returned for an exam (docs/08 §8.6). */
export default function ExamReviewScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id, product } = useLocalSearchParams<{ id: string; product?: string }>();
  const { data, isLoading, isError } = useExamReview(id, product);

  const done = () => router.replace(`/exam/${id}/results?product=${product}`);

  if (isLoading) {
    return <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}><ActivityIndicator color={t.blue} /></SafeAreaView>;
  }
  if (isError || !data) {
    // Server returns 403 when `allow_review_after_submit` is false or the exam
    // isn't completed — surface that as a "not available" state rather than the
    // raw error. This is the review-gate guard: unauthorized direct navigation
    // to /exam/{id}/review shows this screen with a back-to-results CTA.
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}>
        <Text variant="body" color="label2">Review isn't available for this exam.</Text>
        <PressableScale style={[styles.btn, { backgroundColor: t.blue, marginTop: spacing.xl }, continuousCurve]} onPress={done}>
          <Text variant="headline" color="onColor">Back to results</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={done} hitSlop={12} style={styles.navBtn}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">Review</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>
        <Text variant="footnote" color="label2" style={styles.sectionHeader}>QUESTIONS</Text>
        {data.responses.map((r, i) => (
          <ResponseCard key={r.id} response={r} index={i + 1} t={t} delay={i} />
        ))}
      </ScrollView>

      <View style={[styles.footbar, { borderTopColor: t.separator, backgroundColor: t.sysBg }]}>
        <PressableScale style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]} onPress={done}>
          <Text variant="headline" color="onColor">Back to results</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

function ResponseCard({ response, index, t, delay }: { response: ExamReviewResponse; index: number; t: Palette; delay: number }) {
  const scheme = useColorScheme();
  const { question } = response;
  const answered = response.selected_options.length > 0;
  const statusColor = !answered ? t.orange : response.is_correct ? t.green : t.red;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(Math.min(delay, 6) * 60)}
      style={[styles.qCard, { backgroundColor: t.cell }, continuousCurve, shadow.card]}
    >
      <View style={styles.qHead}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]}>
          <Icon name={!answered ? 'x' : response.is_correct ? 'check' : 'x'} size={12} color="#fff" />
        </View>
        <Text variant="footnote" color="label2" style={{ fontWeight: '600' }}>
          QUESTION {index} · {!answered ? 'UNANSWERED' : response.is_correct ? 'CORRECT' : 'INCORRECT'}
        </Text>
      </View>

      <Markdown style={questionMarkdownStyle(scheme === 'dark')} rules={scrollableMarkdownRules(scheme === 'dark')}>{question.content}</Markdown>

      <View style={styles.optList}>
        {question.options.map((opt, i) => {
          const isCorrectOpt = question.correct_options.includes(opt);
          const isSelected = response.selected_options.includes(opt);
          const idle = !isCorrectOpt && !isSelected;
          const badgeColor = isCorrectOpt ? t.green : isSelected ? t.red : t.label3;
          const rationale = question.justifications[i];
          return (
            <View key={i}>
              <View style={styles.optRow}>
                <View style={[styles.radio, { borderColor: badgeColor, backgroundColor: idle ? 'transparent' : badgeColor }]}>
                  {!idle && <Icon name={isCorrectOpt ? 'check' : 'x'} size={12} color={t.cell} />}
                </View>
                <View style={{ flex: 1 }}><OptionContent>{opt}</OptionContent></View>
              </View>
              {rationale && (
                <Text variant="footnote" color={isCorrectOpt ? 'green' : isSelected ? 'red' : 'label2'} style={styles.optRationale}>
                  {rationale}
                </Text>
              )}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  sectionHeader: { marginBottom: spacing.sm, letterSpacing: 0.4 },
  qCard: { borderRadius: radius.cell, padding: spacing.lg, marginBottom: spacing.md },
  qHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  statusDot: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optList: { marginTop: spacing.md, gap: spacing.sm },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.8, alignItems: 'center', justifyContent: 'center' },
  optRationale: { paddingLeft: 22 + spacing.sm, paddingTop: 2, lineHeight: 18 },
  footbar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.xl, paddingTop: spacing.md, borderTopWidth: hairline },
  btn: { borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
});
