import { ScrollView, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '../../src/components/Text';
import { useTheme, spacing, radius } from '../../src/theme/tokens';

const DOMAINS = [
  { name: 'Concepts', pct: 78 },
  { name: 'Threats', pct: 44 },
  { name: 'Architecture', pct: 69 },
  { name: 'Operations', pct: 71 },
  { name: 'Program mgmt', pct: 52 },
];

export default function ProgressScreen() {
  const t = useTheme();
  const color = (p: number) => (p >= 65 ? t.green : p >= 45 ? t.orange : t.red);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={{ marginBottom: spacing.lg }}>Progress</Text>

        <View style={[styles.card, { backgroundColor: t.cell }]}>
          <Text variant="footnote" color="label2" style={styles.head}>SECURITY+ READINESS</Text>
          <Text variant="largeTitle">64%</Text>
          <Text variant="subhead" color="label2">Estimated exam score 720 — reach 750+ to pass.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: t.cell }]}>
          <Text variant="footnote" color="label2" style={styles.head}>MASTERY BY DOMAIN</Text>
          <View style={{ gap: spacing.md }}>
            {DOMAINS.map((d) => (
              <View key={d.name} style={styles.row}>
                <Text variant="subhead" style={{ width: 108 }} numberOfLines={1}>{d.name}</Text>
                <View style={[styles.track, { backgroundColor: t.fill }]}><View style={[styles.fill, { width: `${d.pct}%`, backgroundColor: color(d.pct) }]} /></View>
                <Text variant="subhead" color="label2" style={styles.val}>{d.pct}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  card: { borderRadius: radius.card, padding: spacing.xl, marginBottom: spacing.lg, gap: 4 },
  head: { letterSpacing: 0.4, marginBottom: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  track: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  val: { width: 28, textAlign: 'right', fontVariant: ['tabular-nums'] },
});
