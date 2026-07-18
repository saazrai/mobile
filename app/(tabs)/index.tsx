import { View, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getData } from '../../src/api/client';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { Poster } from '../../src/components/Poster';
import { useTheme, spacing, radius } from '../../src/theme/tokens';
import { courseMetaFor } from '../../src/theme/courseArt';

interface DashboardData {
  streak_days: number;
  continue: { assessment_id: string; product_slug?: string; label?: string; progress_percent: number } | null;
  weakest_objective: unknown;
  mastery_rollup: number;
}

interface Enrollment {
  id: number;
  product: { id: number; name: string; slug: string } | null;
  course_code: string;
  status: 'active' | 'expired' | 'revoked';
  expires_at: string | null;
  mastery_percent: number;
}

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['dashboard'], queryFn: () => getData<DashboardData>('/dashboard'), staleTime: 120_000 });

  // Fetch enrolled courses separately — /dashboard doesn't include them.
  const { data: enrollmentList } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => getData<Enrollment[]>('/enrollments'),
    staleTime: 120_000,
  });

  const cont = data?.continue;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={styles.title}>Study</Text>
        <Text variant="subhead" color="label2" style={styles.sub}>Tuesday, 17 July</Text>

        {isLoading ? <View style={styles.status}><ActivityIndicator color={t.blue} /></View> : isError ? (
          <View style={[styles.status, { backgroundColor: t.cell }]}>
            <Text variant="body" color="label2">Couldn't load your study data.</Text>
            <Pressable onPress={() => refetch()} accessibilityLabel="Retry loading study data"><Text variant="headline" color="blue">Retry</Text></Pressable>
          </View>
        ) : <>
        {/* Cinematic Continue card */}
        <Pressable
          style={styles.continue}
          onPress={() => cont && router.push(`/assessment/${cont.assessment_id}/quiz?product=${cont.product_slug}`)}
          disabled={!cont}
        >
          <Poster art="security" style={styles.continuePoster}>
            <View style={styles.playFab}><Icon name="play" size={22} color="#fff" filled /></View>
            <View style={styles.continueMeta}>
              <Text variant="caption" style={styles.kicker}>{cont?.product_slug ? `CONTINUE · ${cont.product_slug.toUpperCase()}` : 'ALL CAUGHT UP'}</Text>
              <Text variant="title3" color="onColor" style={{ marginTop: 2 }}>{cont?.label ?? 'Choose a course to keep studying.'}</Text>
            </View>
            <View style={styles.progressLine}><View style={[styles.progressFill, { width: `${cont?.progress_percent ?? 0}%` }]} /></View>
          </Poster>
        </Pressable>

        <Text variant="footnote" color="label2" style={styles.shelfHead}>YOUR COURSES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
          {enrollmentList?.map((e) => {
            const slug = e.product?.slug;
            const meta = courseMetaFor(slug);
            return (
              <Pressable key={e.id} style={styles.pcard} onPress={() => slug && router.push(`/learn/${slug}`)}>
                <Poster art={meta?.art ?? 'security'} style={styles.poster}>
                  <Text style={styles.posterCode}>{e.course_code}</Text>
                  <View style={{ padding: spacing.md }}>
                    <Text variant="caption" style={styles.kicker}>{e.mastery_percent ?? 0}% READY</Text>
                    <Text variant="headline" color="onColor">{e.product?.name ?? 'Course'}</Text>
                  </View>
                </Poster>
              </Pressable>
            );
          }) ?? []}
        </ScrollView>
        {(!enrollmentList || enrollmentList.length === 0) && <Text variant="body" color="label2" style={styles.empty}>No enrolled courses yet.</Text>}
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  title: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  sub: { paddingHorizontal: spacing.xl, marginTop: -2 },
  continue: { marginHorizontal: spacing.xl, marginTop: spacing.lg },
  continuePoster: { borderRadius: radius.card, aspectRatio: 16 / 9, padding: spacing.lg },
  playFab: { position: 'absolute', top: '50%', left: '50%', width: 56, height: 56, borderRadius: 28, marginTop: -28, marginLeft: -28, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  continueMeta: {},
  kicker: { letterSpacing: 1.4, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  progressLine: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.md, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: '#fff' },
  shelfHead: { marginHorizontal: spacing.xl, marginTop: spacing.xxl, letterSpacing: 0.4 },
  shelf: { paddingHorizontal: spacing.xl, gap: 14, paddingTop: spacing.sm },
  pcard: { width: 150 },
  poster: { borderRadius: 14, aspectRatio: 2 / 3 },
  posterCode: { position: 'absolute', top: 8, right: 14, fontSize: 44, fontWeight: '800', letterSpacing: -1, color: 'rgba(255,255,255,0.16)' },
  status: { margin: spacing.xl, padding: spacing.xl, borderRadius: radius.card, alignItems: 'center', gap: spacing.md },
  empty: { marginHorizontal: spacing.xl, marginTop: spacing.md },
});
