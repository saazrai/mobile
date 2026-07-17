import { View, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { useTheme, hairline } from '../theme/tokens';

const MAP: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: 'Study' },
  courses: { icon: 'cards', label: 'Courses' },
  progress: { icon: 'chart', label: 'Progress' },
  profile: { icon: 'person', label: 'Account' },
};

/**
 * iOS translucent tab bar — a real UIKit-style bottom bar: full-width blur
 * material, hairline top separator, SF-style icons, system-blue active tint.
 * (Matches design/uiux-mockup.html.)
 */
export function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();

  return (
    <BlurView
      intensity={40}
      tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      style={[styles.bar, { paddingBottom: insets.bottom + 6, borderTopColor: t.separator }]}
    >
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const meta = MAP[route.name] ?? { icon: 'home' as IconName, label: route.name };
        const onPress = () => {
          Haptics.selectionAsync();
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <Pressable key={route.key} style={styles.tab} onPress={onPress} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
            <Icon name={meta.icon} size={26} color={focused ? t.blue : t.label3} filled={focused} />
            <Text variant="caption" style={{ fontSize: 10, fontWeight: '600', color: focused ? t.blue : t.label3 }}>{meta.label}</Text>
          </Pressable>
        );
      })}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: 8, borderTopWidth: hairline },
  tab: { alignItems: 'center', gap: 3, flex: 1 },
});
