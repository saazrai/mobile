import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../../src/components/Text';
import { Icon } from '../../../../src/components/Icon';
import { PressableScale } from '../../../../src/components/PressableScale';
import {
  useExamSettings, useExamStart, type ExamSetting, type UserExamAttempt,
} from '../../../../src/api/hooks/exam';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow, type Palette } from '../../../../src/theme/tokens';

/** Screen L — Exams List (docs/08-exam-spec.md §8.7). One card per exam_setting;
 * guidelines are generated only from real policy flags, never invented copy. */
export default function ExamsListScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const { data, isLoading, isError, refetch, isRefetching } = useExamSettings(product);
  const start = useExamStart();

  const onStart = async (setting: ExamSetting) => {
    if (setting.has_in_progress_attempt && setting.in_progress_assessment_id) {
      router.push(`/exam/${setting.in_progress_assessment_id}/runner?product=${product}`);
      return;
    }
    const res = await start.mutateAsync(setting.id);
    router.push(`/exam/${res.assessment_id}/runner?product=${product}`);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={[styles.navBtn, { backgroundColor: t.fill }]}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">Exams</Text>
        <View style={{ width: 44 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={t.blue} /></View>
      ) : isError || !data ? (
        <View style={styles.center}>
          <Text variant="body" color="label2" style={{ textAlign: 'center', paddingHorizontal: spacing.xl }}>
            Couldn't load exams. Is the mock server running? (`npm run mock`)
          </Text>
          <PressableScale
            style={[styles.cta, { backgroundColor: t.blue, marginTop: spacing.xl, paddingHorizontal: spacing.xl }, continuousCurve]}
            onPress={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Retry</Text>}
          </PressableScale>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
          {data.exam_settings.length === 0 && (
            <View style={[styles.center, { paddingTop: spacing.xxl }]}>
              <Text variant="body" color="label2">No exam simulations are configured for this course yet.</Text>
            </View>
          )}
          {data.exam_settings.map((setting) => (
            <ExamCard key={setting.id} setting={setting} t={t} busy={start.isPending} onStart={() => onStart(setting)} />
          ))}

          {!!data.user_exams.length && (
            <>
              <Text variant="footnote" color="label2" style={styles.sectionHeader}>PAST ATTEMPTS</Text>
              <View style={[styles.attemptsCard, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
                {data.user_exams.map((a, i) => (
                  <AttemptRow key={a.id} attempt={a} t={t} isLast={i === data.user_exams.length - 1} onPress={() => router.push(`/exam/${a.id}/results`)} />
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ExamCard({ setting, t, busy, onStart }: { setting: ExamSetting; t: Palette; busy: boolean; onStart: () => void }) {
  const guidelines = buildGuidelines(setting);
  const ctaLabel = setting.has_in_progress_attempt ? 'Resume Exam' : 'Start Exam';
  const ctaColor = setting.has_in_progress_attempt ? t.orange : t.blue;
  const disabled = !setting.can_take_exam || busy;

  return (
    <View style={[styles.card, { backgroundColor: t.cell }, continuousCurve, shadow.card]}>
      <View style={styles.cardHead}>
        <Text variant="headline">{setting.exam_type.name}</Text>
        <View style={[styles.badge, { backgroundColor: t.fill }, continuousCurve]}>
          <Text variant="caption" color="label2" style={{ fontWeight: '700' }}>
            {setting.has_unlimited_attempts ? '∞ attempts' : `${setting.attempt_count} / ${setting.max_attempts} attempts`}
          </Text>
        </View>
      </View>
      <Text variant="footnote" color="label2" style={{ marginTop: spacing.xs, lineHeight: 18 }}>{setting.description}</Text>

      <View style={styles.stats}>
        <Stat label="Questions" value={String(setting.question_count)} t={t} />
        <Stat label="Duration" value={setting.duration_for_humans} t={t} />
        <Stat label="Passing" value={`${setting.passing_percentage}%`} t={t} />
      </View>

      <View style={{ marginTop: spacing.md, gap: 6 }}>
        {guidelines.map((g, i) => (
          <View key={i} style={styles.guideRow}>
            <Icon name="check" size={13} color={t.label3} />
            <Text variant="footnote" color="label2" style={{ flex: 1 }}>{g}</Text>
          </View>
        ))}
      </View>

      {!setting.can_take_exam && !setting.has_in_progress_attempt && (
        <Text variant="footnote" color="red" style={{ marginTop: spacing.sm }}>No attempts remaining.</Text>
      )}

      <PressableScale
        style={[styles.cta, { backgroundColor: disabled ? t.fill : ctaColor, marginTop: spacing.lg }, continuousCurve]}
        disabled={disabled}
        onPress={onStart}
      >
        <Text variant="headline" color={disabled ? 'label3' : 'onColor'}>{ctaLabel}</Text>
      </PressableScale>
    </View>
  );
}

function Stat({ label, value, t }: { label: string; value: string; t: Palette }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="headline">{value}</Text>
      <Text variant="caption" color="label2">{label}</Text>
    </View>
  );
}

function AttemptRow({ attempt, t, isLast, onPress }: { attempt: UserExamAttempt; t: Palette; isLast: boolean; onPress: () => void }) {
  return (
    <PressableScale onPress={onPress} disabled={attempt.status !== 'completed'} scaleTo={0.99}>
      <View style={styles.attemptRow}>
        <View style={{ flex: 1 }}>
          <Text variant="body">{attempt.exam_type_name}</Text>
          <Text variant="footnote" color="label2">{new Date(attempt.created_at).toLocaleDateString()}</Text>
        </View>
        {attempt.status === 'completed' ? (
          <Text variant="headline" style={{ color: (attempt.score ?? 0) >= 70 ? t.green : t.red }}>{attempt.score}%</Text>
        ) : (
          <Text variant="footnote" style={{ color: t.orange, fontWeight: '700' }}>{attempt.status === 'paused' ? 'PAUSED' : 'IN PROGRESS'}</Text>
        )}
        {attempt.status === 'completed' && <Icon name="chevron" size={13} color={t.label3} />}
      </View>
      {!isLast && <View style={[styles.sep, { backgroundColor: t.separator }]} />}
    </PressableScale>
  );
}

/** Guidelines are derived only from the real policy flags — no invented copy
 * about randomization/show-correct-answers, which the backend never populates
 * (docs/08-exam-spec.md §8.9). */
function buildGuidelines(setting: ExamSetting): string[] {
  const { policy } = setting;
  const lines = [
    policy.allow_skip ? 'Skipping unanswered questions is allowed' : 'All questions must be answered to proceed',
    policy.allow_backtrack ? 'You can navigate back and change earlier answers' : 'Questions are answered sequentially — no going back',
  ];
  if (policy.allow_mark_for_review) lines.push('Flag questions to revisit before you submit');
  if (policy.allow_review_before_submit) lines.push('You’ll get a chance to review all answers before final submit');
  lines.push('The timer counts against the real deadline even if you close the app');
  return lines;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { marginTop: spacing.xl, marginBottom: spacing.sm, letterSpacing: 0.4 },
  card: { borderRadius: radius.card, padding: spacing.lg, marginBottom: spacing.lg },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  stats: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.lg },
  guideRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cta: { paddingVertical: 15, alignItems: 'center' },
  attemptsCard: { borderRadius: radius.cell, overflow: 'hidden' },
  attemptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 44 },
  sep: { height: hairline, marginLeft: spacing.lg },
});
