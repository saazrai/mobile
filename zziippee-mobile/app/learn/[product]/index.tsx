import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getData } from '../../../src/api/client';
import { useStartObjective } from '../../../src/api/hooks/practice';
import { Text } from '../../../src/components/Text';
import { Section, Row } from '../../../src/components/List';
import { Poster } from '../../../src/components/Poster';
import { useTheme, spacing, radius } from '../../../src/theme/tokens';

interface CourseHome {
  course: { name: string; code: string; vendor: string };
  tiles: { slug: string; name: string; enabled: boolean }[];
}

/** Cinematic course hero over a grouped-inset mode list (matches the mockup). */
export default function CourseScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const { data } = useQuery({ queryKey: ['course', product], queryFn: () => getData<CourseHome>(`/learn/${product}`), staleTime: 300_000 });
  const start = useStartObjective();

  const c = data?.course ?? { name: 'Security+', code: 'S+', vendor: 'CompTIA · SY0-701' };

  const startPractice = async () => {
    const s = await start.mutateAsync('ethics'); // objective slug (mock accepts any)
    router.push(`/assessment/${s.assessment_id}/quiz`);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.sysBg }]}>
      <Poster art="security" style={styles.hero}>
        <Text style={styles.heroCode}>{c.code}</Text>
        <View style={{ padding: spacing.xl }}>
          <Text variant="caption" style={styles.kicker}>{c.vendor.toUpperCase()}</Text>
          <Text variant="title1" color="onColor">{c.name}</Text>
        </View>
      </Poster>

      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Section style={{ marginTop: spacing.lg }}>
          <Row icon="brain" iconBg={t.blue} label="Practice" value="Adaptive" onPress={startPractice} />
          <Row icon="book" iconBg={t.indigo} label="Study notes" onPress={() => router.push(`/learn/${product}/study-notes`)} />
          <Row icon="layers" iconBg={t.orange} label="Flashcards" value="24" onPress={() => router.push(`/learn/${product}/flashcards`)} />
          <Row icon="video" iconBg={t.red} label="Videos" onPress={() => router.push(`/learn/${product}/videos`)} />
        </Section>
        <Section footer="Performance-based questions are available on the web app (desktop recommended).">
          <Row icon="clock" iconBg={t.green} label="Exam simulation" value="90 · 90m" onPress={() => router.push(`/learn/${product}/exams`)} />
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { height: 230, paddingTop: 40 },
  heroCode: { position: 'absolute', top: 28, right: 20, fontSize: 96, fontWeight: '800', letterSpacing: -3, color: 'rgba(255,255,255,0.16)' },
  kicker: { letterSpacing: 1.4, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  sheet: { flex: 1, marginTop: -16, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, backgroundColor: 'transparent' },
});
