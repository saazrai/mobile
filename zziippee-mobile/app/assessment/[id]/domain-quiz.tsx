import { useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { PressableScale } from '../../../src/components/PressableScale';
import { OptionContent } from '../../../src/components/OptionContent';
import { useStartDomain, useDomainAnswer, useSubmitDomain } from '../../../src/api/hooks/practice';
import { useTheme, spacing, radius, hairline, continuousCurve, shadow } from '../../../src/theme/tokens';

/** Domain test runner — linear blind (no reveal mid-quiz). Final score shown after submit. */
export default function DomainQuizScreen() {
  const t = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const startDomain = useStartDomain();
  const domainAnswer = useDomainAnswer(id);
  const submitDomain = useSubmitDomain(id);

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Map<number, string[]>>(new Map());

  // Start the domain test when component mounts
  if (questions.length === 0 && !startDomain.isPending) {
    startDomain.mutate('security-risk-governance', {
      onSuccess: (data) => {
        setQuestions(data.questions);
      },
      onError: () => Alert.alert('Failed to start domain test'),
    });
  }

  if (questions.length === 0) return <View style={styles.center}><ActivityIndicator color={t.blue} /></View>;

  const question = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasAnsweredCurrent = answers.has(question.id);

  const handleSelectOption = (option: string) => {
    setSelectedOptions((prev) => prev.includes(option) ? prev.filter(o => o !== option) : [...prev, option]);
  };

  const handleSubmitAnswer = () => {
    domainAnswer.mutate({ question_id: question.id, selected_options: selectedOptions }, {
      onSuccess: (data) => {
        setAnswers(prev => new Map(prev).set(question.id, selectedOptions));
        if (!isLastQuestion) {
          setCurrentIndex(currentIndex + 1);
          setSelectedOptions([]);
        } else {
          // All questions answered — show submit confirmation
          Alert.alert('All questions answered', 'Submit your answers to see your score?', [
            { text: 'Review', style: 'cancel' },
            { text: 'Submit', onPress: () => submitDomain.mutate() }
          ]);
        }
      },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.nav}>
        <PressableScale onPress={() => router.back()} hitSlop={12} style={styles.navBtn}>
          <Icon name="x" size={20} color={t.blue} />
        </PressableScale>
        <Text variant="headline">Domain Test</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 140 }}>
        <Animated.View entering={FadeInDown.duration(500).springify().damping(18)} style={[styles.questionCard, { backgroundColor: t.cell }, continuousCurve]}>
          <Text variant="headline" style={{ marginBottom: spacing.md }}>Question {currentIndex + 1} of {questions.length}</Text>
          <OptionContent>{question.content}</OptionContent>

          <View style={styles.optionsList}>
            {question.options.map((option: string, i: number) => (
              <PressableScale key={i} onPress={() => handleSelectOption(option)} style={[styles.optionRow, selectedOptions.includes(option) && { backgroundColor: `${t.blue}15` }]}>
                <View style={[styles.radio, { borderColor: selectedOptions.includes(option) ? t.blue : t.label3 }]} />
                <Text variant="body" style={{ flex: 1 }}>{option}</Text>
              </PressableScale>
            ))}
          </View>

          <View style={styles.footer}>
            <PressableScale
              style={[styles.submitBtn, { backgroundColor: t.blue }, continuousCurve]}
              onPress={handleSubmitAnswer}
              disabled={!hasAnsweredCurrent || domainAnswer.isPending || submitDomain.isPending}
            >
              {isLastQuestion ? (
                submitDomain.isPending ? <ActivityIndicator color="#fff" /> : (
                  hasAnsweredCurrent ? <Text variant="headline" color="onColor">Submit All</Text> : <Text variant="headline" color="label2">Answer Required</Text>
                )
              ) : (
                domainAnswer.isPending ? <ActivityIndicator color="#fff" /> : <Text variant="headline" color="onColor">Next</Text>
              )}
            </PressableScale>
          </View>
        </Animated.View>
      </ScrollView>

      {submitDomain.isSuccess && (
        <View style={[styles.resultCard, { backgroundColor: t.cell }, continuousCurve]}>
          <Text variant="title1" style={{ textAlign: 'center' }}>Test Complete!</Text>
          <Text variant="headline" style={{ textAlign: 'center', marginTop: spacing.md }}>
            Score: {submitDomain.data?.correct_answers ?? 0} / {submitDomain.data?.total_questions ?? questions.length}
          </Text>
          <PressableScale style={[styles.doneBtn, { backgroundColor: t.blue, marginTop: spacing.xl }, continuousCurve]} onPress={() => router.replace('/(tabs)')}>
            <Text variant="headline" color="onColor">Done</Text>
          </PressableScale>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  navBtn: { padding: spacing.xs },
  questionCard: { borderRadius: radius.cell, padding: spacing.lg, overflow: 'hidden' },
  optionsList: { marginTop: spacing.lg, gap: spacing.sm },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.control },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.8, marginRight: spacing.sm },
  footer: { marginTop: spacing.xl },
  submitBtn: { borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
  resultCard: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.xl, borderTopWidth: hairline },
  doneBtn: { borderRadius: radius.control, paddingVertical: 15, alignItems: 'center' },
});
