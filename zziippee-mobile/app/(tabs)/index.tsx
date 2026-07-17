import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getData } from '../../src/api/client';
import { Text } from '../../src/components/Text';
import { Icon } from '../../src/components/Icon';
import { Poster } from '../../src/components/Poster';
import { useTheme, spacing, radius } from '../../src/theme/tokens';

interface Dashboard {
  continue: { assessment_id: string; label: string; course: string; progress_percent: number } | null;
  courses: { slug: string; name: string; code: string; mastery: number; art: 'security' | 'cc' }[];
}

export default function HomeScreen() {
  const t = useTheme();
  const router = useRouter();
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: () => getData<Dashboard>('/dashboard'), staleTime: 120_000 });

  const cont = data?.continue;
  const courses = data?.courses ?? [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle" style={styles.title}>Study</Text>
        <Text variant="subhead" color="label2" style={styles.sub}>Tuesday, 17 July</Text>

        {/* Cinematic Continue card */}
        <Pressable
          style={styles.continue}
          onPress={() => cont && router.push(`/assessment/${cont.assessment_id}/quiz`)}
        >
          <Poster art="security" style={styles.continuePoster}>
            <View style={styles.playFab}><Icon name="play" size={22} color="#fff" filled /></View>
            <View style={styles.continueMeta}>
              <Text variant="caption" style={styles.kicker}>CONTINUE · {(cont?.course ?? 'SECURITY+').toUpperCase()}</Text>
              <Text variant="title3" color="onColor" style={{ marginTop: 2 }}>{cont?.label ?? '2.3 Cryptographic solutions'}</Text>
            </View>
            <View style={styles.progressLine}><View style={[styles.progressFill, { width: `${cont?.progress_percent ?? 44}%` }]} /></View>
          </Poster>
        </Pressable>

        <Text variant="footnote" color="label2" style={styles.shelfHead}>YOUR COURSES</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
          {(courses.length ? courses : FALLBACK).map((c) => (
            <Pressable key={c.slug} style={styles.pcard} onPress={() => router.push(`/learn/${c.slug}`)}>
              <Poster art={c.art} style={styles.poster}>
                <Text style={styles.posterCode}>{c.code}</Text>
                <View style={{ padding: spacing.md }}>
                  <Text variant="caption" style={styles.kicker}>{c.mastery}% READY</Text>
                  <Text variant="headline" color="onColor">{c.name}</Text>
                </View>
              </Poster>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const FALLBACK = [
  { slug: 'comptia-security-plus', name: 'Security+', code: 'S+', mastery: 64, art: 'security' as const },
  { slug: 'isc2-cc', name: 'ISC2 CC', code: 'CC', mastery: 21, art: 'cc' as const },
];

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
});
