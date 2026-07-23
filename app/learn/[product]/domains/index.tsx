import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../src/components/Text';
import { Icon } from '../../../../src/components/Icon';
import { PressableScale } from '../../../../src/components/PressableScale';
import { useDomains, useObjectives } from '../../../../src/api/hooks/practice';
import { ProficiencyBadge } from '../../../../src/components/ProficiencyBadge';
import { useTheme, spacing, radius, continuousCurve } from '../../../../src/theme/tokens';

/** Domain browsing screen — lists domains with lessons count and latest assessment status.
 * Pushed (not presented modally) from the course-home "Practice" row, so the leading
 * control is a back-chevron rather than a close X (§ Apple HIG: X is for dismissing a
 * modally-presented task, chevron-back is for a regular push). */
export default function DomainsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const { data, isLoading, isError } = useDomains(product);
  // `/domains` itself carries no proficiency (docs/11-home-courses-progress-spec.md
  // §11.3) — domain-scope entries only exist on `/objectives`'s proficiency map.
  const { data: objectivesData } = useObjectives(product);
  const proficiency = objectivesData?.proficiency ?? {};

  const rawDomains = !Array.isArray(data) && data && Array.isArray((data as any).domains)
    ? (data as any).domains
    : data;
  const domains = Array.isArray(rawDomains) ? rawDomains : (rawDomains ? [rawDomains] : []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={styles.navBtn} accessibilityLabel="Back">
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={22} color={t.blue} />
          </View>
        </PressableScale>
        <Text variant="headline">Domains</Text>
        <View style={{ width: 28 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={t.blue} /></View>
      ) : isError || !data ? (
        <Text variant="body" color="label2" style={{ textAlign: 'center', marginTop: spacing.xl }}>No domains available.</Text>
      ) : (
        <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={styles.list}>
          {domains.map((domain: any, i: number) => {
            const domainProficiency = proficiency[`domain:${domain.id}`];
            return (
              <PressableScale
                key={domain.id || i}
                onPress={() => router.push(`/learn/${product}/domains/${domain.slug}`)}
                style={[styles.domainCard, { backgroundColor: t.cell }, continuousCurve]}
                accessibilityLabel={`Domain ${domain.name}: ${domain.objectives_count ?? 0} objectives, ${domain.topics_count ?? 0} topics, ${domain.concepts_count ?? 0} concepts`}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="headline" numberOfLines={2}>{domain.number ? `${domain.number}. ` : ''}{domain.name}</Text>
                  <Text variant="footnote" color="label2" style={{ marginTop: spacing.xs }}>
                    {domain.objectives_count ?? 0} objectives · {domain.topics_count ?? 0} topics · {domain.concepts_count ?? 0} concepts
                  </Text>
                  {domainProficiency && <ProficiencyBadge entry={domainProficiency} style={styles.proficiencyBadge} />}
                </View>
                <Icon name="chevron" size={14} color={t.label3} />
              </PressableScale>
            );
          })}
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
  list: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.sm },
  domainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.cell, padding: spacing.lg, overflow: 'hidden' },
  proficiencyBadge: { marginTop: spacing.xs },
});
