import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../../src/components/Text';
import { Icon } from '../../../../../src/components/Icon';
import { PressableScale } from '../../../../../src/components/PressableScale';
import { useDomains, useStartObjective } from '../../../../../src/api/hooks/practice';
import { useTheme, spacing, radius, continuousCurve } from '../../../../../src/theme/tokens';

/** Objectives within one domain — pushed from the domains list. Every row is
 * independently and immediately actionable (tap starts practice for that exact
 * objective right there); there's no separate "start first" button to hunt for,
 * matching how a tappable list row should behave per Apple HIG. */
export default function ObjectiveScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product, domain: domainSlug } = useLocalSearchParams<{ product: string; domain: string }>();
  const { data, isLoading, isError } = useDomains(product);
  const startObjective = useStartObjective(product);

  const rawDomains = !Array.isArray(data) && data && Array.isArray((data as any).domains)
    ? (data as any).domains
    : data;
  const domains = Array.isArray(rawDomains) ? rawDomains : (rawDomains ? [rawDomains] : []);
  const domain = domains.find((d: any) => d.slug === domainSlug) ?? domains[0];

  const startPractice = async (objectiveSlug: string) => {
    try {
      const result = await startObjective.mutateAsync(objectiveSlug);
      router.push(`/assessment/${result.assessment_id}/quiz?product=${product}`);
    } catch {
      // Error is surfaced by TanStack Query; nothing to do here beyond logging.
    }
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
            {(domain.objectives ?? []).map((obj: any, i: number) => {
              const masteryColor = obj.mastery_percent == null ? undefined : obj.mastery_percent >= 65 ? t.green : obj.mastery_percent >= 45 ? t.orange : t.red;
              const masteryIcon = obj.mastery_percent == null ? undefined : obj.mastery_percent >= 65 ? 'check' : obj.mastery_percent >= 45 ? 'clock' : 'x';
              const busy = startObjective.isPending && startObjective.variables === obj.slug;
              return (
                <Animated.View key={obj.id || obj.slug || i} entering={FadeInDown.delay(Math.min(i, 8) * 60).duration(350)}>
                  <PressableScale
                    style={[styles.objectiveCard, { backgroundColor: t.cell }, continuousCurve]}
                    onPress={() => startPractice(obj.slug)}
                    disabled={startObjective.isPending}
                    accessibilityLabel={`Start practice for ${obj.name}: ${obj.questions_count ?? 0} questions`}
                  >
                    <View style={{ flex: 1 }}>
                      <Text variant="subhead" color="label2">
                        {obj.number ? `${obj.number} · ` : ''}{obj.name}
                      </Text>
                      <Text variant="footnote" color="label3" style={{ marginTop: 2 }}>
                        {obj.questions_count ?? 0} questions
                        {masteryColor && (
                          <>
                            {' · '}
                            <Icon name={masteryIcon!} size={12} color={masteryColor} />
                            {' '}{obj.mastery_percent}% mastered
                          </>
                        )}
                      </Text>
                    </View>
                    <View style={[styles.playBtn, { backgroundColor: t.blue }]}>
                      {busy ? <ActivityIndicator color="#fff" size="small" /> : <Icon name="play" size={14} color="#fff" filled />}
                    </View>
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
});
