import { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../src/components/Text';
import { Icon } from '../../../../src/components/Icon';
import { PressableScale } from '../../../../src/components/PressableScale';
import { useDomains } from '../../../../src/api/hooks/practice';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../../../src/theme/tokens';

/** Domain browsing screen — lists domains with lessons count and latest assessment status. */
export default function DomainsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">Domains</Text>
        <View style={{ width: 28 }} />
      </View>

      {selectedDomain ? (
        <DomainDetail domainId={selectedDomain} onBack={() => setSelectedDomain(null)} t={t} router={router} />
      ) : (
        <DomainList productSlug={product} onSelect={(id) => setSelectedDomain(id)} t={t} />
      )}
    </SafeAreaView>
  );
}

function DomainList({ productSlug, onSelect, t }: { productSlug: string; onSelect: (id: string) => void; t: any }) {
  const { data, isLoading, isError } = useDomains(productSlug);

  if (isLoading) return <View style={styles.center}><ActivityIndicator color={t.blue} /></View>;
  if (isError || !data) return <Text variant="body" color="label2">No domains available.</Text>;

  const domains = Array.isArray(data) ? data : [data];

  return (
    <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={styles.list}>
      {domains.map((domain: any, i: number) => (
        <PressableScale key={domain.id || i} onPress={() => onSelect(domain.id)} style={[styles.domainCard, { backgroundColor: t.cell }, continuousCurve]}>
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

function DomainDetail({ domainId, onBack, t, router }: { domainId: string; onBack: () => void; t: any; router: any }) {
  // Placeholder for domain detail view — would show objectives and start practice button
  return (
    <View style={styles.detail}>
      <PressableScale onPress={onBack} hitSlop={12} style={styles.navBtn}>
        <Icon name="x" size={20} color={t.blue} />
      </PressableScale>
      <Text variant="headline">Domain {domainId}</Text>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text variant="body" color="label2">Domain detail view coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  list: { flex: 1, paddingHorizontal: spacing.lg, gap: spacing.sm },
  domainCard: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.cell, padding: spacing.lg, overflow: 'hidden' },
  detail: { flex: 1, paddingTop: spacing.md },
});
