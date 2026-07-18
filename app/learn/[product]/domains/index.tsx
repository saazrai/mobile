import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../src/components/Text';
import { Icon } from '../../../../src/components/Icon';
import { PressableScale } from '../../../../src/components/PressableScale';
import { useDomains, useStartObjective } from '../../../../src/api/hooks/practice';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../../../src/theme/tokens';

/** Domain browsing screen — lists domains with lessons count and latest assessment status. */
export default function DomainsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={styles.navBtn} accessibilityLabel="Close domains screen">
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">{selectedDomain ? selectedDomain.name : 'Domains'}</Text>
        <View style={{ width: 28 }} />
      </View>

      {selectedDomain ? (
        <ObjectiveList domain={selectedDomain} onBack={() => setSelectedDomain(null)} t={t} router={router} productSlug={product ?? ''} />
      ) : (
        <DomainList productSlug={product} onSelect={(d) => setSelectedDomain(d)} t={t} />
      )}
    </SafeAreaView>
  );
}

function DomainList({ productSlug, onSelect, t }: { productSlug: string; onSelect: (d: any) => void; t: any }) {
  const { data, isLoading, isError } = useDomains(productSlug);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={t.blue} /></View>;
  if (isError || !data) return <Text variant="body" color="label2">No domains available.</Text>;

  const domains = Array.isArray(data) ? data : [data];

  return (
    <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={styles.list}>
      {domains.map((domain: any, i: number) => (
        <PressableScale key={domain.id || i} onPress={() => onSelect(domain)} style={[styles.domainCard, { backgroundColor: t.cell }, continuousCurve]} accessibilityLabel={`Domain ${domain.name}: ${domain.questions_count ?? 0} questions`}>
          <View style={{ flex: 1 }}>
            <Text variant="headline" numberOfLines={2}>{domain.name}</Text>
            <Text variant="footnote" color="label2" style={{ marginTop: spacing.xs }}>
              {domain.questions_count ?? 0} questions · {(domain.lessons ?? []).length} lessons
            </Text>
          </View>
          <Icon name="chevron" size={14} color={t.label3} />
        </PressableScale>
      ))}
    </Animated.View>
  );
}

function ObjectiveList({ domain, onBack, t, router, productSlug }: { domain: any; onBack: () => void; t: any; router: any; productSlug: string }) {
  const startObjective = useStartObjective();
  const objectives = domain.objectives ?? [];

  if (objectives.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="body" color="label2">No objectives available for this domain.</Text>
      </View>
    );
  }

  const startPractice = async (objectiveSlug: string, objectiveName: string) => {
    try {
      const result = await startObjective.mutateAsync(objectiveSlug);
      router.push(`/assessment/${result.assessment_id}/quiz`);
    } catch {
      // Error is surfaced by TanStack Query; nothing to do here beyond logging.
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).springify().damping(18)} style={{ flex: 1 }}>
      <Text variant="subhead" color="label2" style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.sm, letterSpacing: 0.3, textTransform: 'uppercase' }}>
        Objectives in {domain.name}
      </Text>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }} showsVerticalScrollIndicator={false}>
        {objectives.map((obj: any, i: number) => (
          <Animated.View key={obj.id || obj.slug || i} entering={FadeInDown.delay(i * 60).duration(350)}>
            <PressableScale
              style={[styles.objectiveCard, { backgroundColor: t.cell }, continuousCurve]}
              onPress={() => startPractice(obj.slug, obj.name)}
              disabled={startObjective.isPending}
              accessibilityLabel={`Start practice for ${obj.name}: ${obj.questions_count ?? 0} questions`}
            >
              <View style={{ flex: 1 }}>
                <Text variant="subhead" color="label2">
                  {obj.number ? `${obj.number} · ` : ''}{obj.name}
                </Text>
                <Text variant="footnote" color="label3" style={{ marginTop: 2 }}>
                  {obj.questions_count ?? 0} questions
                  {obj.mastery_percent != null && (
                    <>
                      {' · '}
                      <Icon
                        name={obj.mastery_percent >= 65 ? 'check' : obj.mastery_percent >= 45 ? 'clock' : 'x'}
                        size={12}
                        color={obj.mastery_percent >= 65 ? '#34c759' : obj.mastery_percent >= 45 ? '#ff9f0a' : '#ff453a'}
                      />
                      {' '}{obj.mastery_percent}% mastered
                    </>
                  )}
                </Text>
              </View>
              {startObjective.isPending ? (
                <ActivityIndicator color={t.blue} size="small" />
              ) : (
                <Icon name="chevron" size={14} color={t.label3} />
              )}
            </PressableScale>
          </Animated.View>
        ))}

        {/* Floating start-all button */}
        <View style={{ marginTop: spacing.lg }}>
          <PressableScale
            style={[styles.startAllBtn, { backgroundColor: t.blue }, continuousCurve]}
            onPress={() => objectives.length > 0 && startPractice(objectives[0].slug, objectives[0].name)}
            disabled={startObjective.isPending || objectives.length === 0}
            accessibilityLabel="Start practice for first objective"
          >
            {startObjective.isPending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Icon name="play" size={18} color="#fff" filled />
                <Text variant="headline" color="onColor" style={{ marginLeft: spacing.sm }}>Start first objective</Text>
              </>
            )}
          </PressableScale>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  list: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.sm },
  domainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.cell, padding: spacing.lg, overflow: 'hidden' },
  objectiveCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.cell, padding: spacing.lg, overflow: 'hidden' },
  startAllBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.control, paddingVertical: 14, paddingHorizontal: spacing.xl, justifyContent: 'center' },
});
