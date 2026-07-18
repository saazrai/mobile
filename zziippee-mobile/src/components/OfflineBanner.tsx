import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { useTheme, spacing, hairline } from '../theme/tokens';

/** Offline banner — shows when network is unavailable. Appears at top of screen with subtle dimming. */
export function OfflineBanner() {
  const t = useTheme();

  return (
    <View style={[styles.banner, { backgroundColor: `${t.orange}20`, borderColor: t.orange }]}>
      <Text variant="caption" color={t.orange as any} style={{ fontWeight: '600' }}>
        Offline
      </Text>
      <Text variant="footnote" color="label2" style={{ marginLeft: spacing.xs, flex: 1 }}>
        You're offline. Changes will sync when connection is restored.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: hairline,
  },
});
