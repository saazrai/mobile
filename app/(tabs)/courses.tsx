// app/(tabs)/courses.tsx
import { ScrollView, Pressable, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getData } from '../../src/api/client';
import { Text } from '../../src/components/Text';
import { Poster } from '../../src/components/Poster';
import { useTheme, spacing, radius } from '../../src/theme/tokens';
import { courseMetaFor } from '../../src/theme/courseArt';
import { formatShortDate } from '../../src/utils/formatDate';

interface Enrollment {
  id: number;
  course: { name: string; code: string } | null;
  product: { name: string; slug: string } | null;
  enrolled_at: string | null;
}

export default function CoursesScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['enrollments'], queryFn: () => getData<Enrollment[]>('/enrollments'), staleTime: 120_000 });
  const list = data ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120, gap: spacing.lg }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={{ marginBottom: spacing.xs }}>Courses</Text>
        {isLoading ? <View style={styles.status}><ActivityIndicator color={t.blue} /></View> : isError ? (
          <View style={[styles.status, { backgroundColor: t.cell }]}>
            <Text variant="body" color="label2">Couldn't load your courses.</Text>
            <Pressable onPress={() => refetch()} accessibilityLabel="Retry loading courses"><Text variant="headline" color="blue">Retry</Text></Pressable>
          </View>
        ) : list.map((e) => {
          const slug = e.product?.slug;
          const meta = courseMetaFor(slug);
          const name = e.course?.name ?? e.product?.name ?? 'Course';
          const code = e.course?.code ?? '';
          const enrolledLabel = formatShortDate(e.enrolled_at);
          return (
            <Pressable key={e.id} onPress={() => slug && router.push(`/learn/${slug}`)}>
              <Poster art={meta.art} style={styles.card}>
                <Text style={styles.code}>{code}</Text>
                <View>
                  {meta.vendor ? <Text variant="caption" style={styles.kicker}>{meta.vendor.toUpperCase()}</Text> : null}
                  <Text variant="title2" color="onColor">{name}</Text>
                  {enrolledLabel ? <Text variant="footnote" style={{ color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>Enrolled {enrolledLabel}</Text> : null}
                </View>
              </Poster>
            </Pressable>
          );
        })}
        {!isLoading && !isError && list.length === 0 && <Text variant="body" color="label2">You don't have any enrolled courses yet.</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  card: { borderRadius: radius.card, aspectRatio: 16 / 9, padding: spacing.xl },
  code: { position: 'absolute', top: 10, right: 18, fontSize: 60, fontWeight: '800', letterSpacing: -2, color: 'rgba(255,255,255,0.16)' },
  kicker: { letterSpacing: 1.2, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  status: { alignItems: 'center', padding: spacing.xl, borderRadius: radius.card, gap: spacing.md },
});
