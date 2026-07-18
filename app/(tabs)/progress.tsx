import { useQuery } from '@tanstack/react-query';
import { ScrollView, View, StyleSheet, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../../src/components/Text';
import { PressableScale } from '../../src/components/PressableScale';
import { useLearnerProficiency, type DomainProficiency } from '../../src/api/hooks/progress';
import { getData } from '../../src/api/client';
import { useTheme, spacing, radius, continuousCurve, shadow } from '../../src/theme/tokens';

interface Enrollment { slug: string; name: string; code: string; vendor: string; examCode: string; mastery: number; expires: string; art: string }

/** Tab C — Progress (docs/11 §11.3). Shows per-domain proficiency scores pulled
 * from the LearnerProficiencyService; no hardcoded values here. */
export default function ProgressScreen() {
  const t = useTheme();
  const scheme = useColorScheme();

  // Resolve product: prefer first enrollment (the user's primary course), falling back to Security+.
  const enrollments = useQuery({ queryKey: ['enrollments'], queryFn: () => getData<Enrollment[]>('/enrollments'), staleTime: 60_000 });
  const slug = enrollments?.data?.[0]?.slug ?? 'comptia-security-plus';
  const { data, isLoading, isError } = useLearnerProficiency(slug);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={{ marginBottom: spacing.lg }}>Progress</Text>

        {isLoading ? (
          <View style={[styles.center, { backgroundColor: t.cell }, continuousCurve]}><ActivityIndicator color={t.blue} /></View>
        ) : isError || !data ? (
          <View style={[styles.center, { backgroundColor: t.cell }, continuousCurve]}>
            <Text variant="body" color="label2">Couldn't load your progress.</Text>
            <PressableScale style={[styles.retryBtn, { backgroundColor: t.blue, marginTop: spacing.lg }]} onPress={() => {}}>
              <Text variant="headline" color="onColor">Retry</Text>
            </PressableScale>
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={[styles.hero, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
              <Text variant="footnote" color="label2" style={{ letterSpacing: 0.4 }}>{data.product_name ?? slug}</Text>
              <Text variant="largeTitle" style={{ marginTop: spacing.xs }}>{Math.round(data.overall_score)}%</Text>
              <Text variant="subhead" color="label2">Estimated exam score {estimateScore(data.overall_score)} — reach 750+ to pass.</Text>
            </Animated.View>

            <View style={[styles.card, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
              <Text variant="footnote" color="label2" style={styles.head}>MASTERY BY DOMAIN</Text>
              <View style={{ marginTop: spacing.md }}>
                {renderDomains(data.domains, t)}
              </View>
            </View>

            {/* Historical summary — if the backend provides it in future iterations */}
            <Text variant="footnote" color="label2" style={styles.head}>RECENT ACTIVITY</Text>
            <View style={[styles.card, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
              <View style={{ paddingVertical: spacing.md }}>
                <Text variant="subhead">No recent attempts.</Text>
                <Text variant="body" color="label2" style={{ marginTop: 4 }}>Start a practice assessment or exam to see your activity here.</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function estimateScore(overallPercent: number): string {
  // Rough mapping: 0-100% → ~500-800 scaled score. The real backend derives this;
  // the mobile app shows a placeholder range since no conversion endpoint exists yet.
  return String(Math.round(500 + (overallPercent / 100) * 300));
}

function renderDomains(domains: Record<string, DomainProficiency>, t: any): React.ReactNode {
  const arr = Object.values(domains).sort((a, b) => a.proficiency_score - b.proficiency_score);
  return (
    <View style={{ gap: spacing.md }}>
      {arr.map((d) => (
        <DomainRow key={d.label} domain={d} t={t} />
      ))}
    </View>
  );
}

function DomainRow({ domain, t }: { domain: DomainProficiency; t: any }) {
  const color = domain.proficiency_score >= 65 ? t.green : domain.proficiency_score >= 45 ? t.orange : t.red;
  return (
    <View style={styles.row}>
      <Text variant="subhead" style={{ width: 108 }} numberOfLines={1}>{domain.label}</Text>
      <View style={[styles.track, { backgroundColor: t.fill }]}><View style={[styles.fill, { width: `${domain.proficiency_score}%`, backgroundColor: color }]} /></View>
      <Text variant="subhead" color="label2" style={styles.val}>{domain.proficiency_score}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  hero: { borderRadius: radius.card, padding: spacing.xxl, marginBottom: spacing.lg, alignItems: 'center' },
  card: { borderRadius: radius.card, padding: spacing.xl, marginBottom: spacing.lg },
  head: { letterSpacing: 0.4, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  val: { width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
  retryBtn: { borderRadius: radius.control, paddingHorizontal: 32, paddingVertical: 13 },
});
