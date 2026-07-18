import { useCallback, useState, type ReactNode } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolate, runOnJS, Extrapolation } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { getData } from '../../../src/api/client';
import { Text } from '../../../src/components/Text';
import { Icon } from '../../../src/components/Icon';
import { useSwipeCard, type SwipeGradeBody } from '../../../src/api/hooks/flashcards';
import { useTheme, spacing, radius, hairline, type Palette } from '../../../src/theme/tokens';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_X = W * 0.28;
const SWIPE_Y = H * 0.18;

interface Flashcard { id: number; front: string; back: string; deck?: string | null }

/** Instagram/Tinder-style swipe-to-grade deck (docs/07 §7.3), iOS-polished. */
export default function FlashcardsScreen() {
  const t = useTheme();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const { data: cards } = useQuery({ queryKey: ['flashcards', product], queryFn: () => getData<Flashcard[]>(`/learn/${product}/flashcards`), staleTime: 600_000 });

  // Fire-and-forget swipe tracking — grade is sent but never blocks advancement.
  const swipe = useSwipeCard(product);

  const [index, setIndex] = useState(0);
  const total = cards?.length ?? 0;
  const card = cards?.[index];
  const advance = useCallback((grade?: 'know' | 'again' | 'skip') => {
    if (card && grade) swipe.mutate({ card_id: card.id, grade } as SwipeGradeBody);
    setIndex((i) => i + 1);
  }, [card, swipe]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cards) return <Center t={t}><Text color="label2">Loading deck…</Text></Center>;
  if (!card) return (
    <Center t={t}>
      <Text variant="title2">Deck complete</Text>
      <Pressable style={[styles.doneBtn, { backgroundColor: t.blue }]} onPress={() => router.back()}><Text variant="headline" color="onColor">Done</Text></Pressable>
    </Center>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: t.sysBg }]}>
      <View style={styles.segs}>
        {cards.map((_, i) => <View key={i} style={[styles.seg, { backgroundColor: i <= index ? t.blue : t.fill }]} />)}
      </View>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Icon name="x" size={20} color={t.label2} /></Pressable>
        <Text variant="headline">{card.deck ?? 'Flashcards'}</Text>
        <Text variant="subhead" color="label2">{index + 1}/{total}</Text>
      </View>

      {cards[index + 1] && <View style={[styles.card, styles.peek, { backgroundColor: t.cell, borderColor: t.separator }]} />}
      <SwipeCard key={card.id} card={card} t={t} onGrade={advance} />

      <View style={styles.actions}>
        <Pressable style={[styles.fab, { backgroundColor: t.cell, borderColor: t.separator }]} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); advance('again'); }}><Icon name="x" size={24} color={t.red} /></Pressable>
        <Pressable style={[styles.fab, { backgroundColor: t.cell, borderColor: t.separator }]} onPress={() => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); advance('know'); }}><Icon name="check" size={24} color={t.green} /></Pressable>
      </View>
    </SafeAreaView>
  );
}

function SwipeCard({ card, t, onGrade }: { card: Flashcard; t: Palette; onGrade: () => void }) {
  const x = useSharedValue(0); const y = useSharedValue(0); const flip = useSharedValue(0);

  const commit = (kind: 'know' | 'again' | 'skip') => {
    if (kind === 'know') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'again') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onGrade();
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => { x.value = e.translationX; y.value = Math.min(0, e.translationY); })
    .onEnd((e) => {
      if (e.translationX > SWIPE_X) { x.value = withSpring(W * 1.5); runOnJS(commit)('know'); }
      else if (e.translationX < -SWIPE_X) { x.value = withSpring(-W * 1.5); runOnJS(commit)('again'); }
      else if (e.translationY < -SWIPE_Y) { y.value = withSpring(-H); runOnJS(commit)('skip'); }
      else { x.value = withSpring(0); y.value = withSpring(0); }
    });
  const tap = Gesture.Tap().onEnd(() => { flip.value = withTiming(flip.value === 0 ? 1 : 0, { duration: 350 }); runOnJS(Haptics.selectionAsync)(); });
  const gesture = Gesture.Exclusive(pan, tap);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { rotateZ: `${interpolate(x.value, [-W / 2, W / 2], [-8, 8], Extrapolation.CLAMP)}deg` }] }));
  const front = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.value, [0, 1], [0, 180])}deg` }], opacity: flip.value < 0.5 ? 1 : 0 }));
  const back = useAnimatedStyle(() => ({ transform: [{ perspective: 1000 }, { rotateY: `${interpolate(flip.value, [0, 1], [180, 360])}deg` }], opacity: flip.value >= 0.5 ? 1 : 0 }));
  const knowStamp = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [0, SWIPE_X], [0, 1], Extrapolation.CLAMP) }));
  const againStamp = useAnimatedStyle(() => ({ opacity: interpolate(x.value, [-SWIPE_X, 0], [1, 0], Extrapolation.CLAMP) }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardStyle, { backgroundColor: t.cell, borderColor: t.separator }]}>
        <Animated.View style={[styles.stamp, knowStamp, { borderColor: t.green }]}><Text style={{ color: t.green, fontWeight: '800', fontSize: 18 }}>GOT IT</Text></Animated.View>
        <Animated.View style={[styles.stamp, styles.stampR, againStamp, { borderColor: t.red }]}><Text style={{ color: t.red, fontWeight: '800', fontSize: 18 }}>AGAIN</Text></Animated.View>
        <Animated.View style={[styles.face, front]}>
          <Text variant="caption" color="label3" style={styles.kick}>TAP TO FLIP</Text>
          <Text variant="title3" style={styles.q}>{card.front}</Text>
        </Animated.View>
        <Animated.View style={[styles.face, back]}>
          <Text variant="caption" color="blue" style={styles.kick}>ANSWER</Text>
          <Text variant="body" style={styles.q}>{card.back}</Text>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const Center = ({ t, children }: { t: Palette; children: ReactNode }) => (
  <SafeAreaView style={[styles.center, { backgroundColor: t.sysBg }]}>{children}</SafeAreaView>
);

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  segs: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  card: { position: 'absolute', top: 96, alignSelf: 'center', width: W - spacing.xl * 2, height: H * 0.54, borderRadius: 24, borderWidth: hairline, padding: spacing.xxl, justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  peek: { top: 108, transform: [{ scale: 0.94 }], opacity: 0.55 },
  face: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl, backfaceVisibility: 'hidden' },
  kick: { letterSpacing: 2, fontWeight: '700', marginBottom: spacing.md },
  q: { textAlign: 'center' },
  stamp: { position: 'absolute', top: 22, left: 22, borderWidth: 3, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 2, transform: [{ rotate: '-13deg' }] },
  stampR: { left: undefined, right: 22, transform: [{ rotate: '13deg' }] },
  actions: { position: 'absolute', bottom: 44, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  fab: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: hairline, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  doneBtn: { borderRadius: radius.control, paddingHorizontal: 32, paddingVertical: 13 },
});
