import { View, Pressable, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Icon, type IconName } from './Icon';
import { useTheme, radius, shadow, hairline } from '../theme/tokens';

const MAP: Record<string, { icon: IconName }> = {
  index: { icon: 'home' },
  courses: { icon: 'cards' },
  progress: { icon: 'chart' },
  profile: { icon: 'person' },
};

const BAR_HEIGHT = 56;

/**
 * Instagram-style floating pill tab bar — icon-only, fully rounded, solid
 * card surface (contrasts against the gray page bg), with a soft capsule
 * highlight behind the active icon.
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const dark = scheme === 'dark';

  return (
    <View style={[styles.wrap, { backgroundColor: t.sysBg, paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
      <View
        style={[
          styles.bar,
          shadow.floating,
          { backgroundColor: t.cell, borderWidth: hairline, borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)' },
        ]}
      >
        {state.routes.map((route, i) => {
          const focused = state.index === i;
          const meta = MAP[route.name] ?? { icon: 'home' as IconName };
          const onPress = () => {
            Haptics.selectionAsync();
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable key={route.key} style={styles.tab} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
              <View style={[styles.iconWrap, focused && { backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)' }]}>
                <Icon name={meta.icon} size={24} color={focused ? t.label : t.label2} filled={focused} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8, paddingHorizontal: 20 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: BAR_HEIGHT,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: {
    width: 48,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
