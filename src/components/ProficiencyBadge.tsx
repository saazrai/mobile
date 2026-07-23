import { View, StyleSheet, useColorScheme } from 'react-native';
import { Text } from './Text';
import { spacing, radius, continuousCurve } from '../theme/tokens';
import type { ProficiencyEntry } from '../api/hooks/practice';

/** Small pill showing a learner's proficiency label (Expert/Advanced/.../Foundational)
 * for one scope (course/domain/objective). Colors come straight from the API's
 * `proficiency_color` (LearnerProficiencyService::colorsForLevel) — never recompute
 * them here, see docs/11-home-courses-progress-spec.md §11.3. */
export function ProficiencyBadge({ entry, style }: { entry: ProficiencyEntry; style?: object }) {
  const scheme = useColorScheme();
  const shades = entry.proficiency_color[scheme === 'dark' ? 'dark' : 'light'];
  return (
    <View style={[styles.badge, { backgroundColor: shades.bg, borderColor: shades.border }, continuousCurve, style]}>
      <View style={[styles.dot, { backgroundColor: shades.dot }]} />
      <Text variant="caption" style={{ color: shades.text, fontWeight: '700' }}>{entry.proficiency_label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill, borderWidth: 1, alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
