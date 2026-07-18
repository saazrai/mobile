import { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import * as Haptics from 'expo-haptics';
import { getData } from '../../../../src/api/client';
import { useTheme, spacing } from '../../../../src/theme/tokens';

const { height: H } = Dimensions.get('window');

interface Block { id: number; type: string; content: string; eyebrow?: string }

/**
 * Study Notes as an Instagram-style vertical Reel (docs/07 §7.3).
 *  swipe up/down → move between concept blocks (snap paging)
 *  double-tap → bookmark (heart burst)
 * Full-bleed immersive; segment bar shows position.
 */
export default function StudyNotesReel() {
  const t = useTheme();
  const router = useRouter();
  const { product } = useLocalSearchParams<{ product: string }>();
  const { data } = useQuery({
    queryKey: ['study-notes', product],
    queryFn: () => getData<{ topic: { name: string }; blocks: Block[] }>(`/learn/${product}/study-notes/intro`),
    staleTime: 15 * 60 * 1000,
  });

  const [index, setIndex] = useState(0);
  const blocks = data?.blocks ?? [];
  const listRef = useRef<FlatList<Block>>(null);

  return (
    <View style={[styles.root, { backgroundColor: t.sysBg }]}>
      <FlatList
        ref={listRef}
        data={blocks}
        keyExtractor={(b) => String(b.id)}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={H}
        decelerationRate="fast"
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / H);
          if (i !== index) { setIndex(i); Haptics.selectionAsync(); }
        }}
        renderItem={({ item }) => <BlockPage block={item} t={t} />}
      />

      {/* Overlays */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.segments}>
          {blocks.map((_, i) => (
            <View key={i} style={[styles.seg, { backgroundColor: i <= index ? t.label : t.fill }]} />
          ))}
        </View>
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable onPress={() => router.back()} hitSlop={12}><Text style={[styles.close, { color: t.label2 }]}>✕</Text></Pressable>
          <Text style={[styles.topic, { color: t.label }]}>{data?.topic.name ?? 'Study notes'}</Text>
          <View style={{ width: 22 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function BlockPage({ block, t }: { block: Block; t: ReturnType<typeof useTheme> }) {
  const heart = useSharedValue(0);
  const [bookmarked, setBookmarked] = useState(false);

  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    runOnJS(setBookmarked)(true);
    runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
    heart.value = withSequence(withSpring(1, { damping: 6 }), withTiming(0, { duration: 400 }));
  });

  const heartStyle = useAnimatedStyle(() => ({ opacity: heart.value, transform: [{ scale: 0.6 + heart.value * 0.8 }] }));

  return (
    <GestureDetector gesture={doubleTap}>
      <View style={[styles.page, { backgroundColor: t.sysBg }]}>
        <View style={styles.pageInner}>
          {block.eyebrow && <Text style={[styles.eyebrow, { color: t.blue }]}>{block.eyebrow.toUpperCase()}</Text>}
          <Markdown style={{
            body: { color: t.label, fontSize: 19, lineHeight: 30, fontWeight: '500' },
            heading1: { color: t.label, fontSize: 28, fontWeight: '800' },
            strong: { color: t.label, fontWeight: '800' },
            bullet_list: { marginTop: spacing.md },
            code_inline: { backgroundColor: t.fill, color: t.blue, fontFamily: 'Courier' },
          }}>
            {block.content}
          </Markdown>
        </View>
        {bookmarked && <Text style={[styles.bookmarkTag, { color: t.label2 }]}>✓ Saved</Text>}
        <Animated.Text style={[styles.bigHeart, heartStyle, { color: t.red }]}>♥</Animated.Text>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { height: H, justifyContent: 'center', paddingHorizontal: spacing.xl },
  pageInner: { paddingBottom: 60 },
  eyebrow: { fontSize: 12, letterSpacing: 2, fontWeight: '800', marginBottom: spacing.md },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  segments: { flexDirection: 'row', gap: 4, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  seg: { flex: 1, height: 3, borderRadius: 2 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  close: { fontSize: 22 },
  topic: { fontWeight: '800' },
  bookmarkTag: { position: 'absolute', bottom: 80, left: spacing.xl, fontWeight: '700' },
  bigHeart: { position: 'absolute', alignSelf: 'center', top: H * 0.36, fontSize: 120 },
});
