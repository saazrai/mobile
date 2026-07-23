import { View, ScrollView, StyleSheet, useColorScheme, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getData } from '../../../src/api/client';
import { Text } from '../../../src/components/Text';
import { Icon, type IconName } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { Section, Row } from '../../../src/components/List';
import { Poster } from '../../../src/components/Poster';
import { ProficiencyBadge } from '../../../src/components/ProficiencyBadge';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type Palette } from '../../../src/theme/tokens';
import { courseMetaFor } from '../../../src/theme/courseArt';
import type { ProficiencyMap } from '../../../src/api/hooks/practice';

/** Real API shape per CurriculumController::courseHome — `product.types` is the
 * admin-managed, per-product list of study modes (dynamic, not a fixed enum).
 * `vendor` and art live in src/theme/courseArt.ts (keyed by product slug),
 * not on this response — see the crash that prompted this correction. */
interface ProductType {
  id: number;
  name: string;
  slug: string;
}

interface CourseHome {
  course: { id: number; name: string; code: string };
  product: { id: number; name: string; slug: string; types: ProductType[] };
  proficiency: ProficiencyMap;
}

/** Maps known product-type slugs (admin-managed, shared with the web app's
 * ProductTypeNav.vue) to the mobile screen and icon for that study mode.
 * Slugs without a mobile screen yet (e.g. "videos") render inert. */
const TYPE_UI: Record<string, { icon: IconName; bg: (t: Palette) => string; path?: (product: string) => string }> = {
  'practice-quiz': { icon: 'brain', bg: (t) => t.blue, path: (p) => `/learn/${p}/domains` },
  'study-notes': { icon: 'book', bg: (t) => t.indigo, path: (p) => `/learn/${p}/study-notes` },
  'flashcards': { icon: 'layers', bg: (t) => t.orange, path: (p) => `/learn/${p}/flashcards` },
  'exam': { icon: 'clock', bg: (t) => t.green, path: (p) => `/learn/${p}/exams` },
  'videos': { icon: 'video', bg: (t) => t.red },
};

/** Cinematic course hero over a grouped-inset mode list (matches the mockup). */
export default function CourseScreen() {
  const t = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['course', product], queryFn: () => getData<CourseHome>(`/learn/${product}`), staleTime: 300_000 });

  const c = data?.course;
  const meta = courseMetaFor(product);
  const courseProficiency = c ? data?.proficiency?.[`course:${c.id}`] : undefined;
  const types = data?.product?.types ?? [];
  const examTypes = types.filter((ty) => ty.slug === 'exam');
  const otherTypes = types.filter((ty) => ty.slug !== 'exam');

  const startPractice = () => {
    router.push(`/learn/${product}/domains`);
  };

  const renderTypeRow = (ty: ProductType) => {
    const ui = TYPE_UI[ty.slug];
    const path = ui?.path?.(product);
    return (
      <Row
        key={ty.id}
        icon={ui?.icon ?? 'bookmark'}
        iconBg={ui ? ui.bg(t) : t.label3}
        label={ty.name}
        chevron={!!path}
        onPress={path ? () => router.push(path) : undefined}
      />
    );
  };

  if (isLoading) {
    return <View style={[styles.loading, { backgroundColor: t.sysBg }]}><ActivityIndicator color={t.blue} /></View>;
  }

  if (isError || !c) {
    return (
      <View style={[styles.loading, { backgroundColor: t.sysBg }]}>
        <Text variant="body" color="label2">Couldn't load this course.</Text>
        <PressableScale onPress={() => refetch()}><Text variant="headline" color="blue">Retry</Text></PressableScale>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: t.sysBg }]}>
      <Poster art={meta?.art ?? 'security'} style={styles.hero}>
        <Text style={styles.heroCode}>{c.code}</Text>
        <PressableScale
          style={[styles.backBtn, { top: insets.top + 8 }]}
          onPress={() => router.back()}
          hitSlop={12}
        >
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="chevron" size={24} color="#000" />
          </View>
        </PressableScale>
        <View style={{ padding: spacing.xl }}>
          <Text variant="caption" style={styles.kicker}>{meta?.vendor ?? 'Course'}</Text>
          <Text variant="title1" color="onColor">{c.name}</Text>
        </View>
      </Poster>

      <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 150 }} showsVerticalScrollIndicator={false}>
        {courseProficiency && (
          <View style={styles.proficiencyRow}>
            <Text variant="footnote" color="label2">Overall proficiency</Text>
            <ProficiencyBadge entry={courseProficiency} />
          </View>
        )}
        {otherTypes.length > 0 && (
          <Section style={{ marginTop: spacing.lg }}>
            {otherTypes.map(renderTypeRow)}
          </Section>
        )}
        {examTypes.length > 0 && (
          <Section footer="Performance-based questions are available on the web app (desktop recommended).">
            {examTypes.map(renderTypeRow)}
          </Section>
        )}
      </ScrollView>

      {/* Floating footer pill with quick actions */}
      <View style={[styles.footWrap, { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }]} pointerEvents="box-none">
        <BlurView
          intensity={40}
          tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
          style={[styles.footbar, shadow.floating]}
        >
          <PressableScale style={[styles.btn, { backgroundColor: t.blue }, continuousCurve]} onPress={startPractice}>
            <Text variant="headline" color="onColor">Start Practice</Text>
          </PressableScale>
          <View style={[styles.divider, { backgroundColor: t.separator }]} />
          <PressableScale hitSlop={12} onPress={() => router.push(`/learn/${product}/study-notes`)}>
            <Icon name="book" size={20} color={t.label} />
          </PressableScale>
          <PressableScale hitSlop={12} onPress={() => router.push(`/learn/${product}/flashcards`)}>
            <Icon name="layers" size={20} color={t.label} />
          </PressableScale>
        </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  hero: { height: 230, paddingTop: 40 },
  proficiencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  heroCode: { position: 'absolute', top: 28, right: 20, fontSize: 96, fontWeight: '800', letterSpacing: -3, color: 'rgba(255,255,255,0.16)' },
  backBtn: {
    position: 'absolute',
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  kicker: { letterSpacing: 1.4, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  sheet: { flex: 1, marginTop: -16, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, backgroundColor: 'transparent' },
  footWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  footbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.pill, overflow: 'hidden' },
  btn: { flex: 1, borderRadius: radius.control, paddingVertical: 14, alignItems: 'center' },
  divider: { width: hairline, height: 28, marginHorizontal: spacing.lg },
});
