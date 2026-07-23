import { View, ScrollView, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { useReview, type ReviewQuestion } from '../../../src/api/hooks/practice';
import { OptionContent } from '../../../src/components/OptionContent';
import { questionMarkdownStyle } from '../../../src/components/markdownStyles';
import { scrollableMarkdownRules } from '../../../src/components/markdownRules';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type Palette } from '../../../src/theme/tokens';

/** Post-quiz review — score, mastery, per-question correct/incorrect + rationale (docs/05 §K). */
export default function ReviewScreen() {
  const t = useTheme();
  const scheme = useColorScheme();
  const router = useRouter();
  const { id, product, domain } = useLocalSearchParams<{ id: string; product?: string; domain?: string }>();
  const { data, isLoading, isError } = useReview(id, product);

  const done = () => {
    if (product && domain) return router.replace(`/learn/${product}/domains/${domain}`);
    if (product) return router.replace(`/learn/${product}/domains`);
    return router.replace('/(tabs)');
  };

  if (isLoading) {
    return <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}><ActivityIndicator color={t.blue} /></SafeAreaView>;
  }
  if (isError || !data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}>
        <Text variant="body" color="label2">Couldn't load your review.</Text>
        <PressableScale style={[styles.btn, { backgroundColor: t.blue, marginTop: spacing.xl }, continuousCurve]} onPress={done}>
          <Text variant="headline" color="onColor">Done</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  const { assessment, questions } = data;
  // Canonical color from LearnerProficiencyService::colorsForLevel() (via the
  // score band on this assessment) — don't recompute thresholds client-side,
  // see docs/11-home-courses-progress-spec.md §11.3.
  const scoreColor = assessment.proficiency_color?.[scheme === 'dark' ? 'dark' : 'light']?.text ?? t.blue;

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
        <Animated.View
          entering={FadeInDown.duration(500).springify().damping(18)}
          style={[styles.hero, { backgroundColor: t.cell }, continuousCurve, shadow.card]}
        >
          <ProgressRing progress={assessment.score / 100} size={112} strokeWidth={9} color={scoreColor} track={t.fill}>
            <Text variant="title1" style={{ color: scoreColor }}>{Math.round(assessment.score)}%</Text>
          </ProgressRing>
          {assessment.mastery_label && (
            <View style={[styles.badge, { backgroundColor: t.fill }, continuousCurve]}>
              <Text variant="footnote" color="label2" style={{ fontWeight: '700', letterSpacing: 0.3 }}>
                {assessment.mastery_label.toUpperCase()}
              </Text>
            </View>
          )}
          <Text variant="subhead" color="label2" style={{ marginTop: spacing.sm }}>
            {assessment.correct_answers} of {assessment.total_questions} correct
          </Text>
        </Animated.View>

        <Text variant="footnote" color="label2" style={styles.sectionHeader}>QUESTIONS</Text>
        {questions.map((q, i) => (
          <QuestionCard key={q.id} q={q} index={i + 1} t={t} delay={i} />
        ))}
      </ScrollView>

      <BlurView
        intensity={40}
        tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
        style={[styles.footbar, { borderTopColor: t.separator }]}
      >
        <PressableScale style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]} onPress={done}>
          <Text variant="headline" color="onColor">Done</Text>
        </PressableScale>
      </BlurView>
    </SafeAreaView>
  );
}

function QuestionCard({ q, index, t, delay }: { q: ReviewQuestion; index: number; t: Palette; delay: number }) {
  const scheme = useColorScheme();
  const correct = q.is_correct ?? false;
  const statusColor = correct ? t.green : t.red;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(Math.min(delay, 6) * 60)}
      style={[styles.qCard, { backgroundColor: t.cell }, continuousCurve, shadow.card]}
    >
      <View style={styles.qHead}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]}>
          <Icon name={correct ? 'check' : 'x'} size={12} color="#fff" />
        </View>
        <Text variant="footnote" color="label2" style={{ fontWeight: '600' }}>QUESTION {index}</Text>
      </View>

      <Markdown style={questionMarkdownStyle(scheme === 'dark')} rules={scrollableMarkdownRules(scheme === 'dark')}>{q.content}</Markdown>

      <View style={styles.optList}>
        {q.options.map((opt, i) => {
          const isCorrectOpt = q.correct_options.includes(opt);
          const isSelected = q.selected_options.includes(opt);
          // Neither correct nor picked — render as a disabled, unfilled radio circle
          // (matches the idle option state on the live quiz screen) instead of a bare
          // chevron, so untouched options read as "not applicable" rather than tappable.
          const idle = !isCorrectOpt && !isSelected;
          const badgeColor = isCorrectOpt ? t.green : isSelected ? t.red : t.label3;
          const rationale = q.justifications[i];
          return (
            <View key={i}>
              <View style={styles.optRow}>
                <View style={[styles.radio, { borderColor: badgeColor, backgroundColor: idle ? 'transparent' : badgeColor }]}>
                  {!idle && <Icon name={isCorrectOpt ? 'check' : 'x'} size={12} color={t.cell} />}
                </View>
                <View style={{ flex: 1 }}>
                  <OptionContent>{opt}</OptionContent>
                </View>
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
  hero: { alignItems: 'center', borderRadius: radius.card, paddingVertical: spacing.xxl },
  badge: { marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  sectionHeader: { marginTop: spacing.xxl, marginBottom: spacing.sm, letterSpacing: 0.4 },
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
