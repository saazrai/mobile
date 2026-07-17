import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { ProgressRing } from '../../../src/components/ProgressRing';
import { useExamResults, type ExamDomainPerformance } from '../../../src/api/hooks/exam';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type Palette } from '../../../src/theme/tokens';

/** Screen N — Exam Results (docs/08-exam-spec.md §8.7). Score vs the exam's own
 * passing_percentage (never a hardcoded threshold), domain breakdown, Review CTA
 * gated by can_review — mirrors ExamsController::results 1:1 (§8.4). */
export default function ExamResultsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, isLoading, isError } = useExamResults(id);

  const done = () => router.replace('/(tabs)');

  if (isLoading) {
    return <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}><ActivityIndicator color={t.blue} /></SafeAreaView>;
  }
  if (isError || !data) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}>
        <Text variant="body" color="label2">Couldn't load your results.</Text>
        <PressableScale style={[styles.doneBtn, { backgroundColor: t.blue, marginTop: spacing.xl }, continuousCurve]} onPress={done}>
          <Text variant="headline" color="onColor">Done</Text>
        </PressableScale>
      </SafeAreaView>
    );
  }

  const { assessment, summary } = data;
  const isPassing = assessment.score >= data.passing_percentage;
  const scoreColor = isPassing ? t.green : t.red;
  const domains = summary.domains.performance;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={done} hitSlop={12} style={styles.navBtn}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">Results</Text>
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
          <View style={[styles.badge, { backgroundColor: isPassing ? `${t.green}22` : `${t.red}22` }, continuousCurve]}>
            <Text variant="footnote" style={{ color: scoreColor, fontWeight: '700', letterSpacing: 0.3 }}>
              {isPassing ? 'PASS' : 'FAIL'} · PASSING SCORE {data.passing_percentage}%
            </Text>
          </View>
          <Text variant="subhead" color="label2" style={{ marginTop: spacing.sm }}>
            {assessment.correct_answers} of {assessment.total_questions} correct · {data.exam_type_name}
          </Text>
          <Text variant="footnote" color="label2" style={{ marginTop: 2 }}>
            Time taken: {formatDuration(assessment.duration_seconds)}
          </Text>
        </Animated.View>

        {domains.length > 0 && (
          <>
            <Text variant="footnote" color="label2" style={styles.sectionHeader}>DOMAIN PERFORMANCE</Text>
            <View style={[styles.card, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
              {domains.map((d, i) => (
                <DomainBar key={d.id} domain={d} t={t} isLast={i === domains.length - 1} passingPercentage={data.passing_percentage} />
              ))}
            </View>
          </>
        )}

        {data.can_review && (
          <PressableScale
            style={[styles.reviewCta, { backgroundColor: t.cell }, continuousCurve, shadow.card]}
            onPress={() => router.push(`/exam/${id}/review`)}
          >
            <Icon name="book" size={18} color={t.blue} />
            <Text variant="headline" color="blue" style={{ flex: 1 }}>Review Questions & Answers</Text>
            <Icon name="chevron" size={14} color={t.label3} />
          </PressableScale>
        )}
      </ScrollView>

      <View style={[styles.footbar, { borderTopColor: t.separator, backgroundColor: t.sysBg }]}>
        <PressableScale style={[styles.doneBtn, { backgroundColor: t.blue }, continuousCurve]} onPress={done}>
          <Text variant="headline" color="onColor">Done</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

function DomainBar({ domain, t, isLast, passingPercentage }: { domain: ExamDomainPerformance; t: Palette; isLast: boolean; passingPercentage: number }) {
  const color = domain.accuracy >= 75 ? t.green : domain.accuracy >= 55 ? t.orange : t.red;
  return (
    <View>
      <View style={styles.domainRow}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <Text variant="body" numberOfLines={1}>{domain.name}</Text>
          <View style={[styles.track, { backgroundColor: t.fill }]}>
            <View style={[styles.fill, { backgroundColor: color, width: `${domain.accuracy}%` }]} />
            <View style={[styles.passMarker, { left: `${passingPercentage}%`, backgroundColor: t.label3 }]} />
          </View>
        </View>
        <Text variant="headline" style={{ color }}>{domain.accuracy}%</Text>
      </View>
      {!isLast && <View style={[styles.sep, { backgroundColor: t.separator }]} />}
    </View>
  );
}

function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  hero: { alignItems: 'center', borderRadius: radius.card, paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg },
  badge: { marginTop: spacing.md, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  sectionHeader: { marginTop: spacing.xxl, marginBottom: spacing.sm, letterSpacing: 0.4 },
  card: { borderRadius: radius.cell, paddingHorizontal: spacing.lg, overflow: 'hidden' },
  domainRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  track: { height: 6, borderRadius: 3, marginTop: spacing.xs, overflow: 'visible' },
  fill: { height: 6, borderRadius: 3 },
  passMarker: { position: 'absolute', top: -3, width: 2, height: 12 },
  sep: { height: hairline },
  reviewCta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radius.cell, padding: spacing.lg, marginTop: spacing.xl },
  footbar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.xl, paddingTop: spacing.md, borderTopWidth: hairline },
  doneBtn: { borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
});
