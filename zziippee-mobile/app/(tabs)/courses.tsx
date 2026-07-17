import { ScrollView, Pressable, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getData } from '../../src/api/client';
import { Text } from '../../src/components/Text';
import { Poster } from '../../src/components/Poster';
import { useTheme, spacing, radius } from '../../src/theme/tokens';

interface Enrollment { slug: string; name: string; code: string; vendor: string; mastery: number; expires: string; art: 'security' | 'cc' }

export default function CoursesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['enrollments'], queryFn: () => getData<Enrollment[]>('/enrollments'), staleTime: 120_000 });
  const list = data ?? FALLBACK;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={{ marginBottom: spacing.xs }}>Courses</Text>
        {list.map((c) => (
          <Pressable key={c.slug} onPress={() => router.push(`/learn/${c.slug}`)}>
            <Poster art={c.art} style={styles.card}>
              <Text style={styles.code}>{c.code}</Text>
              <View>
                <Text variant="caption" style={styles.kicker}>{c.vendor.toUpperCase()} · {c.mastery}% READY</Text>
                <Text variant="title2" color="onColor">{c.name}</Text>
                <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Expires {c.expires}</Text>
              </View>
            </Poster>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const FALLBACK: Enrollment[] = [
  { slug: 'comptia-security-plus', name: 'Security+', code: 'S+', vendor: 'CompTIA', mastery: 64, expires: '14 Mar', art: 'security' },
  { slug: 'isc2-cc', name: 'ISC2 CC', code: 'CC', vendor: 'ISC2', mastery: 21, expires: '02 Sep', art: 'cc' },
];

const styles = StyleSheet.create({
  safe: { flex: 1 },
  card: { borderRadius: radius.card, aspectRatio: 16 / 9, padding: spacing.xl },
  code: { position: 'absolute', top: 10, right: 18, fontSize: 60, fontWeight: '800', letterSpacing: -2, color: 'rgba(255,255,255,0.16)' },
  kicker: { letterSpacing: 1.2, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
});
