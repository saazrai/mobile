import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../../src/components/Text';
import { Icon } from '../../../../../src/components/Icon';
import { PressableScale } from '../../../../../src/components/PressableScale';
import { useObjectiveAttempts, type ObjectiveAttempt } from '../../../../../src/api/hooks/practice';
import { formatShortDate } from '../../../../../src/utils/formatDate';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type Palette } from '../../../../../src/theme/tokens';

/** Full attempt history for one objective — every attempt, not just the latest
 * (mirrors the web Attempts page). Reached from the objective row's "all
 * attempts" icon on the domain's objective list. */
export default function ObjectiveAttemptsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product, objective: objectiveSlug, domain: domainSlug } = useLocalSearchParams<{ product: string; objective: string; domain?: string }>();
  const { data, isLoading, isError } = useObjectiveAttempts(product, objectiveSlug);

  const openAttempt = (attempt: ObjectiveAttempt) => {
    const params = new URLSearchParams({ product: product ?? '' });
    if (domainSlug) params.set('domain', domainSlug);
    if (attempt.can_resume) {
      router.push(`/assessment/${attempt.id}/quiz?${params.toString()}`);
    } else {
      router.push(`/assessment/${attempt.id}/review?${params.toString()}`);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={styles.navBtn} accessibilityLabel="Back">
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={22} color={t.blue} />
          </View>
        </PressableScale>
        <Text variant="headline" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
          {data?.objective.name ?? 'Attempts'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={t.blue} /></View>
      ) : isError || !data ? (
        <View style={styles.center}><Text variant="body" color="label2">Couldn't load your attempts.</Text></View>
      ) : data.attempts.length === 0 ? (
        <View style={styles.center}><Text variant="body" color="label2">No attempts yet.</Text></View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={[styles.summary, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
            <SummaryStat label="BEST" value={`${Math.round(data.summary.bestScore)}%`} t={t} />
            <View style={[styles.divider, { backgroundColor: t.separator }]} />
            <SummaryStat label="AVERAGE" value={`${Math.round(data.summary.averageScore)}%`} t={t} />
            <View style={[styles.divider, { backgroundColor: t.separator }]} />
            <SummaryStat label="ATTEMPTS" value={String(data.summary.totalAttempts)} t={t} />
          </Animated.View>

          <Text variant="footnote" color="label2" style={styles.sectionHeader}>ALL ATTEMPTS</Text>
          <View style={[styles.list, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
            {data.attempts.map((attempt, i) => (
              <AttemptRow key={attempt.id} attempt={attempt} showSeparator={i > 0} onPress={() => openAttempt(attempt)} t={t} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryStat({ label, value, t }: { label: string; value: string; t: Palette }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text variant="title2">{value}</Text>
      <Text variant="footnote" color="label3" style={{ marginTop: 2, letterSpacing: 0.3 }}>{label}</Text>
    </View>
  );
}

function AttemptRow({ attempt, showSeparator, onPress, t }: { attempt: ObjectiveAttempt; showSeparator: boolean; onPress: () => void; t: Palette }) {
  const isCompleted = attempt.status === 'completed';
  const statusColor = isCompleted ? (attempt.score != null && attempt.score >= 65 ? t.green : attempt.score != null && attempt.score >= 45 ? t.orange : t.red) : t.orange;
  const statusLabel = isCompleted ? `${Math.round(attempt.score ?? 0)}%` : attempt.status === 'paused' ? 'Paused' : 'In progress';

  return (
    <PressableScale onPress={onPress} accessibilityLabel={`Attempt from ${formatShortDate(attempt.created_at)}: ${statusLabel}`}>
      {showSeparator && <View style={[styles.sep, { backgroundColor: t.separator }]} />}
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text variant="subhead">{formatShortDate(attempt.created_at)}</Text>
          <Text variant="footnote" color="label3" style={{ marginTop: 2 }}>
            {attempt.answered_questions ?? 0}/{attempt.total_questions ?? 0} answered
          </Text>
        </View>
        <Text variant="headline" style={{ color: statusColor }}>{statusLabel}</Text>
        <Icon name="chevron" size={14} color={t.label3} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  summary: { flexDirection: 'row', borderRadius: radius.card, paddingVertical: spacing.lg },
  divider: { width: hairline, marginVertical: spacing.xs },
  sectionHeader: { marginTop: spacing.xxl, marginBottom: spacing.sm, letterSpacing: 0.3, textTransform: 'uppercase' },
  list: { borderRadius: radius.cell, overflow: 'hidden' },
  sep: { height: hairline, marginLeft: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 44 },
});
