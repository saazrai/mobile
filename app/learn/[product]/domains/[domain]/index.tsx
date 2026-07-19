import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../../src/components/Text';
import { Icon } from '../../../../../src/components/Icon';
import { PressableScale } from '../../../../../src/components/PressableScale';
import { useObjectives, useStartObjective } from '../../../../../src/api/hooks/practice';
import { useTheme, spacing, radius, continuousCurve } from '../../../../../src/theme/tokens';

/** Objectives within one domain — pushed from the domains list. Every row is
 * independently and immediately actionable (tap starts practice for that exact
 * objective right there); there's no separate "start first" button to hunt for,
 * matching how a tappable list row should behave per Apple HIG. */
export default function ObjectiveScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product, domain: domainSlug } = useLocalSearchParams<{ product: string; domain: string }>();
  const { data, isLoading, isError } = useObjectives(product);
  const startObjective = useStartObjective(product);

  const domains = data?.domains ?? [];
  const domain = domains.find((d) => d.slug === domainSlug) ?? domains[0];
  const latestAssessments = data?.latestAssessments ?? {};

  const startPractice = async (objectiveSlug: string) => {
    try {
      const result = await startObjective.mutateAsync(objectiveSlug);
      router.push(`/assessment/${result.assessment_id}/quiz?product=${product}&domain=${domainSlug}`);
    } catch {
      // Error is surfaced by TanStack Query; nothing to do here beyond logging.
    }
  };

  // Resuming an unfinished assessment must reuse its id — starting fresh would
  // orphan it, since /practice/objectives/{objective}/start always creates a new
  // Assessment row rather than resuming one (mirrors the web practice-quiz page).
  const continuePractice = (assessmentId: string) => {
    router.push(`/assessment/${assessmentId}/quiz?product=${product}&domain=${domainSlug}`);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={styles.navBtn} accessibilityLabel="Back to domains">
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={22} color={t.blue} />
          </View>
        </PressableScale>
        <Text variant="headline" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{domain?.name ?? 'Domain'}</Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={t.blue} /></View>
      ) : isError || !domain ? (
        <View style={styles.center}><Text variant="body" color="label2">Couldn't load this domain.</Text></View>
      ) : (domain.objectives ?? []).length === 0 ? (
        <View style={styles.center}>
          <Text variant="body" color="label2">No objectives available for this domain.</Text>
        </View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={{ flex: 1 }}>
          <Text variant="footnote" color="label2" style={styles.sectionHeader}>OBJECTIVES</Text>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0, gap: spacing.sm }} showsVerticalScrollIndicator={false}>
            {(domain.objectives ?? []).map((obj, i) => {
              const lastAssessment = latestAssessments[String(obj.id)];
              const hasReview = lastAssessment != null && lastAssessment.status === 'completed';
              const isUnfinished = lastAssessment != null && (lastAssessment.status === 'in_progress' || lastAssessment.status === 'paused');
              const scoreColor = hasReview ? (lastAssessment.score >= 65 ? t.green : lastAssessment.score >= 45 ? t.orange : t.red) : undefined;
              const busy = startObjective.isPending && startObjective.variables === obj.slug;
              return (
                <Animated.View key={obj.id || obj.slug || i} entering={FadeInDown.delay(Math.min(i, 8) * 60).duration(350)}>
                  <PressableScale
                    style={[styles.objectiveCard, { backgroundColor: t.cell }, continuousCurve]}
                    onPress={() => (isUnfinished ? continuePractice(lastAssessment.id) : startPractice(obj.slug))}
                    disabled={startObjective.isPending}
                    accessibilityLabel={isUnfinished ? `Continue practice for ${obj.name}` : `Start practice for ${obj.name}`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="subhead" color="label2">
                        {obj.number ? `${obj.number} · ` : ''}{obj.name}
                      </Text>
                      {hasReview && (
                        <Text variant="footnote" color="label3" style={{ marginTop: 2 }}>
                          Last score: <Text variant="footnote" style={{ color: scoreColor, fontWeight: '600' }}>{Math.round(lastAssessment.score)}%</Text>
                        </Text>
                      )}
                    </View>
                    {hasReview && (
                      <PressableScale
                        style={[styles.reviewBtn, { backgroundColor: t.fill }, continuousCurve]}
                        onPress={() => router.push(`/assessment/${lastAssessment.id}/review?product=${product}&domain=${domainSlug}`)}
                        accessibilityLabel={`Review your last attempt on ${obj.name}: ${Math.round(lastAssessment.score)}%`}
                      >
                        <Text variant="footnote" color="blue" style={{ fontWeight: '600' }}>Review</Text>
                      </PressableScale>
                    )}
                    {isUnfinished ? (
                      <View style={[styles.continueBtn, { backgroundColor: t.orange }, continuousCurve]}>
                        <Text variant="footnote" color="onColor" style={{ fontWeight: '700' }}>Continue</Text>
                      </View>
                    ) : (
                      <View style={[styles.playBtn, { backgroundColor: t.blue }]}>
                        {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="play" size={14} color="#fff" filled />}
                      </View>
                    )}
                  </PressableScale>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  sectionHeader: { paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm, letterSpacing: 0.3, textTransform: 'uppercase' },
  objectiveCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.cell, padding: spacing.lg, overflow: 'hidden' },
  playBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  reviewBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginLeft: spacing.sm },
  continueBtn: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginLeft: spacing.sm },
});
